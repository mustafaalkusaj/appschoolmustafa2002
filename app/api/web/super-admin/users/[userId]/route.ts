import { NextRequest, NextResponse } from "next/server";

import { detectAdminInfrastructure } from "@/lib/admin-infrastructure";
import { resolveScopedUserConfig, ScopedUserConfigError } from "@/lib/authorization/scoped-user-config";
import { resolveSuperAdminActorContext, updateSuperAdminUserProfile } from "@/lib/super-admin-server";
import { normalizeJobTitle } from "@/lib/users/job-title";
import { normalizePermissions, normalizeUserRole, type Permission } from "@/types/roles";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

type UpdateUserBody = {
  full_name?: unknown;
  job_title?: unknown;
  email?: unknown;
  role?: unknown;
  school_id?: unknown;
  branch_id?: unknown;
  phone?: unknown;
  is_active?: unknown;
  scope_level?: unknown;
  is_single_page_user?: unknown;
  allowed_pages?: unknown;
  permissions_version?: unknown;
  custom_permissions?: unknown;
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
  }

  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return jsonError("معرف المستخدم غير صالح.", 400);
  }

  const body = (await req.json().catch(() => null)) as UpdateUserBody | null;
  const role = normalizeUserRole(typeof body?.role === "string" ? body.role : null);
  const schoolId = typeof body?.school_id === "string" && body.school_id.trim() ? body.school_id.trim() : null;
  const branchId = typeof body?.branch_id === "string" && body.branch_id.trim() ? body.branch_id.trim() : null;
  const isActive = body?.is_active ?? true;

  if (typeof isActive !== "boolean") {
    return jsonError("حالة تفعيل المستخدم غير صالحة.", 400);
  }

  if (role !== "super_admin" && !schoolId) {
    return jsonError("ربط المدرسة مطلوب لهذا النوع من المستخدمين.", 400);
  }

  if (schoolId) {
    const { data: school, error: schoolError } = await context.value.dataSupabase
      .from("schools")
      .select("id")
      .eq("id", schoolId)
      .maybeSingle();

    if (schoolError || !school?.id) {
      return jsonError("المدرسة المحددة غير صالحة.", 400);
    }
  }

  const customPermissions = Array.isArray(body?.custom_permissions)
    ? normalizePermissions(
        body.custom_permissions.filter((item): item is string => typeof item === "string" && item.trim().length > 0),
        role,
      ) as Permission[]
    : [];

  const effectivePermissions = customPermissions.length > 0 ? customPermissions : normalizePermissions([], role);

  let scopedConfig;
  try {
    scopedConfig = resolveScopedUserConfig({
      role,
      schoolId,
      branchId,
      scopeLevel: typeof body?.scope_level === "string" ? body.scope_level : null,
      isSinglePageUser: body?.is_single_page_user === true,
      allowedPages: Array.isArray(body?.allowed_pages)
        ? body.allowed_pages.filter((page): page is string => typeof page === "string" && page.trim().length > 0)
        : [],
      permissions: effectivePermissions,
    });
  } catch (error) {
    const message = error instanceof ScopedUserConfigError ? error.message : "تعذر التحقق من نطاق المستخدم.";
    return jsonError(message, 400);
  }

  if (scopedConfig.branchId && scopedConfig.schoolId) {
    const { data: branch, error: branchError } = await context.value.dataSupabase
      .from("branches")
      .select("id")
      .eq("id", scopedConfig.branchId)
      .eq("school_id", scopedConfig.schoolId)
      .maybeSingle();

    if (branchError || !branch?.id) {
      return jsonError("الفرع المحدد غير صالح لهذه المدرسة.", 400);
    }
  }

  try {
    const user = await updateSuperAdminUserProfile(context.value.dataSupabase, normalizedUserId, {
      full_name: typeof body?.full_name === "string" && body.full_name.trim() ? body.full_name.trim() : null,
      job_title: normalizeJobTitle(body?.job_title),
      email: typeof body?.email === "string" && body.email.trim() ? body.email.trim().toLowerCase() : null,
      role,
      school_id: scopedConfig.schoolId,
      branch_id: scopedConfig.branchId,
      default_branch_id: scopedConfig.defaultBranchId,
      phone: typeof body?.phone === "string" && body.phone.trim() ? body.phone.trim() : null,
      is_active: isActive,
      custom_permissions: customPermissions.length > 0 ? customPermissions : null,
      scope_level: scopedConfig.scopeLevel,
      allowed_module: scopedConfig.allowedModule,
      is_single_page_user: scopedConfig.isSinglePageUser,
      hierarchy_level: null,
      permissions_version:
        typeof body?.permissions_version === "number" && Number.isFinite(body.permissions_version)
          ? body.permissions_version + 1
          : 2,
      allowed_pages: scopedConfig.allowedPages,
      page_access_grants: scopedConfig.pageAccessGrants,
    });

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "تعذر تحديث بيانات المستخدم.",
      500,
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
  }

  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return jsonError("معرف المستخدم غير صالح.", 400);
  }

  if (normalizedUserId === context.value.actorUserId) {
    return jsonError("لا يمكن أرشفة حساب المدير العام الحالي أثناء استخدامه.", 400);
  }

  const infrastructure = await detectAdminInfrastructure(context.value.dataSupabase);
  if (!infrastructure.softDeleteUsers) {
    return jsonError(
      "أرشفة المستخدمين تتطلب تشغيل admin_infrastructure.sql لإضافة deleted_at و deleted_by إلى جدول user_profiles.",
      400,
    );
  }

  const { data: user, error } = await context.value.dataSupabase
    .from("user_profiles")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: context.value.actorUserId,
      is_active: false,
    })
    .eq("id", normalizedUserId)
    .select("id, full_name, email")
    .maybeSingle();

  if (error) {
    return jsonError(error.message || "تعذر أرشفة المستخدم.", 500);
  }

  if (!user) {
    return jsonError("المستخدم المطلوب غير موجود.", 404);
  }

  return NextResponse.json({
    ok: true,
    user,
  });
}
