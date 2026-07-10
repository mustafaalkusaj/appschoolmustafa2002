import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError } from "@/lib/route-utils";
import { routeUserHasPermission } from "@/lib/route-permissions";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id.trim() : "";
  const fromClass = typeof body?.from_class === "string" ? body.from_class.trim() : "";
  const fromSection = typeof body?.from_section === "string" ? body.from_section.trim() : "";
  const toClass = typeof body?.to_class === "string" ? body.to_class.trim() : "";
  const toSection = typeof body?.to_section === "string" ? body.to_section.trim() : "";

  if (!schoolId || !fromClass || !toClass) return jsonError("البيانات ناقصة.", 400);
  if (fromClass === toClass && fromSection === toSection)
    return jsonError("المصدر والوجهة متطابقان.", 400);

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    { allowedRoles: ["super_admin", "admin", "employee"], roleDeniedMessage: "غير مصرح." },
    req.headers.get("authorization"),
  );
  if (!context.ok)
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق.",
      "status" in context ? context.status : 500,
    );

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const rateLimited = await enforceRateLimit(req, {
    namespace: "schedule-clone",
    windowMs: 60_000,
    maxHits: 10,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const canManage = await routeUserHasPermission(actorSupabase, actorUserId, "manage_schedule");
  if (!canManage) return jsonError("ليس لديك صلاحية.", 403);

  // Fetch source schedule
  let sourceQuery = actorSupabase
    .from("class_schedules")
    .select("*")
    .eq("school_id", targetSchoolId)
    .eq("class_name", fromClass);
  if (fromSection) sourceQuery = sourceQuery.eq("section", fromSection);
  const { data: source, error: sourceError } = await sourceQuery;
  if (sourceError) return jsonError(sourceError.message, 500);
  if (!source || source.length === 0) return jsonError("لا يوجد جدول للنسخ.", 404);

  // Delete existing target schedule
  let deleteQuery = actorSupabase
    .from("class_schedules")
    .delete()
    .eq("school_id", targetSchoolId)
    .eq("class_name", toClass);
  if (toSection) deleteQuery = deleteQuery.eq("section", toSection);
  const { error: deleteError } = await deleteQuery;
  if (deleteError) return jsonError(deleteError.message, 500);

  // Insert cloned entries (unlocked)
  const cloned = source.map((e: Record<string, unknown>) => ({
    school_id: targetSchoolId,
    class_name: toClass,
    section: toSection || null,
    day_of_week: e.day_of_week,
    period_number: e.period_number,
    time_slot_id: e.time_slot_id,
    subject: e.subject,
    teacher_name: e.teacher_name,
    is_locked: false,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertError } = await actorSupabase.from("class_schedules").insert(cloned as any);
  if (insertError) return jsonError(insertError.message, 500);

  return NextResponse.json({ ok: true, count: cloned.length });
}
