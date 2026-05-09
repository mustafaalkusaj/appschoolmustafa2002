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

function daysBetween(from: string, to: string) {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.floor(Math.abs(b - a) / (24 * 60 * 60 * 1000));
}

function escapeCsv(value: unknown) {
  const str = String(value ?? "");
  // Excel-friendly, keep UTF-8 BOM in body.
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function buildCounts(records: AttendanceRecordRow[]) {
  const next = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
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
    namespace: "attendance-student-export",
    windowMs: 60_000,
    maxHits: 30,
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
    return jsonError("ليس لديك صلاحية تصدير بيانات الحضور.", 403);
  }

  const today = new Date();
  const defaultTo = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const defaultFromDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
  const defaultFrom = new Date(defaultFromDate.getTime() - defaultFromDate.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const fromDate = normalizeDate(req.nextUrl.searchParams.get("from")) ?? defaultFrom;
  const toDate = normalizeDate(req.nextUrl.searchParams.get("to")) ?? defaultTo;
  const status = normalizeStatus(req.nextUrl.searchParams.get("status"));

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
      .select("id, full_name, class_name, section")
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

  let query = applyBranchScopeToQuery(
    context.value.actorSupabase
      .from("attendance_records")
      .select("attendance_date, status, note")
      .eq("school_id", context.value.targetSchoolId)
      .eq("student_id", studentId)
      .gte("attendance_date", fromDate)
      .lte("attendance_date", toDate)
      .order("attendance_date", { ascending: false }),
    branchScope.value,
  );

  if (status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    return jsonError(error.message || "تعذر تصدير سجل الحضور.", 500);
  }

  const rows = (Array.isArray(data) ? data : [])
    .map((row) => ({
      attendance_date: String((row as Record<string, unknown>).attendance_date ?? ""),
      status: String((row as Record<string, unknown>).status ?? "") as AttendanceStatus,
      note: typeof (row as Record<string, unknown>).note === "string" ? ((row as Record<string, unknown>).note as string) : "",
    }))
    .filter((row) => row.attendance_date && ["present", "absent", "late", "excused"].includes(row.status));

  const summary = buildCounts(rows);

  const header = ["student_id", "student_name", "class_name", "section", "from", "to", "total", "present", "absent", "late", "excused"];
  const metaLine = [
    student.id,
    student.full_name,
    student.class_name,
    student.section ?? "",
    fromDate,
    toDate,
    summary.total,
    summary.present,
    summary.absent,
    summary.late,
    summary.excused,
  ].map(escapeCsv);

  const recordsHeader = ["date", "status", "note"];
  const recordsLines = rows.map((row) => [row.attendance_date, row.status, row.note ?? ""].map(escapeCsv).join(","));

  const csv = [
    header.join(","),
    metaLine.join(","),
    "",
    recordsHeader.join(","),
    ...recordsLines,
    "",
  ].join("\n");

  // Keep the filename ES5-compatible (tsconfig target is es5) and still Arabic-friendly.
  // Strip only characters that are problematic for filesystems.
  const safeName =
    student.full_name
      .replace(/[\\/:*?"<>|]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 64) || "student";
  const filename = `attendance_${safeName}_${fromDate}_to_${toDate}.csv`;

  return new NextResponse("\ufeff" + csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "cache-control": "no-store",
    },
  });
}
