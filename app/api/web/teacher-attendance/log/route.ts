import { NextRequest, NextResponse } from "next/server";

import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { jsonError, logRouteError } from "@/lib/route-utils";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const schoolId  = req.nextUrl.searchParams.get("schoolId");
  const startDate = req.nextUrl.searchParams.get("startDate");
  const endDate   = req.nextUrl.searchParams.get("endDate");
  const teacherId = req.nextUrl.searchParams.get("teacherId") || null;
  const status    = req.nextUrl.searchParams.get("status")    || null;

  if (!startDate || !DATE_RE.test(startDate)) {
    return jsonError("startDate مطلوب ويجب أن يكون بالصيغة YYYY-MM-DD.", 400);
  }
  if (!endDate || !DATE_RE.test(endDate)) {
    return jsonError("endDate مطلوب ويجب أن يكون بالصيغة YYYY-MM-DD.", 400);
  }
  if (startDate > endDate) {
    return jsonError("startDate يجب أن يكون قبل endDate.", 400);
  }
  const diffMs = new Date(endDate).getTime() - new Date(startDate).getTime();
  if (diffMs > 31 * 24 * 60 * 60 * 1000) {
    return jsonError("الفترة الزمنية القصوى 31 يوماً.", 400);
  }

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "سجلات حضور الأساتذة متاحة ضمن نطاق المدرسة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const requestedBranchId = req.nextUrl.searchParams.get("branchId") ?? req.nextUrl.searchParams.get("branch_id");
  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const [rateLimited, canView] = await Promise.all([
    enforceRateLimit(req, {
      namespace: "teacher-attendance",
      windowMs: 60_000,
      maxHits: 60,
      identifier: actorUserId,
    }),
    routeUserHasPermission(actorSupabase, actorUserId, "view_teacher_attendance"),
  ]);

  if (rateLimited) return rateLimited;
  if (!canView) {
    return jsonError("ليس لديك صلاحية عرض حضور الأساتذة.", 403);
  }

  try {
    let q = applyBranchScopeToQuery(
      actorSupabase
        .from("teacher_attendance")
        .select(
          "id, teacher_id, attendance_date, status, check_in_time, check_out_time, notes, teachers(id, full_name, subject)",
        )
        .eq("school_id", targetSchoolId)
        .gte("attendance_date", startDate)
        .lte("attendance_date", endDate),
      branchScope.value,
    );

    if (teacherId) q = q.eq("teacher_id", teacherId);
    if (status)    q = q.eq("status", status);

    const { data, error } = await q
      .order("attendance_date", { ascending: false })
      .order("created_at",      { ascending: true });

    if (error) throw error;

    const records = (data ?? []).map((r) => {
      const t = Array.isArray(r.teachers) ? r.teachers[0] : r.teachers;
      return {
        id:              r.id,
        attendance_date: r.attendance_date,
        teacher_id:      r.teacher_id,
        teacher_name:    t?.full_name ?? "—",
        subject:         t?.subject   ?? null,
        status:          r.status,
        check_in_time:   r.check_in_time,
        check_out_time:  r.check_out_time,
        notes:           r.notes,
      };
    });

    return NextResponse.json({ ok: true, records });
  } catch (error) {
    logRouteError("teacher-attendance-log", error, {
      actorUserId,
      schoolId: targetSchoolId,
      requestId: req.headers.get("x-request-id"),
    });
    return jsonError("تعذر تحميل سجل حضور الأساتذة.", 500);
  }
}
