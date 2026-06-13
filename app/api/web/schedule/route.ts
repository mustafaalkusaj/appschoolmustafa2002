import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError } from "@/lib/route-utils";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { resolveBranchScope } from "@/lib/branch-scope";

const VALID_DAYS = new Set(["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday"]);
const MAX_PERIODS = 10;

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const className = req.nextUrl.searchParams.get("className")?.trim() || "";
  const section = req.nextUrl.searchParams.get("section")?.trim() || "";
  const teacherName = req.nextUrl.searchParams.get("teacherName")?.trim() || "";
  const mode = req.nextUrl.searchParams.get("mode")?.trim() || "";
  const day = req.nextUrl.searchParams.get("day")?.trim() || "";

  // Only require className when NOT in teacher or overview mode
  if (!teacherName && mode !== "overview" && !className) return jsonError("الصف مطلوب.", 400);

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

  // Validate branch scope — reject requests from actors trying to access branches they don't belong to.
  // class_schedules has no branch_id column so we cannot filter rows by branch, but we still enforce
  // that branch-scoped actors can only request their own branch.
  const requestedBranchId = req.nextUrl.searchParams.get("branchId") ?? req.nextUrl.searchParams.get("branch_id");
  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace: "schedule-read",
    windowMs: 60_000,
    maxHits: 120,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const canView = await routeUserHasPermission(actorSupabase, actorUserId, "view_students");
  if (!canView) return jsonError("ليس لديك صلاحية.", 403);

  // Teacher mode: return all entries for this teacher across all classes
  if (teacherName) {
    const { data, error } = await actorSupabase
      .from("class_schedules")
      .select("id, day_of_week, period_number, time_slot_id, is_locked, subject, teacher_name, class_name, section")
      .eq("school_id", targetSchoolId)
      .ilike("teacher_name", teacherName);
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ ok: true, schedule: data ?? [], mode: "teacher" });
  }

  // Overview mode: return all entries for a given day across all classes
  if (mode === "overview" && day) {
    const { data, error } = await actorSupabase
      .from("class_schedules")
      .select("id, day_of_week, period_number, time_slot_id, is_locked, subject, teacher_name, class_name, section")
      .eq("school_id", targetSchoolId)
      .eq("day_of_week", day);
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ ok: true, schedule: data ?? [], mode: "overview" });
  }

  // Class mode: return entries for a specific class/section
  let query = actorSupabase
    .from("class_schedules")
    .select("id, day_of_week, period_number, time_slot_id, is_locked, subject, teacher_name, class_name, section")
    .eq("school_id", targetSchoolId)
    .eq("class_name", className);

  if (section) query = query.eq("section", section);

  const { data, error } = await query;
  if (error) return jsonError(error.message || "تعذر تحميل الجدول.", 500);

  return NextResponse.json({ ok: true, schedule: data ?? [] });
}

export async function PUT(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id.trim() : "";
  const className = typeof body?.class_name === "string" ? body.class_name.trim() : "";
  const section = typeof body?.section === "string" ? body.section.trim() : "";
  const entries = Array.isArray(body?.entries) ? body.entries : [];

  if (!schoolId || !className) return jsonError("المدرسة والصف مطلوبان.", 400);

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
    namespace: "schedule-write",
    windowMs: 60_000,
    maxHits: 30,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const canManage = await routeUserHasPermission(actorSupabase, actorUserId, "manage_schedule");
  if (!canManage) return jsonError("ليس لديك صلاحية تعديل الجدول.", 403);

  const sanitized = (entries as unknown[])
    .filter((e): e is Record<string, unknown> => e !== null && typeof e === "object")
    .filter((e) => {
      const day = typeof e.day_of_week === "string" ? e.day_of_week : "";
      const period = Number(e.period_number);
      const subject = typeof e.subject === "string" ? e.subject.trim() : "";
      return VALID_DAYS.has(day) && period >= 1 && period <= MAX_PERIODS && subject.length > 0;
    })
    .map((e) => ({
      school_id: targetSchoolId,
      class_name: className,
      section: section || null,
      day_of_week: e.day_of_week as string,
      period_number: Number(e.period_number),
      time_slot_id: typeof e.time_slot_id === "string" && e.time_slot_id.length > 0 ? e.time_slot_id : null,
      subject: (e.subject as string).trim(),
      teacher_name: typeof e.teacher_name === "string" ? e.teacher_name.trim() || null : null,
      is_locked: typeof e.is_locked === "boolean" ? e.is_locked : false,
    }));

  // Delete old schedule for this class/section
  let deleteQuery = actorSupabase
    .from("class_schedules")
    .delete()
    .eq("school_id", targetSchoolId)
    .eq("class_name", className);
  if (section) deleteQuery = deleteQuery.eq("section", section);

  const { error: deleteError } = await deleteQuery;
  if (deleteError) return jsonError(deleteError.message || "تعذر حذف الجدول القديم.", 500);

  if (sanitized.length > 0) {
    const { error: insertError } = await actorSupabase.from("class_schedules").insert(sanitized);
    if (insertError) return jsonError(insertError.message || "تعذر حفظ الجدول.", 500);
  }

  return NextResponse.json({ ok: true, count: sanitized.length });
}
