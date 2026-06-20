import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import {
  ensureManagedUserProfileLink,
  hashPassword,
  resolveSchoolScopedActorContext,
} from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { jsonError, logRouteError } from "@/lib/route-utils";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateUsername(supabase: any, schoolId: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const bytes = randomBytes(2);
    const digits = String(((bytes[0] * 256 + bytes[1]) % 9000) + 1000);
    const candidate = `t${digits}`;
    const { data } = await supabase
      .from("teachers")
      .select("id")
      .eq("app_username", candidate)
      .eq("school_id", schoolId)
      .maybeSingle();
    if (!data) return candidate;
  }
  const fb = randomBytes(3);
  const n = (fb[0] * 65536 + fb[1] * 256 + fb[2]) % 900000 + 100000;
  return `t${n}`;
}

function generatePassword(): string {
  const bytes = randomBytes(3);
  const n = (bytes[0] * 65536 + bytes[1] * 256 + bytes[2]) % 900000 + 100000;
  return String(n);
}

async function resolveAppAccountContext(
  req: NextRequest,
  schoolId: string | null,
  requestedBranchId?: string | null,
) {
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "إدارة حسابات الأساتذة متاحة للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return {
      ok: false as const,
      status: "status" in context ? context.status : 500,
      message: "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
    };
  }

  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return { ok: false as const, status: branchScope.status, message: branchScope.message };
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const [rateLimited, canManage] = await Promise.all([
    enforceRateLimit(req, {
      namespace: "teachers-app-account",
      windowMs: 60_000,
      maxHits: 30,
      identifier: actorUserId,
    }),
    routeUserHasPermission(actorSupabase, actorUserId, "manage_teachers"),
  ]);

  if (rateLimited) {
    return { ok: false as const, status: 429, message: "تم تجاوز عدد المحاولات المسموح بها.", response: rateLimited };
  }

  if (!canManage) {
    return { ok: false as const, status: 403, message: "ليس لديك صلاحية إدارة حسابات الأساتذة." };
  }

  return {
    ok: true as const,
    value: { actorSupabase, actorUserId, targetSchoolId, branchScope: branchScope.value },
  };
}

/** POST /api/web/teachers/[teacherId]/app-account — create app account */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> },
) {
  const { teacherId } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id : null;
  const requestedBranchId = typeof body?.branch_id === "string" ? body.branch_id : null;

  const ctx = await resolveAppAccountContext(req, schoolId, requestedBranchId);
  if (!ctx.ok) {
    if ("response" in ctx && ctx.response) return ctx.response;
    return jsonError(ctx.message, ctx.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId, branchScope } = ctx.value;

  const { data: teacher, error: fetchError } = await applyBranchScopeToQuery(
    actorSupabase
      .from("teachers")
      .select("id, full_name, employee_id, app_username")
      .eq("id", teacherId)
      .eq("school_id", targetSchoolId)
      .neq("status", "deleted"),
    branchScope,
  ).maybeSingle();

  if (fetchError || !teacher) {
    return jsonError("المعلم غير موجود ضمن المدرسة الحالية.", 404);
  }

  if (teacher.app_username) {
    return jsonError("يوجد حساب تطبيق مرتبط بهذا المعلم مسبقاً.", 409);
  }

  try {
    const username = await generateUsername(actorSupabase, targetSchoolId);
    const password = generatePassword();
    const authEmail = `${username}@schoolapp.local`;

    // 1. Create Supabase auth user via service role
    const serviceSupabase = createServiceSupabaseClient();
    const { data: authData, error: authError } = await serviceSupabase.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: teacher.full_name,
        role: "teacher",
        school_id: targetSchoolId,
      },
    });

    if (authError || !authData?.user) {
      logRouteError("teachers-app-account-create", authError, { teacherId, actorUserId, schoolId: targetSchoolId });
      return jsonError(authError?.message || "تعذر إنشاء مستخدم المصادقة.", 500);
    }

    const authUserId = authData.user.id;

    // 2. Create managed_user_credentials entry
    const { error: credError } = await actorSupabase
      .from("managed_user_credentials")
      .insert({
        auth_user_id: authUserId,
        school_id: targetSchoolId,
        login_identifier: username,
        temporary_password_hash: hashPassword(password),
        has_pending_setup: true,
        password_last_reset_at: new Date().toISOString(),
      });

    if (credError) {
      // Cleanup auth user on failure
      await serviceSupabase.auth.admin.deleteUser(authUserId);
      logRouteError("teachers-app-account-create", credError, { teacherId, actorUserId, schoolId: targetSchoolId });
      return jsonError(credError.message || "تعذر إنشاء بيانات الدخول.", 500);
    }

    // 3. Update teacher record with username, password, auth_user_id
    // TODO(C1-MIGRATION): Remove app_password_plain write once managed_user_credentials
    // is the sole credential store. The password is returned to the caller once
    // at creation time and must not be exposed via list/GET API responses.
    const { data, error } = await applyBranchScopeToQuery(
      actorSupabase
        .from("teachers")
        .update({
          app_username: username,
          app_password_plain: password,
          app_status: "active",
          auth_user_id: authUserId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", teacherId)
        .eq("school_id", targetSchoolId),
      branchScope,
    )
      .select("id, app_username, app_status")
      .maybeSingle();

    if (error || !data) {
      logRouteError("teachers-app-account-create", error, { teacherId, actorUserId, schoolId: targetSchoolId });
      return jsonError(error?.message || "تعذر إنشاء حساب التطبيق.", 500);
    }

    // 4. Create managed user profile link
    await ensureManagedUserProfileLink(actorSupabase, {
      authUserId,
      schoolId: targetSchoolId,
      role: "teacher",
      fullName: teacher.full_name,
      email: username,
      phone: null,
      isActive: true,
      studentId: null,
      teacherId,
      createdBy: actorUserId,
    }).catch((err: unknown) => {
      logRouteError("teachers-app-account-profile-link", err, { teacherId, authUserId });
    });

    const qrData = JSON.stringify({
      app_url: process.env.NEXT_PUBLIC_APP_URL || "https://app.school.edu",
      username,
      password,
      school: targetSchoolId,
    });

    return NextResponse.json({ ok: true, username, password, qrData }, { status: 201 });
  } catch (error) {
    logRouteError("teachers-app-account-create", error, { teacherId, actorUserId, schoolId: targetSchoolId });
    return jsonError("تعذر إنشاء حساب التطبيق.", 500);
  }
}

/** DELETE /api/web/teachers/[teacherId]/app-account — remove app account */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> },
) {
  const { teacherId } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id : null;
  const requestedBranchId = typeof body?.branch_id === "string" ? body.branch_id : null;

  const ctx = await resolveAppAccountContext(req, schoolId, requestedBranchId);
  if (!ctx.ok) {
    if ("response" in ctx && ctx.response) return ctx.response;
    return jsonError(ctx.message, ctx.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId, branchScope } = ctx.value;

  const { data: teacher, error: fetchError } = await applyBranchScopeToQuery(
    actorSupabase
      .from("teachers")
      .select("id, app_username")
      .eq("id", teacherId)
      .eq("school_id", targetSchoolId)
      .neq("status", "deleted"),
    branchScope,
  ).maybeSingle();

  if (fetchError || !teacher) {
    return jsonError("المعلم غير موجود ضمن المدرسة الحالية.", 404);
  }

  try {
    const { error } = await applyBranchScopeToQuery(
      actorSupabase
        .from("teachers")
        .update({
          app_username: null,
          app_password_plain: null,
          app_status: "inactive",
          updated_at: new Date().toISOString(),
        })
        .eq("id", teacherId)
        .eq("school_id", targetSchoolId),
      branchScope,
    );

    if (error) {
      logRouteError("teachers-app-account-delete", error, { teacherId, actorUserId, schoolId: targetSchoolId });
      return jsonError(error.message || "تعذر حذف حساب التطبيق.", 500);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logRouteError("teachers-app-account-delete", error, { teacherId, actorUserId, schoolId: targetSchoolId });
    return jsonError("تعذر حذف حساب التطبيق.", 500);
  }
}

/** PATCH /api/web/teachers/[teacherId]/app-account — reset password or toggle status */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> },
) {
  const { teacherId } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id : null;
  const requestedBranchId = typeof body?.branch_id === "string" ? body.branch_id : null;

  const ctx = await resolveAppAccountContext(req, schoolId, requestedBranchId);
  if (!ctx.ok) {
    if ("response" in ctx && ctx.response) return ctx.response;
    return jsonError(ctx.message, ctx.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId, branchScope } = ctx.value;

  const { data: teacher, error: fetchError } = await applyBranchScopeToQuery(
    actorSupabase
      .from("teachers")
      .select("id, app_username, app_status")
      .eq("id", teacherId)
      .eq("school_id", targetSchoolId)
      .neq("status", "deleted"),
    branchScope,
  ).maybeSingle();

  if (fetchError || !teacher) {
    return jsonError("المعلم غير موجود ضمن المدرسة الحالية.", 404);
  }

  if (!teacher.app_username) {
    return jsonError("لا يوجد حساب تطبيق لهذا المعلم.", 404);
  }

  try {
    const action = typeof body?.action === "string" ? body.action : "reset_password";
    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    let newPassword: string | undefined;

    if (action === "reset_password") {
      newPassword = generatePassword();
      updatePayload.app_password_plain = newPassword;
    } else if (action === "toggle_status") {
      const currentStatus = teacher.app_status as string | null;
      updatePayload.app_status = currentStatus === "active" ? "suspended" : "active";
    } else if (action === "set_status" && typeof body?.app_status === "string") {
      const validStatuses = ["active", "inactive", "suspended"];
      if (!validStatuses.includes(body.app_status)) {
        return jsonError("حالة الحساب غير صالحة.", 400);
      }
      updatePayload.app_status = body.app_status;
    } else {
      return jsonError("الإجراء المطلوب غير معروف.", 400);
    }

    const { data, error } = await applyBranchScopeToQuery(
      actorSupabase
        .from("teachers")
        .update(updatePayload)
        .eq("id", teacherId)
        .eq("school_id", targetSchoolId),
      branchScope,
    )
      .select("id, app_username, app_status")
      .maybeSingle();

    if (error || !data) {
      logRouteError("teachers-app-account-patch", error, { teacherId, actorUserId, schoolId: targetSchoolId });
      return jsonError(error?.message || "تعذر تحديث حساب التطبيق.", 500);
    }

    return NextResponse.json({
      ok: true,
      app_status: data.app_status,
      ...(newPassword ? { password: newPassword } : {}),
    });
  } catch (error) {
    logRouteError("teachers-app-account-patch", error, { teacherId, actorUserId, schoolId: targetSchoolId });
    return jsonError("تعذر تحديث حساب التطبيق.", 500);
  }
}
