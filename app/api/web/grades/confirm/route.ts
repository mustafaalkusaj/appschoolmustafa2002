import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { confirmGradeEntries } from "@/lib/grades/grade-entries-server";

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
    namespace: "grades-confirm",
    windowMs: 60_000,
    maxHits: 30,
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

  const rawEntryIds = body.entryIds;
  if (!Array.isArray(rawEntryIds) || rawEntryIds.length === 0) {
    return jsonError("entryIds يجب أن تكون مصفوفة غير فارغة من معرّفات الدرجات.", 400);
  }

  const entryIds = rawEntryIds
    .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    .map((id) => id.trim());

  if (entryIds.length === 0) {
    return jsonError("لا توجد معرّفات صالحة في entryIds.", 400);
  }

  const context = await resolveContext(req, schoolId);
  if (!context.ok) {
    return context.response;
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const branchScope = resolveBranchScope(context.value);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const canConfirm = await routeUserHasPermission(actorSupabase, actorUserId, "confirm_grades");
  if (!canConfirm) {
    return jsonError("ليس لديك صلاحية تأكيد الدرجات.", 403);
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

  const result = await confirmGradeEntries(actorSupabase, targetSchoolId, entryIds, actorUserId, branchStudentIds);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, gate: result.gate, error: { message: result.message ?? "تعذر تأكيد الدرجات." } },
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
