import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { lockGradeSection, type GradeLockFilter } from "@/lib/grades/grade-entries-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function resolveContext(
  req: NextRequest,
  schoolId: string | null,
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
    namespace: "grades-lock",
    windowMs: 60_000,
    maxHits: 10,
    identifier: context.value.actorUserId,
  });

  if (rateLimited) {
    return { ok: false as const, response: rateLimited };
  }

  return { ok: true as const, value: context.value };
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return jsonError("جسم الطلب غير صالح.", 400);
  }

  const schoolId = normalizeString(body.school_id);
  if (!schoolId) {
    return jsonError("school_id مطلوب.", 400);
  }

  const academicYear = normalizeString(body.academicYear);
  if (!academicYear) {
    return jsonError("academicYear مطلوب.", 400);
  }

  const reason = normalizeString(body.reason);
  if (!reason) {
    return jsonError("reason مطلوب عند قفل الدرجات.", 400);
  }

  const semesterRaw =
    typeof body.semester === "number"
      ? body.semester
      : typeof body.semester === "string"
        ? parseInt(body.semester, 10)
        : NaN;
  const semester: 1 | 2 | undefined =
    semesterRaw === 1 || semesterRaw === 2 ? semesterRaw : undefined;

  const filters: GradeLockFilter = {
    academicYear,
    classId: normalizeString(body.classId) ?? undefined,
    sectionId: normalizeString(body.sectionId) ?? undefined,
    subjectId: normalizeString(body.subjectId) ?? undefined,
    semester,
  };

  const context = await resolveContext(req, schoolId);
  if (!context.ok) {
    return context.response;
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const branchScope = resolveBranchScope(context.value);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const canLock = await routeUserHasPermission(actorSupabase, actorUserId, "lock_grades");
  if (!canLock) {
    return jsonError("ليس لديك صلاحية قفل الدرجات.", 403);
  }

  // Resolve branch student IDs for isolation
  let branchStudentIds: string[] | undefined;
  if (branchScope.value.branchIds.length > 0) {
    const { data: branchStudents } = await applyBranchScopeToQuery(
      actorSupabase.from("students").select("id").eq("school_id", targetSchoolId),
      branchScope.value,
    );
    branchStudentIds = ((branchStudents ?? []) as Array<{ id: string }>).map((s) => s.id);
  }

  const result = await lockGradeSection(
    actorSupabase,
    targetSchoolId,
    filters,
    actorUserId,
    reason,
    branchStudentIds,
  );

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, gate: result.gate, error: { message: result.message ?? "تعذر قفل الدرجات." } },
      { status: result.gate.code === "missing_table" ? 503 : 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    gate: result.gate,
    count: result.count,
    message: result.message,
  });
}
