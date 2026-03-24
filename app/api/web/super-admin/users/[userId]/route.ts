import { NextRequest, NextResponse } from "next/server";

import { detectAdminInfrastructure } from "@/lib/admin-infrastructure";
import { resolveSuperAdminActorContext, updateSuperAdminUserProfile } from "@/lib/super-admin-server";
import { normalizePermissions, normalizeUserRole, type Permission } from "@/types/roles";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

type UpdateUserBody = {
  full_name?: unknown;
  email?: unknown;
  role?: unknown;
  school_id?: unknown;
  phone?: unknown;
  is_active?: unknown;
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
  const isActive = body?.is_active ?? true;

  if (typeof isActive !== "boolean") {
    return jsonError("حالة تفعيل المستخدم غير صالحة.", 400);
  }

  if (role !== "super_admin" && !schoolId) {
    return jsonError("ربط المدرسة مطلوب لهذا النوع من المستخدمين.", 400);
  }

  if (schoolId) {
    const { data: school, error: schoolError } = await context.value.actorSupabase
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

  try {
    const user = await updateSuperAdminUserProfile(context.value.actorSupabase, normalizedUserId, {
      full_name: typeof body?.full_name === "string" && body.full_name.trim() ? body.full_name.trim() : null,
      email: typeof body?.email === "string" && body.email.trim() ? body.email.trim().toLowerCase() : null,
      role,
      school_id: role === "super_admin" ? null : schoolId,
      phone: typeof body?.phone === "string" && body.phone.trim() ? body.phone.trim() : null,
      is_active: isActive,
      custom_permissions: customPermissions.length > 0 ? customPermissions : null,
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

  const infrastructure = await detectAdminInfrastructure(context.value.actorSupabase);
  if (!infrastructure.softDeleteUsers) {
    return jsonError(
      "أرشفة المستخدمين تتطلب تشغيل admin_infrastructure.sql لإضافة deleted_at و deleted_by إلى جدول user_profiles.",
      400,
    );
  }

  const { data: user, error } = await context.value.actorSupabase
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
