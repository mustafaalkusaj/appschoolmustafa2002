import { NextRequest, NextResponse } from "next/server";

import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";

type AttendanceStatus = "present" | "absent" | "late" | "excused";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

function normalizeDate(value: string | null) {
  const v = (value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return v;
}

function normalizeText(value: string | null, max = 80) {
  return (value ?? "")
    .replace(/[\u0000-\u001F\u007F,()%]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function daysBetween(from: string, to: string) {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.floor(Math.abs(b - a) / (24 * 60 * 60 * 1000));
}

function escapeCsv(value: unknown) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const requestedBranchId = req.nextUrl.searchParams.get("branchId");
  const className = normalizeText(req.nextUrl.searchParams.get("className"), 60);
  const section = normalizeText(req.nextUrl.searchParams.get("section"), 20);

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "تصدير الحضور متاح ضمن نطاق المدرسة الحالية فقط.",
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
    namespace: "attendance-export-absences",
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

  if (!className) {
    return jsonError("اسم الصف مطلوب للتصدير.", 400);
  }

  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const today = new Date();
  const defaultTo = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const defaultFromDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const defaultFrom = new Date(defaultFromDate.getTime() - defaultFromDate.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const fromDate = normalizeDate(req.nextUrl.searchParams.get("from")) ?? defaultFrom;
  const toDate = normalizeDate(req.nextUrl.searchParams.get("to")) ?? defaultTo;

  if (fromDate > toDate) {
    return jsonError("نطاق التاريخ غير صالح.", 400);
  }

  // Safety limit for exports.
  if (daysBetween(fromDate, toDate) > 92) {
    return jsonError("نطاق التصدير كبير جدًا. يرجى تقليص الفترة إلى 3 أشهر كحد أقصى.", 400);
  }

  // 1) Resolve students for the class/section within the target school.
  let studentsQuery = applyBranchScopeToQuery(
    context.value.actorSupabase
      .from("students")
      .select("id, full_name, class_name, section")
      .eq("school_id", context.value.targetSchoolId)
      .eq("class_name", className)
      .neq("status", "deleted")
      .order("full_name", { ascending: true })
      .limit(10_000),
    branchScope.value,
  );

  if (section) studentsQuery = studentsQuery.eq("section", section);

  const { data: studentsData, error: studentsError } = await studentsQuery;
  if (studentsError) {
    return jsonError(studentsError.message || "تعذر تحميل طلاب الصف.", 500);
  }

  const students = (Array.isArray(studentsData) ? studentsData : [])
    .map((row) => ({
      id: String((row as Record<string, unknown>).id ?? ""),
      full_name: String((row as Record<string, unknown>).full_name ?? ""),
      class_name: String((row as Record<string, unknown>).class_name ?? ""),
      section: typeof (row as Record<string, unknown>).section === "string" ? ((row as Record<string, unknown>).section as string) : null,
    }))
    .filter((row) => row.id && row.full_name);

  if (students.length === 0) {
    const csv = ["student_id,student_name,class_name,section,absent_count,absent_dates,late_count,late_dates", ""].join("\n");
    return new NextResponse("\ufeff" + csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${encodeURIComponent(`class_absences_${className}_${fromDate}_to_${toDate}.csv`)}"`,
        "cache-control": "no-store",
      },
    });
  }

  const studentIds = students.map((s) => s.id);

  // 2) Fetch attendance rows (absent + late) for the class range.
  const { data: attendanceData, error: attendanceError } = await applyBranchScopeToQuery(
    context.value.actorSupabase
      .from("attendance_records")
      .select("student_id, attendance_date, status")
      .eq("school_id", context.value.targetSchoolId)
      .in("student_id", studentIds)
      .gte("attendance_date", fromDate)
      .lte("attendance_date", toDate)
      .in("status", ["absent", "late"] satisfies AttendanceStatus[])
      .order("attendance_date", { ascending: false })
      .limit(200_000),
    branchScope.value,
  );

  if (attendanceError) {
    return jsonError(attendanceError.message || "تعذر تحميل سجلات الغياب.", 500);
  }

  const perStudent = new Map<
    string,
    {
      absentDates: string[];
      lateDates: string[];
    }
  >();

  for (const id of studentIds) {
    perStudent.set(id, { absentDates: [], lateDates: [] });
  }

  for (const row of Array.isArray(attendanceData) ? attendanceData : []) {
    const studentIdValue = String((row as Record<string, unknown>).student_id ?? "");
    const dateValue = String((row as Record<string, unknown>).attendance_date ?? "");
    const statusValue = String((row as Record<string, unknown>).status ?? "") as AttendanceStatus;
    if (!studentIdValue || !dateValue) continue;
    const entry = perStudent.get(studentIdValue);
    if (!entry) continue;
    if (statusValue === "absent") entry.absentDates.push(dateValue);
    if (statusValue === "late") entry.lateDates.push(dateValue);
  }

  const header = ["student_id", "student_name", "class_name", "section", "absent_count", "absent_dates", "late_count", "late_dates"];
  const lines = [header.join(",")];

  for (const student of students) {
    const entry = perStudent.get(student.id) ?? { absentDates: [], lateDates: [] };
    lines.push(
      [
        student.id,
        student.full_name,
        student.class_name,
        student.section ?? "",
        entry.absentDates.length,
        entry.absentDates.join(" ; "),
        entry.lateDates.length,
        entry.lateDates.join(" ; "),
      ]
        .map(escapeCsv)
        .join(","),
    );
  }

  // JSON format for client-side Excel export
  const format = req.nextUrl.searchParams.get("format");
  if (format === "json") {
    const jsonItems = students.map((student) => {
      const entry = perStudent.get(student.id) ?? { absentDates: [], lateDates: [] };
      return {
        student_name: student.full_name,
        class_name: student.class_name,
        section: student.section ?? "",
        absent_count: entry.absentDates.length,
        absent_dates: entry.absentDates.join(" ; "),
        late_count: entry.lateDates.length,
        late_dates: entry.lateDates.join(" ; "),
      };
    });
    return NextResponse.json({ items: jsonItems });
  }

  const safeSection = section ? `_${section}` : "";
  const filename = `class_absences_${className}${safeSection}_${fromDate}_to_${toDate}.csv`;

  return new NextResponse("\ufeff" + lines.join("\n") + "\n", {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "cache-control": "no-store",
    },
  });
}

