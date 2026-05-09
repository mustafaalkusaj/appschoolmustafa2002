import { NextRequest, NextResponse } from "next/server";

import { applyBranchScopeToQuery, resolveBranchIdForWrite, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { invalidateSchoolCacheDomains } from "@/lib/server-cache";
import { routeUserHasPermission } from "@/lib/route-permissions";

type AttendanceStatus = "present" | "absent" | "late" | "excused";

type AttendanceSaveEntry = {
  student_id: string;
  status: AttendanceStatus;
  note?: string | null;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

function normalizeDate(value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

function normalizeAttendanceStatus(value: unknown): AttendanceStatus | null {
  switch (value) {
    case "present":
    case "absent":
    case "late":
    case "excused":
      return value;
    default:
      return null;
  }
}

function normalizeNote(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized.slice(0, 500) : null;
}

function getLocalIsoDate(date: Date) {
  const shift = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - shift).toISOString().slice(0, 10);
}

function buildHistory(rows: Array<{ attendance_date: string; status: AttendanceStatus }>) {
  const grouped: Record<
    string,
    { present: number; absent: number; late: number; excused: number }
  > = {};

  for (const row of rows) {
    const date = row.attendance_date;
    if (!grouped[date]) {
      grouped[date] = { present: 0, absent: 0, late: 0, excused: 0 };
    }
    grouped[date][row.status] += 1;
  }

  return Object.keys(grouped)
    .sort((left, right) => (left > right ? -1 : 1))
    .map((date) => {
      const counts = grouped[date];
      const total = counts.present + counts.absent + counts.late + counts.excused;
      const rate = total ? Math.round(((counts.present + counts.late) / total) * 100) : 0;
      return { date, ...counts, total, rate };
    });
}

async function resolveAttendanceContext(req: NextRequest, schoolId: string | null, namespace: string, maxHits: number) {
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "إدارة الحضور متاحة ضمن نطاق المدرسة الحالية فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return {
      ok: false as const,
      response: jsonError(
        "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
        "status" in context ? context.status : 500,
      ),
    };
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace,
    windowMs: 60_000,
    maxHits,
    identifier: context.value.actorUserId,
  });

  if (rateLimited) {
    return { ok: false as const, response: rateLimited };
  }

  return { ok: true as const, value: context.value };
}

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const date = normalizeDate(req.nextUrl.searchParams.get("date")) ?? getLocalIsoDate(new Date());

  const context = await resolveAttendanceContext(req, schoolId, "attendance-snapshot", 120);
  if (!context.ok) {
    return context.response;
  }

  const requestedBranchId = req.nextUrl.searchParams.get("branchId") ?? req.nextUrl.searchParams.get("branch_id");
  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, targetSchoolId } = context.value;
  const canViewAttendance = await routeUserHasPermission(actorSupabase, context.value.actorUserId, "view_attendance");
  if (!canViewAttendance) {
    return jsonError("ليس لديك صلاحية عرض الحضور.", 403);
  }
  const fromDate = getLocalIsoDate(new Date(new Date(`${date}T00:00:00`).getTime() - 30 * 24 * 60 * 60 * 1000));

  const [studentsResult, recordsResult, historyResult] = await Promise.all([
    applyBranchScopeToQuery(
      actorSupabase
      .from("students")
      .select("id, full_name, class_name, section, status, school_id, branch_id")
      .eq("school_id", targetSchoolId)
      .neq("status", "deleted")
      .order("class_name", { ascending: true })
      .order("full_name", { ascending: true }),
      branchScope.value,
    ),
    applyBranchScopeToQuery(
      actorSupabase
      .from("attendance_records")
      .select("id, student_id, status, note, updated_at")
      .eq("school_id", targetSchoolId)
      .eq("attendance_date", date),
      branchScope.value,
    ),
    applyBranchScopeToQuery(
      actorSupabase
      .from("attendance_records")
      .select("attendance_date, status")
      .eq("school_id", targetSchoolId)
      .gte("attendance_date", fromDate)
      .lte("attendance_date", date),
      branchScope.value,
    ),
  ]);

  if (studentsResult.error) {
    return jsonError(studentsResult.error.message || "تعذر تحميل قائمة الطلاب.", 500);
  }

  if (recordsResult.error) {
    return jsonError(recordsResult.error.message || "تعذر تحميل سجلات حضور اليوم.", 500);
  }

  if (historyResult.error) {
    return jsonError(historyResult.error.message || "تعذر تحميل سجل الحضور السابق.", 500);
  }

  const historyRows = ((historyResult.data ?? []) as Array<Record<string, unknown>>)
    .map((row) => ({
      attendance_date: String(row.attendance_date ?? ""),
      status: normalizeAttendanceStatus(row.status),
    }))
    .filter((row): row is { attendance_date: string; status: AttendanceStatus } => Boolean(row.attendance_date && row.status));

  return NextResponse.json({
    ok: true,
    students: studentsResult.data ?? [],
    records: recordsResult.data ?? [],
    history: buildHistory(historyRows),
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { school_id?: unknown; attendance_date?: unknown; entries?: unknown; branch_id?: unknown }
    | null;

  const schoolId = typeof body?.school_id === "string" ? body.school_id.trim() : null;
  const attendanceDate = normalizeDate(typeof body?.attendance_date === "string" ? body.attendance_date : null);

  if (!schoolId || !attendanceDate) {
    return jsonError("بيانات الحضور غير مكتملة.", 400);
  }

  const context = await resolveAttendanceContext(req, schoolId, "attendance-save", 45);
  if (!context.ok) {
    return context.response;
  }

  const requestedBranchId =
    typeof body?.branch_id === "string" && body.branch_id.trim().length > 0 ? body.branch_id.trim() : null;
  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const rawEntries = Array.isArray(body?.entries) ? body.entries : [];
  const dedupedEntries = new Map<string, AttendanceSaveEntry>();

  for (const rawEntry of rawEntries) {
    if (!rawEntry || typeof rawEntry !== "object") continue;
    const entry = rawEntry as Record<string, unknown>;
    const studentId = typeof entry.student_id === "string" ? entry.student_id.trim() : "";
    const status = normalizeAttendanceStatus(entry.status);
    if (!studentId || !status) continue;
    dedupedEntries.set(studentId, {
      student_id: studentId,
      status,
      note: normalizeNote(entry.note),
    });
  }

  const entries = Array.from(dedupedEntries.values());
  if (entries.length === 0) {
    return jsonError("لا توجد سجلات حضور صالحة للحفظ.", 400);
  }

  const { actorSupabase, targetSchoolId } = context.value;
  const canSaveAttendance = await routeUserHasPermission(actorSupabase, context.value.actorUserId, "take_attendance");
  if (!canSaveAttendance) {
    return jsonError("ليس لديك صلاحية تسجيل الحضور.", 403);
  }

  // Lock: employees cannot edit attendance for past dates
  const todayDate = getLocalIsoDate(new Date());
  if (attendanceDate < todayDate) {
    const { data: actorProfile } = await actorSupabase
      .from("user_profiles")
      .select("role")
      .eq("id", context.value.actorUserId)
      .maybeSingle();
    const actorRole = (actorProfile as { role?: string } | null)?.role ?? "employee";
    if (actorRole === "employee") {
      return jsonError("لا يمكن تعديل سجلات الحضور لأيام سابقة. تواصل مع المشرف.", 403);
    }
  }
  const studentIds = entries.map((entry) => entry.student_id);
  const { data: students, error: studentsError } = await applyBranchScopeToQuery(
    actorSupabase
      .from("students")
      .select("id, branch_id")
      .eq("school_id", targetSchoolId)
      .in("id", studentIds)
      .neq("status", "deleted"),
    branchScope.value,
  );

  if (studentsError) {
    return jsonError(studentsError.message || "تعذر التحقق من الطلاب قبل الحفظ.", 500);
  }

  const branchByStudentId = new Map(
    ((students ?? []) as Array<Record<string, unknown>>).map((student) => [
      String(student.id ?? ""),
      typeof student.branch_id === "string" ? student.branch_id : null,
    ]),
  );

  if (branchByStudentId.size !== studentIds.length) {
    return jsonError("بعض سجلات الحضور تشير إلى طلاب خارج نطاق المدرسة الحالية.", 400);
  }

  const writeBranch = resolveBranchIdForWrite(branchScope.value, requestedBranchId);
  if (!writeBranch.ok) {
    return jsonError(writeBranch.message, writeBranch.status);
  }

  const payload = entries.map((entry) => ({
    school_id: targetSchoolId,
    branch_id: writeBranch.value ?? branchByStudentId.get(entry.student_id) ?? null,
    student_id: entry.student_id,
    attendance_date: attendanceDate,
    status: entry.status,
    note: entry.note,
  }));

  const { error } = await actorSupabase
    .from("attendance_records")
    .upsert(payload, { onConflict: "student_id,attendance_date" });

  if (error) {
    return jsonError(error.message || "تعذر حفظ سجلات الحضور.", 500);
  }

  invalidateSchoolCacheDomains(targetSchoolId, ["dashboard-overview", "reports-overview"]);

  return NextResponse.json({
    ok: true,
    savedCount: payload.length,
  });
}
