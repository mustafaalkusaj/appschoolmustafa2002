import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
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
