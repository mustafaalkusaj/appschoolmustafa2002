import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { loadDeepPermissionsForUser } from "@/lib/authorization/deep-permissions";
import { effectivePermissionKeys } from "@/lib/authorization/permission-ceiling";
import { jsonError } from "@/lib/route-utils";
import { writeAuditLog } from "@/lib/audit/audit-log";

const patchUserSchema = z.object({
  avatar_url: z.string().url().nullable().optional(),
  school_role_id: z.string().uuid().nullable().optional(),
  full_name: z.string().min(2).max(100).optional(),
  phone: z.string().max(30).nullable().optional(),
  job_title: z.string().max(100).nullable().optional(),
  is_active: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const context = await resolveSchoolScopedActorContext(
    null,
    { allowedRoles: ["admin", "super_admin"], roleDeniedMessage: "غير مصرح" },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "غير مصرح", "status" in context ? context.status : 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = patchUserSchema.safeParse(body);
  if (!parsed.success) return jsonError("بيانات غير صحيحة", 400);

  const updates: Record<string, unknown> = {};
  if (parsed.data.avatar_url !== undefined) updates.avatar_url = parsed.data.avatar_url;
  if (parsed.data.full_name !== undefined) updates.full_name = parsed.data.full_name.trim();
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
  if (parsed.data.job_title !== undefined) updates.job_title = parsed.data.job_title;
  if (parsed.data.is_active !== undefined) updates.is_active = parsed.data.is_active;

  const { targetSchoolId, actorUserId } = context.value;
  const service = createServiceSupabaseClient();

  // Self-guard: an admin must not change their own role assignment via this endpoint
  // (prevents self-lockout and self-role manipulation).
  if (parsed.data.school_role_id !== undefined && userId === actorUserId) {
    return jsonError("لا يمكنك تعديل دورك الخاص", 403);
  }

  if (parsed.data.school_role_id !== undefined) {
    // verify role belongs to school (null means unassign, which is always valid)
    if (parsed.data.school_role_id !== null) {
      const { data: roleCheck } = await service
        .from("school_roles")
        .select("id")
        .eq("id", parsed.data.school_role_id)
        .eq("school_id", targetSchoolId)
        .maybeSingle();
      if (!roleCheck) return jsonError("الدور المحدد غير موجود", 404);

      // Ceiling guard: an admin must not assign a role more privileged than
      // themselves. The target role's permission key set must be a SUBSET of the
      // actor's effective keys. super_admin is exempt (holds every key).
      if (context.value.actorRole !== "super_admin") {
        const { data: roleAssignments, error: roleAssignError } = await service
          .from("role_perm_assignments")
          .select("perm_definitions(key)")
          .eq("role_id", parsed.data.school_role_id);

        if (roleAssignError) return jsonError("تعذر التحقق من صلاحيات الدور", 500);

        const targetRoleKeys = (roleAssignments ?? [])
          .map((r) => (r.perm_definitions as unknown as { key: string } | null)?.key)
          .filter((k): k is string => Boolean(k));

        const { permMap } = await loadDeepPermissionsForUser(
          service,
          actorUserId,
          targetSchoolId,
        );
        const actorKeys = effectivePermissionKeys(permMap);

        const hasUnheldKey = targetRoleKeys.some((key) => !actorKeys.has(key));
        if (hasUnheldKey) {
          return jsonError("لا يمكنك إسناد دور يفوق صلاحياتك", 403);
        }
      }
    }
    updates.school_role_id = parsed.data.school_role_id;
  }

  if (Object.keys(updates).length === 0) return jsonError("لا يوجد شيء للتحديث", 400);

  const { data: updated, error } = await service
    .from("user_profiles")
    .update(updates)
    .eq("id", userId)
    .eq("school_id", targetSchoolId)
    .select("id")
    .maybeSingle();

  if (error) return jsonError("تعذر تحديث بيانات المستخدم", 500);
  if (!updated) return jsonError("المستخدم غير موجود أو لا تملك صلاحية تعديله", 404);

  writeAuditLog({
    actor_user_id: actorUserId,
    action_type: "UPDATE",
    entity_type: "user",
    entity_id: userId,
    summary: `تعديل بيانات المستخدم`,
    school_id: targetSchoolId,
    metadata: updates,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const context = await resolveSchoolScopedActorContext(
    null,
    { allowedRoles: ["admin", "super_admin"], roleDeniedMessage: "غير مصرح" },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "غير مصرح", "status" in context ? context.status : 403);
  }

  const { targetSchoolId, actorUserId } = context.value;

  if (userId === actorUserId) {
    return jsonError("لا يمكنك حذف حسابك الخاص", 403);
  }

  const service = createServiceSupabaseClient();

  const { data: user } = await service
    .from("user_profiles")
    .select("id")
    .eq("id", userId)
    .eq("school_id", targetSchoolId)
    .maybeSingle();

  if (!user) return jsonError("المستخدم غير موجود", 404);

  const { error: delError } = await service
    .from("user_profiles")
    .delete()
    .eq("id", userId)
    .eq("school_id", targetSchoolId);

  if (delError) return jsonError("تعذر حذف المستخدم", 500);

  await service.auth.admin.deleteUser(userId).catch(() => {});

  writeAuditLog({
    actor_user_id: actorUserId,
    action_type: "DELETE",
    entity_type: "user",
    entity_id: userId,
    summary: `حذف مستخدم`,
    school_id: targetSchoolId,
  });

  return NextResponse.json({ ok: true });
}
