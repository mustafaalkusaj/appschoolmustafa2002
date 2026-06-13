import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError } from "@/lib/route-utils";
import { routeUserHasPermission } from "@/lib/route-permissions";

const TIME_REGEX = /^\d{2}:\d{2}$/;
const VALID_SLOT_TYPES = new Set(["period", "break"]);

const DEFAULT_SLOTS = [
  { slot_order: 1, slot_type: "period", name_ar: "الحصة الأولى", name_en: "Period 1", start_time: "07:30", end_time: "08:15", duration_minutes: 45 },
  { slot_order: 2, slot_type: "period", name_ar: "الحصة الثانية", name_en: "Period 2", start_time: "08:15", end_time: "09:00", duration_minutes: 45 },
  { slot_order: 3, slot_type: "period", name_ar: "الحصة الثالثة", name_en: "Period 3", start_time: "09:00", end_time: "09:45", duration_minutes: 45 },
  { slot_order: 4, slot_type: "break", name_ar: "الاستراحة الأولى", name_en: "Break 1", start_time: "09:45", end_time: "10:15", duration_minutes: 30 },
  { slot_order: 5, slot_type: "period", name_ar: "الحصة الرابعة", name_en: "Period 4", start_time: "10:15", end_time: "11:00", duration_minutes: 45 },
  { slot_order: 6, slot_type: "period", name_ar: "الحصة الخامسة", name_en: "Period 5", start_time: "11:00", end_time: "11:45", duration_minutes: 45 },
  { slot_order: 7, slot_type: "break", name_ar: "الاستراحة الثانية", name_en: "Break 2", start_time: "11:45", end_time: "12:00", duration_minutes: 15 },
  { slot_order: 8, slot_type: "period", name_ar: "الحصة السادسة", name_en: "Period 6", start_time: "12:00", end_time: "12:45", duration_minutes: 45 },
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
    namespace: "schedule-time-slots-read",
    windowMs: 60_000,
    maxHits: 120,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const canView = await routeUserHasPermission(actorSupabase, actorUserId, "view_students");
  if (!canView) return jsonError("ليس لديك صلاحية.", 403);

  const { data, error } = await actorSupabase
    .from("schedule_time_slots")
    .select("*")
    .eq("school_id", targetSchoolId)
    .order("slot_order", { ascending: true });

  if (error) return jsonError(error.message || "تعذر تحميل الحصص.", 500);

  // Auto-seed defaults if no slots exist
  if (!data || data.length === 0) {
    const toInsert = DEFAULT_SLOTS.map((s) => ({ ...s, school_id: targetSchoolId, is_active: true }));
    const { data: inserted, error: insertError } = await actorSupabase
      .from("schedule_time_slots")
      .insert(toInsert)
      .select("*");
    if (insertError) return jsonError(insertError.message || "تعذر إنشاء الحصص الافتراضية.", 500);
    return NextResponse.json({ ok: true, slots: inserted ?? [] });
  }

  return NextResponse.json({ ok: true, slots: data });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id.trim() : "";
  const slotType = typeof body?.slot_type === "string" ? body.slot_type.trim() : "";
  const nameAr = typeof body?.name_ar === "string" ? body.name_ar.trim() : "";
  const nameEn = typeof body?.name_en === "string" ? body.name_en.trim() : null;
  const startTime = typeof body?.start_time === "string" ? body.start_time.trim() : "";
  const endTime = typeof body?.end_time === "string" ? body.end_time.trim() : "";
  const durationMinutes = typeof body?.duration_minutes === "number" ? body.duration_minutes : 0;

  if (!schoolId) return jsonError("المدرسة مطلوبة.", 400);
  if (!VALID_SLOT_TYPES.has(slotType)) return jsonError("نوع الحصة غير صالح.", 400);
  if (!nameAr) return jsonError("اسم الحصة مطلوب.", 400);
  if (!TIME_REGEX.test(startTime) || !TIME_REGEX.test(endTime)) return jsonError("صيغة الوقت غير صالحة (HH:MM).", 400);

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
    namespace: "schedule-time-slots-write",
    windowMs: 60_000,
    maxHits: 30,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const canManage = await routeUserHasPermission(actorSupabase, actorUserId, "manage_schedule");
  if (!canManage) return jsonError("ليس لديك صلاحية إدارة الجدول.", 403);

  // Get max slot_order
  const { data: existing } = await actorSupabase
    .from("schedule_time_slots")
    .select("slot_order")
    .eq("school_id", targetSchoolId)
    .order("slot_order", { ascending: false })
    .limit(1);

  const maxOrder = existing && existing.length > 0 ? (existing[0].slot_order as number) : 0;

  const { data, error } = await actorSupabase
    .from("schedule_time_slots")
    .insert({
      school_id: targetSchoolId,
      slot_order: maxOrder + 1,
      slot_type: slotType,
      name_ar: nameAr,
      name_en: nameEn || null,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: durationMinutes,
      is_active: true,
    })
    .select("*")
    .single();

  if (error) return jsonError(error.message || "تعذر إضافة الحصة.", 500);

  return NextResponse.json({ ok: true, slot: data });
}

export async function PUT(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action");

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id.trim() : "";

  if (!schoolId) return jsonError("المدرسة مطلوبة.", 400);

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
    namespace: "schedule-time-slots-write",
    windowMs: 60_000,
    maxHits: 30,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const canManage = await routeUserHasPermission(actorSupabase, actorUserId, "manage_schedule");
  if (!canManage) return jsonError("ليس لديك صلاحية إدارة الجدول.", 403);

  // Reorder action
  if (action === "reorder") {
    const order = Array.isArray(body?.order) ? (body.order as string[]) : [];
    if (order.length === 0) return jsonError("قائمة الترتيب مطلوبة.", 400);

    // Two-pass reorder to avoid unique constraint violations:
    // 1) Set all slot_order to negative temp values
    const tempUpdates = order.map((id, idx) =>
      actorSupabase
        .from("schedule_time_slots")
        .update({ slot_order: -(idx + 1) })
        .eq("id", id)
        .eq("school_id", targetSchoolId),
    );
    const tempResults = await Promise.all(tempUpdates);
    const tempFailed = tempResults.find((r) => r.error);
    if (tempFailed?.error) return jsonError(tempFailed.error.message || "تعذر إعادة الترتيب.", 500);

    // 2) Set final positive values
    const finalUpdates = order.map((id, idx) =>
      actorSupabase
        .from("schedule_time_slots")
        .update({ slot_order: idx + 1 })
        .eq("id", id)
        .eq("school_id", targetSchoolId),
    );
    const finalResults = await Promise.all(finalUpdates);
    const finalFailed = finalResults.find((r) => r.error);
    if (finalFailed?.error) return jsonError(finalFailed.error.message || "تعذر إعادة الترتيب.", 500);

    return NextResponse.json({ ok: true });
  }

  // Batch update
  const updates = Array.isArray(body?.updates) ? (body.updates as unknown[]) : [];
  if (updates.length === 0) return jsonError("لا توجد تحديثات.", 400);

  for (const u of updates) {
    if (!u || typeof u !== "object") continue;
    const update = u as Record<string, unknown>;
    const id = typeof update.id === "string" ? update.id : "";
    if (!id) continue;

    const fields: Record<string, unknown> = {};
    if (typeof update.name_ar === "string") fields.name_ar = update.name_ar.trim();
    if (typeof update.name_en === "string") fields.name_en = update.name_en.trim() || null;
    if (typeof update.start_time === "string" && TIME_REGEX.test(update.start_time)) fields.start_time = update.start_time;
    if (typeof update.end_time === "string" && TIME_REGEX.test(update.end_time)) fields.end_time = update.end_time;
    if (typeof update.duration_minutes === "number") fields.duration_minutes = update.duration_minutes;
    if (typeof update.is_active === "boolean") fields.is_active = update.is_active;

    if (Object.keys(fields).length === 0) continue;

    const { error } = await actorSupabase
      .from("schedule_time_slots")
      .update(fields)
      .eq("id", id)
      .eq("school_id", targetSchoolId);

    if (error) return jsonError(error.message || "تعذر تحديث الحصة.", 500);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const schoolId = req.nextUrl.searchParams.get("schoolId");

  if (!id) return jsonError("معرّف الحصة مطلوب.", 400);

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
    namespace: "schedule-time-slots-write",
    windowMs: 60_000,
    maxHits: 30,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const canManage = await routeUserHasPermission(actorSupabase, actorUserId, "manage_schedule");
  if (!canManage) return jsonError("ليس لديك صلاحية إدارة الجدول.", 403);

  const { error } = await actorSupabase
    .from("schedule_time_slots")
    .delete()
    .eq("id", id)
    .eq("school_id", targetSchoolId);

  if (error) return jsonError(error.message || "تعذر حذف الحصة.", 500);

  return NextResponse.json({ ok: true });
}
