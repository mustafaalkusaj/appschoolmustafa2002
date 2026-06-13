import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError } from "@/lib/route-utils";
import { routeUserHasPermission } from "@/lib/route-permissions";

const DEFAULT_WORKING_DAYS = [
  { day_key: "saturday", name_ar: "السبت", name_en: "Saturday", day_order: 1, is_active: true },
  { day_key: "sunday", name_ar: "الأحد", name_en: "Sunday", day_order: 2, is_active: true },
  { day_key: "monday", name_ar: "الاثنين", name_en: "Monday", day_order: 3, is_active: true },
  { day_key: "tuesday", name_ar: "الثلاثاء", name_en: "Tuesday", day_order: 4, is_active: true },
  { day_key: "wednesday", name_ar: "الأربعاء", name_en: "Wednesday", day_order: 5, is_active: true },
  { day_key: "thursday", name_ar: "الخميس", name_en: "Thursday", day_order: 6, is_active: true },
];

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    { allowedRoles: ["super_admin", "admin", "employee"], roleDeniedMessage: "غير مصرح." },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const rateLimited = await enforceRateLimit(req, {
    namespace: "schedule-working-days-read",
    windowMs: 60_000,
    maxHits: 120,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const canView = await routeUserHasPermission(actorSupabase, actorUserId, "view_students");
  if (!canView) return jsonError("ليس لديك صلاحية.", 403);

  const { data, error } = await actorSupabase
    .from("schedule_working_days")
    .select("*")
    .eq("school_id", targetSchoolId)
    .order("day_order", { ascending: true });

  if (error) return jsonError(error.message || "تعذر تحميل أيام الدوام.", 500);

  // Auto-seed defaults if no days exist
  if (!data || data.length === 0) {
    const toInsert = DEFAULT_WORKING_DAYS.map((d) => ({ ...d, school_id: targetSchoolId }));
    const { data: inserted, error: insertError } = await actorSupabase
      .from("schedule_working_days")
      .insert(toInsert)
      .select("*");
    if (insertError) return jsonError(insertError.message || "تعذر إنشاء أيام الدوام الافتراضية.", 500);
    return NextResponse.json({ ok: true, days: inserted ?? [] });
  }

  return NextResponse.json({ ok: true, days: data });
}

export async function PUT(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id.trim() : "";
  const days = Array.isArray(body?.days) ? (body.days as unknown[]) : [];

  if (!schoolId) return jsonError("المدرسة مطلوبة.", 400);
  if (days.length === 0) return jsonError("أيام الدوام مطلوبة.", 400);

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    { allowedRoles: ["super_admin", "admin", "employee"], roleDeniedMessage: "غير مصرح." },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const rateLimited = await enforceRateLimit(req, {
    namespace: "schedule-working-days-write",
    windowMs: 60_000,
    maxHits: 30,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const canManage = await routeUserHasPermission(actorSupabase, actorUserId, "manage_schedule");
  if (!canManage) return jsonError("ليس لديك صلاحية إدارة الجدول.", 403);

  const DAY_NAMES: Record<string, { ar: string; en: string }> = {
    saturday:  { ar: "السبت",    en: "Saturday" },
    sunday:    { ar: "الأحد",    en: "Sunday" },
    monday:    { ar: "الاثنين",  en: "Monday" },
    tuesday:   { ar: "الثلاثاء", en: "Tuesday" },
    wednesday: { ar: "الأربعاء", en: "Wednesday" },
    thursday:  { ar: "الخميس",   en: "Thursday" },
    friday:    { ar: "الجمعة",   en: "Friday" },
  };

  const sanitized = (days as unknown[])
    .filter((d): d is Record<string, unknown> => d !== null && typeof d === "object")
    .map((d) => {
      const dayKey = typeof d.day_key === "string" ? d.day_key : "";
      const names = DAY_NAMES[dayKey] ?? { ar: dayKey, en: dayKey };
      return {
        school_id: targetSchoolId,
        day_key: dayKey,
        name_ar: typeof d.name_ar === "string" && d.name_ar.trim() ? d.name_ar.trim() : names.ar,
        name_en: typeof d.name_en === "string" && d.name_en.trim() ? d.name_en.trim() : names.en,
        is_active: typeof d.is_active === "boolean" ? d.is_active : true,
        day_order: typeof d.day_order === "number" ? d.day_order : 0,
      };
    })
    .filter((d) => d.day_key.length > 0);

  // Upsert each day by school_id + day_key
  for (const day of sanitized) {
    const { error } = await actorSupabase
      .from("schedule_working_days")
      .upsert(day, { onConflict: "school_id,day_key" });
    if (error) return jsonError(error.message || "تعذر تحديث أيام الدوام.", 500);
  }

  return NextResponse.json({ ok: true });
}
