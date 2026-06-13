import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import {
  updateGradeEntry,
  deleteGradeEntry,
} from "@/lib/grades/grade-entries-server";
import type { GradeEntryUpdate, GradeStatus } from "@/lib/grades/types";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeScore(value: unknown): number | null | undefined {
  // undefined means "not present in the patch" — we preserve the field distinction
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "number" && isFinite(value) && value >= 0) return value;
  if (typeof value === "string") {
    const n = parseFloat(value);
    if (isFinite(n) && n >= 0) return n;
  }
  return null;
}

function normalizeBool(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  return undefined;
}

async function resolveContext(
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

// PATCH — update an existing grade entry (score, max_score, grade_type, note, status)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: entryId } = await params;

  if (!entryId || typeof entryId !== "string" || entryId.trim().length === 0) {
    return jsonError("معرّف سجل الدرجة مطلوب.", 400);
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return jsonError("جسم الطلب غير صالح.", 400);
  }

  const schoolId = normalizeString(body.school_id);
  if (!schoolId) {
    return jsonError("school_id مطلوب في جسم الطلب.", 400);
  }

  const context = await resolveContext(req, schoolId, "grades-write", 60);
  if (!context.ok) {
    return context.response;
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const branchScopePatch = resolveBranchScope(context.value);
  if (!branchScopePatch.ok) {
    return jsonError(branchScopePatch.message, branchScopePatch.status);
  }

  const canEnter = await routeUserHasPermission(actorSupabase, actorUserId, "enter_grades");
  if (!canEnter) {
    return jsonError("ليس لديك صلاحية تعديل الدرجات.", 403);
  }

  // Verify entry's student belongs to this branch
  if (branchScopePatch.value.branchIds.length > 0) {
    const { data: entryCheck } = await actorSupabase
      .from("grade_entries")
      .select("student_id")
      .eq("id", entryId.trim())
      .eq("school_id", targetSchoolId)
      .maybeSingle();
    const studentId = (entryCheck as Record<string, unknown> | null)?.student_id;
    if (!studentId) {
      return jsonError("سجل الدرجة غير موجود.", 404);
    }
    const { data: studentCheck } = await applyBranchScopeToQuery(
      actorSupabase.from("students").select("id").eq("id", studentId as string),
      branchScopePatch.value,
    ).limit(1);
    if (!studentCheck || studentCheck.length === 0) {
      return jsonError("لا يمكنك تعديل درجات طلاب من فرع آخر.", 403);
    }
  }

  // Build a typed update patch — only include fields explicitly present in the body
  const updates: GradeEntryUpdate = {};

  if ("score" in body) {
    const val = normalizeScore(body.score);
    if (val !== undefined) updates.score = val ?? undefined;
  }

  if ("max_score" in body) {
    const val = normalizeScore(body.max_score);
    if (val !== undefined) updates.max_score = val ?? undefined;
  }

  if ("grade_type_id" in body) {
    updates.grade_type_id = normalizeString(body.grade_type_id);
  }

  if ("grade_type_name" in body) {
    updates.grade_type_name = normalizeString(body.grade_type_name);
  }

  if ("note" in body) {
    updates.note = typeof body.note === "string" ? body.note.trim() || null : null;
  }

  if ("status" in body) {
    const s = normalizeString(body.status);
    if (s === "draft" || s === "confirmed" || s === "locked") {
      updates.status = s as GradeStatus;
    }
  }

  if ("send_notification" in body) {
    const val = normalizeBool(body.send_notification);
    if (val !== undefined) updates.send_notification = val;
  }

  // Validate: score cannot exceed max_score
  if (updates.score !== undefined && updates.max_score !== undefined) {
    if (updates.score > updates.max_score) {
      return jsonError("الدرجة المحصلة لا يمكن أن تتجاوز الدرجة الكاملة.", 400);
    }
  }

  if (Object.keys(updates).length === 0) {
    return jsonError("لم يُرسل أي حقل للتحديث.", 400);
  }

  const reason = normalizeString(body.reason) ?? undefined;

  const result = await updateGradeEntry(
    actorSupabase,
    targetSchoolId,
    entryId.trim(),
    updates,
    actorUserId,
    reason,
  );

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, gate: result.gate, error: { message: result.message ?? "تعذر تحديث الدرجة." } },
      { status: result.gate.code === "missing_table" ? 503 : 422 },
    );
  }

  return NextResponse.json({
    ok: true,
    gate: result.gate,
    message: result.message,
  });
}

// DELETE — delete a grade entry (only allowed for draft-status entries)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: entryId } = await params;

  if (!entryId || typeof entryId !== "string" || entryId.trim().length === 0) {
    return jsonError("معرّف سجل الدرجة مطلوب.", 400);
  }

  const schoolId = req.nextUrl.searchParams.get("schoolId");
  if (!schoolId) {
    return jsonError("schoolId مطلوب.", 400);
  }

  const context = await resolveContext(req, schoolId, "grades-write", 30);
  if (!context.ok) {
    return context.response;
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const branchScopeDelete = resolveBranchScope(context.value);
  if (!branchScopeDelete.ok) {
    return jsonError(branchScopeDelete.message, branchScopeDelete.status);
  }

  const canEnter = await routeUserHasPermission(actorSupabase, actorUserId, "enter_grades");
  if (!canEnter) {
    return jsonError("ليس لديك صلاحية حذف الدرجات.", 403);
  }

  // Verify entry's student belongs to this branch
  if (branchScopeDelete.value.branchIds.length > 0) {
    const { data: entryCheck } = await actorSupabase
      .from("grade_entries")
      .select("student_id")
      .eq("id", entryId.trim())
      .eq("school_id", targetSchoolId)
      .maybeSingle();
    const studentId = (entryCheck as Record<string, unknown> | null)?.student_id;
    if (!studentId) {
      return jsonError("سجل الدرجة غير موجود.", 404);
    }
    const { data: studentCheck } = await applyBranchScopeToQuery(
      actorSupabase.from("students").select("id").eq("id", studentId as string),
      branchScopeDelete.value,
    ).limit(1);
    if (!studentCheck || studentCheck.length === 0) {
      return jsonError("لا يمكنك حذف درجات طلاب من فرع آخر.", 403);
    }
  }

  const result = await deleteGradeEntry(
    actorSupabase,
    targetSchoolId,
    entryId.trim(),
    actorUserId,
  );

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, gate: result.gate, error: { message: result.message ?? "تعذر حذف الدرجة." } },
      { status: result.gate.code === "missing_table" ? 503 : 422 },
    );
  }

  return NextResponse.json({
    ok: true,
    gate: result.gate,
    message: result.message,
  });
}
