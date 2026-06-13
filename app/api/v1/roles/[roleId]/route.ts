import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { jsonError } from "@/lib/route-utils";

const patchRoleSchema = z.object({
  name_ar: z.string().min(2).max(100).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).nullable().optional(),
  dashboard_sections: z.record(z.string(), z.boolean()).optional(),
});

export async function GET(
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

  const { targetSchoolId } = context.value;
  const service = createServiceSupabaseClient();

  const { data: role, error } = await service
    .from("school_roles")
    .select("id, key, name_ar, is_system, created_at, dashboard_sections")
    .eq("id", roleId)
    .eq("school_id", targetSchoolId)
    .maybeSingle();

  if (error) return jsonError("تعذر تحميل الدور", 500);
  if (!role) return jsonError("الدور غير موجود", 404);

  const { data: assignments } = await service
    .from("role_perm_assignments")
    .select("permission_id")
    .eq("role_id", roleId);

  const permissionIds = (assignments ?? []).map((r) => r.permission_id as string);

  return NextResponse.json({ ok: true, role, permissionIds });
}

export async function DELETE(
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

  const { targetSchoolId } = context.value;
  const service = createServiceSupabaseClient();

  const { data: role } = await service
    .from("school_roles")
    .select("is_system")
    .eq("id", roleId)
    .eq("school_id", targetSchoolId)
    .maybeSingle();

  if (!role) return jsonError("الدور غير موجود", 404);
  if (role.is_system) return jsonError("لا يمكن حذف الأدوار الافتراضية للنظام", 403);

  const { error } = await service
    .from("school_roles")
    .delete()
    .eq("id", roleId)
    .eq("school_id", targetSchoolId);

  if (error) return jsonError("تعذر حذف الدور", 500);

  return NextResponse.json({ ok: true });
}

export async function PATCH(
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
  const parsed = patchRoleSchema.safeParse(body);
  if (!parsed.success) return jsonError("بيانات غير صحيحة", 400);

  const { targetSchoolId } = context.value;
  const service = createServiceSupabaseClient();

  const updates: Record<string, unknown> = {};
  if (parsed.data.name_ar !== undefined) updates.name_ar = parsed.data.name_ar;
  if (parsed.data.color !== undefined) updates.color = parsed.data.color;
  if (parsed.data.dashboard_sections !== undefined) updates.dashboard_sections = parsed.data.dashboard_sections;
  if (Object.keys(updates).length === 0) return jsonError("لا يوجد شيء للتحديث", 400);

  const { data, error } = await service
    .from("school_roles")
    .update(updates)
    .eq("id", roleId)
    .eq("school_id", targetSchoolId)
    .select("id, key, name_ar, is_system, color, created_at, dashboard_sections")
    .single();

  if (error) return jsonError("تعذر تحديث الدور", 500);

  return NextResponse.json({ ok: true, role: data });
}
