import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { loadDeepPermissionsForUser } from "@/lib/authorization/deep-permissions";
import { effectivePermissionKeys, isSuperAdminOnlyPermissionKey } from "@/lib/authorization/permission-ceiling";
import { jsonError } from "@/lib/route-utils";

const updateOverridesSchema = z.object({
  overrides: z.array(
    z.object({
      permission_id: z.string().uuid(),
      is_granted: z.boolean(),
      reason: z.string().max(500).optional(),
    }),
  ),
  /** Permission IDs to revert to "inherit" (delete override) */
  reverted: z.array(z.string().uuid()).optional(),
});

/** GET /api/v1/users/[userId]/perm-overrides — current overrides for a user */
export async function GET(
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

  const { targetSchoolId } = context.value;
  const service = createServiceSupabaseClient();

  // Cross-tenant guard: only read overrides for users within the actor's school.
  const { data: targetUser } = await service
    .from("user_profiles")
    .select("id")
    .eq("id", userId)
    .eq("school_id", targetSchoolId)
    .maybeSingle();
  if (!targetUser) return jsonError("المستخدم غير موجود أو لا تملك صلاحية الوصول إليه", 404);

  const { data, error } = await service
    .from("user_perm_overrides")
    .select("permission_id, is_granted, reason, granted_by, created_at, perm_definitions(key)")
    .eq("user_id", userId);

  if (error) return jsonError("تعذر تحميل الاستثناءات", 500);

  return NextResponse.json({ ok: true, overrides: data ?? [] });
}

/** PUT /api/v1/users/[userId]/perm-overrides — upsert overrides, delete reverted */
export async function PUT(
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
  const parsed = updateOverridesSchema.safeParse(body);
  if (!parsed.success) return jsonError("بيانات غير صحيحة", 400);

  const { actorUserId, targetSchoolId } = context.value;
  const service = createServiceSupabaseClient();

  // Cross-tenant guard: the target user MUST belong to the actor's school.
  // Without this, an admin of school A could write perm-overrides for a user in school B
  // (service-role bypasses RLS, so the check must be explicit here).
  const { data: targetUser } = await service
    .from("user_profiles")
    .select("id")
    .eq("id", userId)
    .eq("school_id", targetSchoolId)
    .maybeSingle();
  if (!targetUser) return jsonError("المستخدم غير موجود أو لا تملك صلاحية تعديله", 404);

  // Self-guard: an admin must not alter their own permission overrides.
  if (userId === actorUserId) return jsonError("لا يمكنك تعديل استثناءات صلاحياتك الخاصة", 403);

  const { overrides, reverted = [] } = parsed.data;

  // Ceiling guard: an admin must not grant a permission they do not themselves
  // hold, nor any authorization-control key — mirrors the delegation guard in
  // app/api/v1/roles/[roleId]/perms/route.ts. Only applies to grants
  // (is_granted: true); revokes can never be an escalation. super_admin is exempt.
  const grantedOverrides = overrides.filter((o) => o.is_granted);
  const isSuperAdmin = context.value.actorRole === "super_admin";

  if (grantedOverrides.length > 0 && !isSuperAdmin) {
    const grantedIds = Array.from(new Set(grantedOverrides.map((o) => o.permission_id)));

    // (a) Allowlist by existence: every granted id must be a real permission in
    // the global perm_definitions catalog. Reject unknown/forged ids outright.
    const { data: defs, error: defsError } = await service
      .from("perm_definitions")
      .select("id, key")
      .in("id", grantedIds);

    if (defsError) return jsonError("تعذر التحقق من الصلاحيات", 500);

    const defById = new Map((defs ?? []).map((d) => [d.id as string, d.key as string]));
    if (defById.size !== grantedIds.length) {
      return jsonError("صلاحية غير معروفة ضمن الطلب", 400);
    }

    // (b)/(c) Delegation guard: the actor may only grant permissions they
    // effectively hold, and may never grant authorization-control keys.
    const { permMap } = await loadDeepPermissionsForUser(
      service,
      actorUserId,
      targetSchoolId,
    );
    const actorKeys = effectivePermissionKeys(permMap);

    for (const id of grantedIds) {
      const key = defById.get(id)!;
      if (isSuperAdminOnlyPermissionKey(key)) {
        return jsonError("لا يمكنك منح هذه الصلاحية عالية الامتياز", 403);
      }
      if (!actorKeys.has(key)) {
        return jsonError("لا يمكنك منح صلاحية لا تملكها", 403);
      }
    }
  }

  // Delete reverted (inherit) overrides
  if (reverted.length > 0) {
    await service
      .from("user_perm_overrides")
      .delete()
      .eq("user_id", userId)
      .in("permission_id", reverted);
  }

  // Upsert grant/revoke overrides
  if (overrides.length > 0) {
    const rows = overrides.map((o) => ({
      user_id: userId,
      permission_id: o.permission_id,
      is_granted: o.is_granted,
      reason: o.reason ?? null,
      granted_by: actorUserId,
    }));

    const { error } = await service
      .from("user_perm_overrides")
      .upsert(rows, { onConflict: "user_id,permission_id" });

    if (error) return jsonError("تعذر حفظ الاستثناءات", 500);
  }

  return NextResponse.json({ ok: true });
}
