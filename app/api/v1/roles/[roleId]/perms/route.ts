import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { loadDeepPermissionsForUser } from "@/lib/authorization/deep-permissions";
import { effectivePermissionKeys, isSuperAdminOnlyPermissionKey } from "@/lib/authorization/permission-ceiling";
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

  const requestedIds = Array.from(new Set(parsed.data.permissionIds));
  const isSuperAdmin = context.value.actorRole === "super_admin";

  if (requestedIds.length > 0) {
    // (a) Allowlist by existence: every id must be a real permission in the
    // global perm_definitions catalog. Reject unknown/forged ids outright.
    const { data: defs, error: defsError } = await service
      .from("perm_definitions")
      .select("id, key")
      .in("id", requestedIds);

    if (defsError) return jsonError("تعذر التحقق من الصلاحيات", 500);

    const defById = new Map((defs ?? []).map((d) => [d.id as string, d.key as string]));
    if (defById.size !== requestedIds.length) {
      return jsonError("صلاحية غير معروفة ضمن الطلب", 400);
    }

    // (b)/(c) Delegation guard: a non-super_admin actor may only grant
    // permissions they themselves effectively hold, and may never grant the
    // authorization-control keys (manage_roles / change_role / scope_all).
    if (!isSuperAdmin) {
      const { permMap } = await loadDeepPermissionsForUser(
        service,
        context.value.actorUserId,
        targetSchoolId,
      );
      const actorKeys = effectivePermissionKeys(permMap);

      for (const id of requestedIds) {
        const key = defById.get(id)!;
        if (isSuperAdminOnlyPermissionKey(key)) {
          return jsonError("لا يمكنك منح هذه الصلاحية عالية الامتياز", 403);
        }
        if (!actorKeys.has(key)) {
          return jsonError("لا يمكنك منح صلاحية لا تملكها", 403);
        }
      }
    }
  }

  // Delete existing assignments then insert new ones
  const { error: deleteError } = await service
    .from("role_perm_assignments")
    .delete()
    .eq("role_id", roleId);

  if (deleteError) return jsonError("تعذر تحديث الصلاحيات", 500);

  if (requestedIds.length > 0) {
    const rows = requestedIds.map((permId) => ({
      role_id: roleId,
      permission_id: permId,
    }));

    const { error: insertError } = await service
      .from("role_perm_assignments")
      .insert(rows);

    if (insertError) return jsonError("تعذر حفظ الصلاحيات", 500);
  }

  return NextResponse.json({ ok: true, count: requestedIds.length });
}
