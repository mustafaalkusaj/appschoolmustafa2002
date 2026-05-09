import { NextRequest, NextResponse } from "next/server";

import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

function normalizeDate(value: string | null) {
  const v = (value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

function getLocalIsoDate(date: Date) {
  const shift = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - shift).toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const requestedBranchId = req.nextUrl.searchParams.get("branchId");
  const rawThreshold = parseInt(req.nextUrl.searchParams.get("threshold") ?? "3", 10);
  const threshold = isNaN(rawThreshold) ? 3 : Math.max(1, Math.min(30, rawThreshold));

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "تقارير الغياب المتكرر متاحة ضمن نطاق المدرسة الحالية فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace: "attendance-repeated-absences",
    windowMs: 60_000,
    maxHits: 30,
    identifier: context.value.actorUserId,
  });
  if (rateLimited) return rateLimited;

  const canView = await routeUserHasPermission(
    context.value.actorSupabase,
    context.value.actorUserId,
    "view_attendance",
  );
  if (!canView) return jsonError("ليس لديك صلاحية عرض تقارير الحضور.", 403);

  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) return jsonError(branchScope.message, branchScope.status);

  const today = new Date();
  const toDate = getLocalIsoDate(today);
  const fromDefault = getLocalIsoDate(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000));
  const fromDate = normalizeDate(req.nextUrl.searchParams.get("from")) ?? fromDefault;
  const toDateFinal = normalizeDate(req.nextUrl.searchParams.get("to")) ?? toDate;

  const { actorSupabase, targetSchoolId } = context.value;

  const { data: absenceData, error: absenceError } = await applyBranchScopeToQuery(
    actorSupabase
      .from("attendance_records")
      .select("student_id, attendance_date")
      .eq("school_id", targetSchoolId)
      .eq("status", "absent")
      .gte("attendance_date", fromDate)
      .lte("attendance_date", toDateFinal)
      .limit(200_000),
    branchScope.value,
  );

  if (absenceError) return jsonError(absenceError.message || "تعذر تحميل سجلات الغياب.", 500);

  const byStudent = new Map<string, string[]>();
  for (const row of (absenceData ?? []) as Array<{ student_id: string; attendance_date: string }>) {
    const list = byStudent.get(row.student_id) ?? [];
    list.push(row.attendance_date);
    byStudent.set(row.student_id, list);
  }

  const qualifiedIds = Array.from(byStudent.entries())
    .filter(([, dates]) => dates.length >= threshold)
    .map(([id]) => id);

  if (qualifiedIds.length === 0) {
    return NextResponse.json({ ok: true, students: [], from: fromDate, to: toDateFinal, threshold });
  }

  const { data: studentsData, error: studentsError } = await applyBranchScopeToQuery(
    actorSupabase
      .from("students")
      .select("id, full_name, class_name, section")
      .eq("school_id", targetSchoolId)
      .in("id", qualifiedIds)
      .neq("status", "deleted")
      .order("class_name", { ascending: true })
      .order("full_name", { ascending: true }),
    branchScope.value,
  );

  if (studentsError) return jsonError(studentsError.message || "تعذر تحميل بيانات الطلاب.", 500);

  const students = (
    (studentsData ?? []) as Array<{
      id: string;
      full_name: string;
      class_name: string;
      section: string | null;
    }>
  )
    .map((s) => ({
      id: s.id,
      full_name: s.full_name,
      class_name: s.class_name,
      section: s.section,
      absent_count: byStudent.get(s.id)?.length ?? 0,
      absent_dates: (byStudent.get(s.id) ?? []).sort(),
    }))
    .sort((a, b) => b.absent_count - a.absent_count);

  return NextResponse.json({ ok: true, students, from: fromDate, to: toDateFinal, threshold });
}
