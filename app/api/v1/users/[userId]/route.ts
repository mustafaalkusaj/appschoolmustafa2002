import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { jsonError } from "@/lib/route-utils";

const patchUserSchema = z.object({
  avatar_url: z.string().url().nullable().optional(),
  school_role_id: z.string().uuid().nullable().optional(),
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

  return NextResponse.json({ ok: true });
}
