import { NextRequest, NextResponse } from "next/server";

import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";

type AttendanceStatus = "present" | "absent" | "late" | "excused";
type AttendanceStatusFilter = AttendanceStatus | "all";

type StudentPreview = {
  id: string;
  full_name: string;
  class_name: string;
  section: string | null;
};

type AttendanceRecordRow = {
  attendance_date: string;
  status: AttendanceStatus;
  note: string | null;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeDate(value: string | null) {
  const v = (value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return v;
}

function normalizeStatus(value: string | null): AttendanceStatusFilter {
  switch (value) {
    case "present":
    case "absent":
    case "late":
    case "excused":
      return value;
    default:
      return "all";
  }
}

function clampNumber(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function daysBetween(from: string, to: string) {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.floor(Math.abs(b - a) / (24 * 60 * 60 * 1000));
}

function buildCounts(records: AttendanceRecordRow[]) {
  const counts = { present: 0, absent: 0, late: 0, excused: 0, total: 0 } as const;
  const next = { ...counts };
  for (const row of records) {
    next.total += 1;
    if (row.status === "present") next.present += 1;
    else if (row.status === "absent") next.absent += 1;
    else if (row.status === "late") next.late += 1;
    else if (row.status === "excused") next.excused += 1;
  }
  return next;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  if (!studentId || !UUID_REGEX.test(studentId)) {
    return jsonError("معرف الطالب غير صالح.", 400);
  }
  const schoolId = req.nextUrl.searchParams.get("schoolId");

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "بيانات الحضور متاحة ضمن نطاق المدرسة الحالية فقط.",
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
    namespace: "attendance-student-details",
    windowMs: 60_000,
    maxHits: 120,
    identifier: context.value.actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  const canViewAttendance = await routeUserHasPermission(
    context.value.actorSupabase,
    context.value.actorUserId,
    "view_attendance",
  );
  if (!canViewAttendance) {
    return jsonError("ليس لديك صلاحية عرض بيانات الحضور.", 403);
  }

  const status = normalizeStatus(req.nextUrl.searchParams.get("status"));
  const page = clampNumber(req.nextUrl.searchParams.get("page"), 1, 1, 1000);
  const pageSize = clampNumber(req.nextUrl.searchParams.get("pageSize"), 100, 10, 200);
  const today = new Date();
  const defaultTo = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const defaultFromDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
  const defaultFrom = new Date(defaultFromDate.getTime() - defaultFromDate.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const fromDate = normalizeDate(req.nextUrl.searchParams.get("from")) ?? defaultFrom;
  const toDate = normalizeDate(req.nextUrl.searchParams.get("to")) ?? defaultTo;

  if (fromDate > toDate) {
    return jsonError("نطاق التاريخ غير صالح.", 400);
  }

  if (daysBetween(fromDate, toDate) > 366) {
    return jsonError("نطاق التاريخ كبير جدًا. يرجى تقليص الفترة إلى سنة واحدة كحد أقصى.", 400);
  }

  const branchScope = resolveBranchScope(context.value);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { data: student, error: studentError } = await applyBranchScopeToQuery(
    context.value.actorSupabase
      .from("students")
      .select("id, full_name, class_name, section, branch_id")
      .eq("school_id", context.value.targetSchoolId)
      .eq("id", studentId),
    branchScope.value,
  ).maybeSingle<StudentPreview>();

  if (studentError) {
    return jsonError(studentError.message || "تعذر تحميل بيانات الطالب.", 500);
  }

  if (!student?.id) {
    return jsonError("الطالب غير موجود أو ليس ضمن نطاق صلاحيات المستخدم.", 404);
  }

  // Summary: fetch statuses only (bounded range), then reduce.
  let summaryQuery = applyBranchScopeToQuery(
    context.value.actorSupabase
      .from("attendance_records")
      .select("attendance_date, status")
      .eq("school_id", context.value.targetSchoolId)
      .eq("student_id", studentId)
      .gte("attendance_date", fromDate)
      .lte("attendance_date", toDate)
      .order("attendance_date", { ascending: false }),
    branchScope.value,
  );

  if (status !== "all") {
    summaryQuery = summaryQuery.eq("status", status);
  }

  const { data: summaryRows, error: summaryError } = await summaryQuery;
  if (summaryError) {
    return jsonError(summaryError.message || "تعذر تحميل ملخص الحضور.", 500);
  }

  const normalizedSummary = (Array.isArray(summaryRows) ? summaryRows : [])
    .map((row) => ({
      attendance_date: String((row as Record<string, unknown>).attendance_date ?? ""),
      status: (String((row as Record<string, unknown>).status ?? "") as AttendanceStatus),
      note: null,
    }))
    .filter((row) => row.attendance_date && ["present", "absent", "late", "excused"].includes(row.status));

  const counts = buildCounts(normalizedSummary);

  // Details: keep it paginated and include notes.
  const from = Math.max(0, (page - 1) * pageSize);
  const to = from + pageSize - 1;

  let detailsQuery = applyBranchScopeToQuery(
    context.value.actorSupabase
      .from("attendance_records")
      .select("attendance_date, status, note", { count: "exact" })
      .eq("school_id", context.value.targetSchoolId)
      .eq("student_id", studentId)
      .gte("attendance_date", fromDate)
      .lte("attendance_date", toDate)
      .order("attendance_date", { ascending: false }),
    branchScope.value,
  );

  if (status !== "all") {
    detailsQuery = detailsQuery.eq("status", status);
  }

  const { data: rows, error: rowsError, count } = await detailsQuery.range(from, to);
  if (rowsError) {
    return jsonError(rowsError.message || "تعذر تحميل تفاصيل الحضور.", 500);
  }

  const items = (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      attendance_date: String((row as Record<string, unknown>).attendance_date ?? ""),
      status: (String((row as Record<string, unknown>).status ?? "") as AttendanceStatus),
      note: typeof (row as Record<string, unknown>).note === "string" ? ((row as Record<string, unknown>).note as string) : null,
    }))
    .filter((row) => row.attendance_date && ["present", "absent", "late", "excused"].includes(row.status));

  return NextResponse.json({
    ok: true,
    student,
    range: { from: fromDate, to: toDate },
    summary: counts,
    records: {
      items,
      totalCount: typeof count === "number" ? count : normalizedSummary.length,
      page,
      pageSize,
    },
  });
}

