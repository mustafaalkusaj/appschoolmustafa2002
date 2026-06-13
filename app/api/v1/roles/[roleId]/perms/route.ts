import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { jsonError } from "@/lib/route-utils";

const updatePermsSchema = z.object({
  permissionIds: z.array(z.string().uuid()),
});

/** PUT /api/v1/roles/[roleId]/perms — replace all permission assignments for a role */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ roleId: string }> },
) {
  const { roleId } = await params;
  const context = await resolveSchoolScopedActorContext(
    null,
    { allowedRoles: ["admin", "super_admin"], roleDeniedMessage: "غير مصرح" },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "غير مصرح", "status" in context ? context.status : 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = updatePermsSchema.safeParse(body);
  if (!parsed.success) return jsonError("بيانات غير صحيحة", 400);

  const { targetSchoolId } = context.value;
  const service = createServiceSupabaseClient();

  // Verify role belongs to this school
  const { data: role } = await service
    .from("school_roles")
    .select("id")
    .eq("id", roleId)
    .eq("school_id", targetSchoolId)
    .maybeSingle();

  if (!role) return jsonError("الدور غير موجود", 404);

  // Delete existing assignments then insert new ones
  const { error: deleteError } = await service
    .from("role_perm_assignments")
    .delete()
    .eq("role_id", roleId);

  if (deleteError) return jsonError("تعذر تحديث الصلاحيات", 500);

  if (parsed.data.permissionIds.length > 0) {
    const rows = parsed.data.permissionIds.map((permId) => ({
      role_id: roleId,
      permission_id: permId,
    }));

    const { error: insertError } = await service
      .from("role_perm_assignments")
      .insert(rows);

    if (insertError) return jsonError("تعذر حفظ الصلاحيات", 500);
  }

  return NextResponse.json({ ok: true, count: parsed.data.permissionIds.length });
}
