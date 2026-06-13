import { NextRequest, NextResponse } from "next/server";

import { teacherAttendancePatchSchema, schoolScopedDeleteSchema } from "@/lib/api-schemas";
import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { jsonError, jsonValidationError, logRouteError } from "@/lib/route-utils";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = teacherAttendancePatchSchema.safeParse(body);

  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  const context = await resolveSchoolScopedActorContext(
    parsed.data.school_id,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "تعديل حضور الأساتذة متاح ضمن نطاق المدرسة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const branchScope = resolveBranchScope(context.value);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const [rateLimited, canEdit] = await Promise.all([
    enforceRateLimit(req, {
      namespace: "teacher-attendance",
      windowMs: 60_000,
      maxHits: 60,
      identifier: actorUserId,
    }),
    routeUserHasPermission(actorSupabase, actorUserId, "edit_teacher_attendance"),
  ]);

  if (rateLimited) return rateLimited;
  if (!canEdit) {
    return jsonError("ليس لديك صلاحية تعديل حضور الأساتذة.", 403);
  }

  try {
    const { data: existing, error: fetchError } = await applyBranchScopeToQuery(
      actorSupabase
        .from("teacher_attendance")
        .select("id")
        .eq("id", id)
        .eq("school_id", targetSchoolId),
      branchScope.value,
    ).maybeSingle();

    if (fetchError || !existing?.id) {
      return jsonError("سجل الحضور المطلوب غير موجود.", 404);
    }

    const updatePayload: Record<string, unknown> = {};
    if (parsed.data.status !== undefined) updatePayload.status = parsed.data.status;
    if ("check_in_time" in parsed.data) updatePayload.check_in_time = parsed.data.check_in_time ?? null;
    if ("check_out_time" in parsed.data) updatePayload.check_out_time = parsed.data.check_out_time ?? null;
    if ("notes" in parsed.data) updatePayload.notes = parsed.data.notes ?? null;

    const { data: updated, error } = await applyBranchScopeToQuery(
      actorSupabase
        .from("teacher_attendance")
        .update(updatePayload)
        .eq("id", id)
        .eq("school_id", targetSchoolId),
      branchScope.value,
    )
      .select("id, teacher_id, attendance_date, status, check_in_time, check_out_time, notes")
      .single();

    if (error || !updated) {
      throw error ?? new Error("Teacher attendance update failed");
    }

    return NextResponse.json({ ok: true, record: updated });
  } catch (error) {
    logRouteError("teacher-attendance-patch", error, {
      actorUserId,
      schoolId: targetSchoolId,
      id,
      requestId: req.headers.get("x-request-id"),
    });
    return jsonError("تعذر تحديث سجل الحضور. حاول مرة أخرى بعد قليل.", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schoolScopedDeleteSchema.safeParse(body);

  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  const context = await resolveSchoolScopedActorContext(
    parsed.data.school_id,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "حذف حضور الأساتذة متاح ضمن نطاق المدرسة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const branchScope = resolveBranchScope(context.value);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const [rateLimited, canEdit] = await Promise.all([
    enforceRateLimit(req, {
      namespace: "teacher-attendance",
      windowMs: 60_000,
      maxHits: 60,
      identifier: actorUserId,
    }),
    routeUserHasPermission(actorSupabase, actorUserId, "edit_teacher_attendance"),
  ]);

  if (rateLimited) return rateLimited;
  if (!canEdit) {
    return jsonError("ليس لديك صلاحية حذف سجلات حضور الأساتذة.", 403);
  }

  try {
    const { data: deleted, error } = await applyBranchScopeToQuery(
      actorSupabase
        .from("teacher_attendance")
        .delete()
        .eq("id", id)
        .eq("school_id", targetSchoolId),
      branchScope.value,
    )
      .select("id")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!deleted?.id) {
      return jsonError("سجل الحضور المطلوب غير موجود.", 404);
    }

    return NextResponse.json({ ok: true, deletedId: deleted.id });
  } catch (error) {
    logRouteError("teacher-attendance-delete", error, {
      actorUserId,
      schoolId: targetSchoolId,
      id,
      requestId: req.headers.get("x-request-id"),
    });
    return jsonError("تعذر حذف سجل الحضور. حاول مرة أخرى بعد قليل.", 500);
  }
}
