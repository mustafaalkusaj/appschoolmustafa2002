import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import {
  fetchGradeEntries,
  fetchStudentGradeHistory,
  createGradeEntry,
  type GradeEntriesFilter,
} from "@/lib/grades/grade-entries-server";
import type { GradeEntryInput } from "@/lib/grades/types";
import { resolveBranchScope, applyBranchScopeToQuery } from "@/lib/branch-scope";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

function parseIntParam(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = parseInt(value, 10);
  return isNaN(n) ? undefined : n;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeScore(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && isFinite(value) && value >= 0) return value;
  if (typeof value === "string") {
    const n = parseFloat(value);
    if (isFinite(n) && n >= 0) return n;
  }
  return null;
}

function normalizeBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  return fallback;
}

/**
 * Validate and normalize a single grade entry from the request body.
 * New model: score + max_score + optional grade_type_id (replaces old 5-column scores).
 */
function normalizeGradeInput(raw: Record<string, unknown>): GradeEntryInput | null {
  const studentId = normalizeString(raw.student_id);
  const subjectId = normalizeString(raw.subject_id);
  const academicYear = normalizeString(raw.academic_year);
  const semesterRaw = typeof raw.semester === "number" ? raw.semester : parseInt(String(raw.semester ?? ""), 10);

  if (!studentId || !subjectId || !academicYear) return null;
  if (semesterRaw !== 1 && semesterRaw !== 2) return null;

  // score and max_score are required
  const score = normalizeScore(raw.score);
  const maxScore = normalizeScore(raw.max_score);
  if (score === null || maxScore === null || maxScore <= 0) return null;
  if (score > maxScore) return null;

  return {
    student_id: studentId,
    subject_id: subjectId,
    class_id: normalizeString(raw.class_id),
    section_id: normalizeString(raw.section_id),
    teacher_id: normalizeString(raw.teacher_id),
    grade_type_id: normalizeString(raw.grade_type_id),
    grade_type_name: normalizeString(raw.grade_type_name),
    academic_year: academicYear,
    semester: semesterRaw as 1 | 2,
    score,
    max_score: maxScore,
    note: typeof raw.note === "string" ? raw.note.trim() || null : null,
    send_notification: normalizeBool(raw.send_notification, false),
  };
}

async function resolveGradesContext(
  req: NextRequest,
  schoolId: string | null,
  namespace: string,
  maxHits: number,
) {
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "إدارة الدرجات متاحة ضمن نطاق المدرسة الحالية فقط.",
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

// GET — fetch grade entries (individual records) by filters or student history
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const schoolId = params.get("schoolId");
  const academicYear = params.get("academicYear");

  if (!academicYear) {
    return jsonError("academicYear مطلوب.", 400);
  }

  const context = await resolveGradesContext(req, schoolId, "grades-read", 120);
  if (!context.ok) {
    return context.response;
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  // Resolve and validate branch scope.
  // grade_entries has no branch_id column — isolation goes through student_id → students.branch_id.
  const requestedBranchId = params.get("branchId") ?? params.get("branch_id");
  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const canView = await routeUserHasPermission(actorSupabase, actorUserId, "view_grades");
  if (!canView) {
    return jsonError("ليس لديك صلاحية عرض الدرجات.", 403);
  }

  // When branch-scoped, resolve the set of student IDs within the branch so we
  // can pass them as a filter into grade_entries (which lacks its own branch_id).
  let branchStudentIds: string[] | null = null;
  if (branchScope.value.branchIds.length > 0) {
    const { data: branchStudents } = await applyBranchScopeToQuery(
      actorSupabase
        .from("students")
        .select("id")
        .eq("school_id", targetSchoolId)
        .neq("status", "deleted"),
      branchScope.value,
    );
    branchStudentIds = ((branchStudents ?? []) as Array<{ id: string }>).map((s) => s.id);
    // If no students in branch, return empty immediately.
    if (branchStudentIds.length === 0) {
      return NextResponse.json({ ok: true, gate: { available: true }, items: [], count: 0 });
    }
  }

  const semesterRaw = parseIntParam(params.get("semester"));
  const semester = semesterRaw === 1 || semesterRaw === 2 ? semesterRaw : undefined;

  // If studentId is provided alone, return full history for that student.
  // Verify the requested studentId is within the actor's branch scope.
  const studentId = params.get("studentId");
  if (studentId && !params.get("subjectId")) {
    if (branchStudentIds !== null && !branchStudentIds.includes(studentId)) {
      return jsonError("لا يمكنك الوصول إلى بيانات هذا الطالب.", 403);
    }
    const result = await fetchStudentGradeHistory(actorSupabase, targetSchoolId, studentId);
    return NextResponse.json({
      ok: result.ok,
      gate: result.gate,
      items: result.items,
      count: result.items.length,
    });
  }

  const filters: GradeEntriesFilter = {
    academicYear,
    classId: params.get("classId") ?? undefined,
    sectionId: params.get("sectionId") ?? undefined,
    subjectId: params.get("subjectId") ?? undefined,
    studentId: studentId ?? undefined,
    gradeTypeId: params.get("gradeTypeId") ?? undefined,
    semester,
    status: (params.get("status") as import("@/lib/grades/types").GradeStatus) ?? undefined,
    // Pass branch student IDs so fetchGradeEntries can filter via student_id
    studentIds: branchStudentIds ?? undefined,
  };

  const result = await fetchGradeEntries(actorSupabase, targetSchoolId, filters);

  return NextResponse.json({
    ok: result.ok,
    gate: result.gate,
    items: result.items,
    count: result.items.length,
  });
}

// POST — create one or many grade entries
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as unknown;

  if (!body || typeof body !== "object") {
    return jsonError("جسم الطلب غير صالح.", 400);
  }

  // Support both single entry and array
  const isBulk = Array.isArray(body);
  const rawEntries: unknown[] = isBulk ? (body as unknown[]) : [body];

  // Extract schoolId from body or first entry
  const bodyObj = body as Record<string, unknown>;
  const schoolId =
    normalizeString(bodyObj.school_id) ??
    (rawEntries[0] && typeof rawEntries[0] === "object"
      ? normalizeString((rawEntries[0] as Record<string, unknown>).school_id)
      : null);

  if (!schoolId) {
    return jsonError("school_id مطلوب.", 400);
  }

  const context = await resolveGradesContext(req, schoolId, "grades-write", 60);
  if (!context.ok) {
    return context.response;
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const canEnter = await routeUserHasPermission(actorSupabase, actorUserId, "enter_grades");
  if (!canEnter) {
    return jsonError("ليس لديك صلاحية إدخال الدرجات.", 403);
  }

  // Normalize and validate inputs
  const validInputs: GradeEntryInput[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rawEntries.length; i++) {
    const raw = rawEntries[i];
    if (!raw || typeof raw !== "object") {
      errors.push(`العنصر ${i + 1}: بيانات غير صالحة.`);
      continue;
    }
    const input = normalizeGradeInput(raw as Record<string, unknown>);
    if (!input) {
      errors.push(`العنصر ${i + 1}: بيانات مفقودة أو غير صالحة (student_id, subject_id, academic_year, semester, score, max_score مطلوبة).`);
      continue;
    }
    validInputs.push(input);
  }

  if (validInputs.length === 0) {
    return jsonError(errors.join(" | ") || "لا توجد مدخلات صالحة.", 400);
  }

  if (isBulk) {
    // Bulk insert — run in parallel chunks to avoid overwhelming the DB
    const CHUNK_SIZE = 20;
    const chunks: GradeEntryInput[][] = [];
    for (let i = 0; i < validInputs.length; i += CHUNK_SIZE) {
      chunks.push(validInputs.slice(i, i + CHUNK_SIZE));
    }

    const results = await Promise.all(
      chunks.flatMap((chunk) =>
        chunk.map((input) => createGradeEntry(actorSupabase, targetSchoolId, input, actorUserId)),
      ),
    );

    const failedResults = results.filter((r) => !r.ok);
    const savedCount = results.filter((r) => r.ok).length;

    if (failedResults.length > 0 && savedCount === 0) {
      return jsonError(failedResults[0]?.message ?? "تعذر حفظ الدرجات.", 500);
    }

    return NextResponse.json({
      ok: true,
      gate: results[0]?.gate ?? { available: true },
      savedCount,
      failedCount: failedResults.length,
      items: results.filter((r) => r.ok).map((r) => r.entry).filter(Boolean),
    });
  }

  // Single insert
  const result = await createGradeEntry(actorSupabase, targetSchoolId, validInputs[0], actorUserId);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, gate: result.gate, error: { message: result.message ?? "تعذر حفظ الدرجة." } },
      { status: result.gate.code === "missing_table" ? 503 : 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    gate: result.gate,
    entry: result.entry,
    message: result.message,
  });
}
