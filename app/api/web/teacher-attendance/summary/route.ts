import { NextRequest, NextResponse } from "next/server";

import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { jsonError, logRouteError } from "@/lib/route-utils";

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const yearParam = req.nextUrl.searchParams.get("year");
  const monthParam = req.nextUrl.searchParams.get("month");

  const year = yearParam ? parseInt(yearParam, 10) : null;
  const month = monthParam ? parseInt(monthParam, 10) : null;

  if (!year || !month || isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return jsonError("يجب تحديد السنة والشهر بشكل صحيح.", 400);
  }

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "ملخص حضور الأساتذة متاح ضمن نطاق المدرسة فقط.",
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
    return jsonError("ليس لديك صلاحية عرض ملخص حضور الأساتذة.", 403);
  }

  try {
    const paddedMonth = String(month).padStart(2, "0");
    const fromDate = `${year}-${paddedMonth}-01`;
    // Last day of month
    const lastDay = new Date(year, month, 0).getDate();
    const toDate = `${year}-${paddedMonth}-${String(lastDay).padStart(2, "0")}`;

    const { data: records, error } = await applyBranchScopeToQuery(
      actorSupabase
        .from("teacher_attendance")
        .select("teacher_id, status, attendance_date, teachers(id, full_name, subject)")
        .eq("school_id", targetSchoolId)
        .gte("attendance_date", fromDate)
        .lte("attendance_date", toDate),
      branchScope.value,
    );

    if (error) {
      throw error;
    }

    // Aggregate per teacher
    const teacherMap = new Map<
      string,
      {
        teacher_id: string;
        name: string;
        subject: string | null;
        present: number;
        absent: number;
        late: number;
        excused: number;
        holiday: number;
        total_days: number;
      }
    >();

    for (const row of records ?? []) {
      const teacherId = row.teacher_id as string;
      const teacherInfo = (Array.isArray(row.teachers) ? row.teachers[0] : row.teachers) as { id: string; full_name: string; subject: string | null } | null;

      if (!teacherMap.has(teacherId)) {
        teacherMap.set(teacherId, {
          teacher_id: teacherId,
          name: teacherInfo?.full_name ?? "",
          subject: teacherInfo?.subject ?? null,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          holiday: 0,
          total_days: 0,
        });
      }

      const entry = teacherMap.get(teacherId)!;
      entry.total_days += 1;
      const status = row.status as string;
      if (status === "present") entry.present += 1;
      else if (status === "absent") entry.absent += 1;
      else if (status === "late") entry.late += 1;
      else if (status === "excused") entry.excused += 1;
      else if (status === "holiday") entry.holiday += 1;
    }

    const teachers = Array.from(teacherMap.values());

    // If teacherId specified, return daily details for that teacher
    const teacherId = req.nextUrl.searchParams.get("teacherId");
    let details: { date: string; status: string }[] | undefined;
    if (teacherId) {
      details = (records ?? [])
        .filter((r) => (r.teacher_id as string) === teacherId)
        .map((r) => ({ date: r.attendance_date as string, status: r.status as string }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    return NextResponse.json({ ok: true, teachers, year, month, ...(details ? { details } : {}) });
  } catch (error) {
    logRouteError("teacher-attendance-summary", error, {
      actorUserId,
      schoolId: targetSchoolId,
      requestId: req.headers.get("x-request-id"),
    });
    return jsonError("تعذر تحميل ملخص الحضور. حاول مرة أخرى بعد قليل.", 500);
  }
}
