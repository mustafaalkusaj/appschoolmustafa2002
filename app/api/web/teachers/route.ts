import { NextRequest, NextResponse } from "next/server";

import { applyBranchScopeToQuery, resolveBranchIdForWrite, resolveBranchScope } from "@/lib/branch-scope";
import {
  resolveSchoolScopedActorContext,
  generateManagedLoginIdentifier,
  generateTemporaryPassword,
  hashPassword,
  buildManagedAuthIdentityPayload,
  syncManagedUserAccountState,
} from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { jsonError, logRouteError } from "@/lib/route-utils";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

async function autoCreateTeacherAppAccount(
  actorSupabase: ReturnType<typeof createServiceSupabaseClient>,
  teacherId: string,
  schoolId: string,
  teacherName: string,
  actorUserId: string,
): Promise<{ app_username: string; app_password_plain: string; auth_user_id: string } | null> {
  const serviceSupabase = createServiceSupabaseClient();

  const loginIdentifier = await generateManagedLoginIdentifier(actorSupabase, {
    schoolId,
    role: "teacher",
    fullName: teacherName,
    preferredEmail: "",
  });
  const temporaryPassword = generateTemporaryPassword();
  const createdAt = new Date().toISOString();

  const authIdentityPayload = buildManagedAuthIdentityPayload({
    role: "teacher",
    schoolId,
    fullName: teacherName,
    loginIdentifier,
    createdBy: actorUserId,
    credentialPatch: {
      temporaryPasswordHash: hashPassword(temporaryPassword),
      hasPendingSetup: true,
      passwordLastResetAt: createdAt,
      cardLastPrintedAt: null,
    },
  });

  const { data: createdUser, error: createAuthError } = await serviceSupabase.auth.admin.createUser({
    email: loginIdentifier,
    password: temporaryPassword,
    email_confirm: true,
    ...authIdentityPayload,
  });

  if (createAuthError || !createdUser.user?.id) {
    return null;
  }

  const authUserId = createdUser.user.id;

  const { error: linkError } = await actorSupabase
    .from("teachers")
    .update({
      auth_user_id: authUserId,
      app_username: loginIdentifier,
      app_status: "active",
    })
    .eq("id", teacherId)
    .eq("school_id", schoolId);

  if (linkError) {
    await serviceSupabase.auth.admin.deleteUser(authUserId);
    return null;
  }

  await syncManagedUserAccountState(actorSupabase, {
    authUserId,
    schoolId,
    role: "teacher",
    fullName: teacherName,
    email: loginIdentifier,
    phone: null,
    isActive: true,
    teacherId,
    createdBy: actorUserId,
    temporaryPassword,
  });

  return { app_username: loginIdentifier, app_password_plain: temporaryPassword, auth_user_id: authUserId };
}

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "قائمة الأساتذة متاحة ضمن نطاق المدرسة الحالية فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const requestedBranchId = req.nextUrl.searchParams.get("branchId") ?? req.nextUrl.searchParams.get("branch_id");
  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const [rateLimited, canViewTeachers] = await Promise.all([
    enforceRateLimit(req, {
      namespace: "teachers-list",
      windowMs: 60_000,
      maxHits: 120,
      identifier: actorUserId,
    }),
    routeUserHasPermission(actorSupabase, actorUserId, "view_teachers"),
  ]);

  if (rateLimited) return rateLimited;
  if (!canViewTeachers) {
    return jsonError("ليس لديك صلاحية عرض الأساتذة.", 403);
  }

  try {
    const search = req.nextUrl.searchParams.get("search") ?? "";
    const status = req.nextUrl.searchParams.get("status") ?? "";
    const subject = req.nextUrl.searchParams.get("subject") ?? "";
    const appStatus = req.nextUrl.searchParams.get("appStatus") ?? req.nextUrl.searchParams.get("app_status") ?? "";

    let q = applyBranchScopeToQuery(
      actorSupabase.from("teachers").select("*", { count: "exact" }),
      branchScope.value,
    ).eq("school_id", targetSchoolId).neq("status", "deleted");

    if (search) q = q.ilike("full_name", `%${search}%`);
    if (status) q = q.eq("status", status);
    if (subject) q = q.eq("subject", subject);
    if (appStatus) q = q.eq("app_status", appStatus);

    q = q.order("created_at", { ascending: false });

    const { data, count, error } = await q;

    if (error) {
      logRouteError("teachers-list", error, { actorUserId, schoolId: targetSchoolId });
      return jsonError("تعذر تحميل قائمة الأساتذة.", 500);
    }

    return NextResponse.json({ ok: true, teachers: data ?? [], total: count ?? 0 });
  } catch (error) {
    logRouteError("teachers-list", error, { actorUserId, schoolId: targetSchoolId });
    return jsonError("تعذر تحميل قائمة الأساتذة.", 500);
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id : null;

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "إضافة الأساتذة متاحة للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const requestedBranchId = typeof body?.branch_id === "string" ? body.branch_id : null;
  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const [rateLimited, canManageTeachers] = await Promise.all([
    enforceRateLimit(req, {
      namespace: "teachers-create",
      windowMs: 60_000,
      maxHits: 40,
      identifier: actorUserId,
    }),
    routeUserHasPermission(actorSupabase, actorUserId, "manage_teachers"),
  ]);

  if (rateLimited) return rateLimited;
  if (!canManageTeachers) {
    return jsonError("ليس لديك صلاحية إضافة الأساتذة.", 403);
  }

  const fullName = typeof body?.full_name === "string" ? body.full_name.trim() : "";
  if (!fullName || fullName.length < 2) {
    return jsonError("الاسم الكامل مطلوب ويجب أن يكون من حرفين على الأقل.", 400);
  }

  const writeBranch = resolveBranchIdForWrite(branchScope.value, requestedBranchId);
  if (!writeBranch.ok) {
    return jsonError(writeBranch.message, writeBranch.status);
  }

  try {
    const insertPayload: Record<string, unknown> = {
      school_id: targetSchoolId,
      branch_id: writeBranch.value ?? branchScope.value.branchId,
      full_name: fullName,
      status: typeof body?.status === "string" ? body.status : "active",
    };

    const optionalTextFields = [
      "first_name_ar", "last_name_ar", "subject", "job_title", "specialization",
      "phone", "phone_secondary", "email", "email_work", "address", "city",
      "nationality", "marital_status", "blood_type", "national_id", "national_id_expiry",
      "employee_id", "contract_type", "hire_date", "contract_end_date",
      "qualification", "university", "bank_name", "bank_account",
      "emergency_contact_name", "emergency_contact_phone", "emergency_contact_relation",
      "notes", "date_of_birth", "status_reason", "photo", "salary_type",
    ] as const;

    for (const field of optionalTextFields) {
      if (field in (body ?? {})) {
        const val = body?.[field];
        insertPayload[field] = typeof val === "string" && val.trim().length > 0 ? val.trim() : null;
      }
    }

    if (body?.gender === "male" || body?.gender === "female") {
      insertPayload.gender = body.gender;
    }

    const numericFields = [
      "years_experience", "max_periods_daily", "max_periods_weekly",
      "graduation_year", "base_salary", "lecture_price", "transport_allowance",
      "housing_allowance", "other_allowances", "performance_score",
    ] as const;

    for (const field of numericFields) {
      if (field in (body ?? {})) {
        const parsed = Number(body?.[field]);
        insertPayload[field] = Number.isFinite(parsed) ? parsed : null;
      }
    }

    const { data, error } = await actorSupabase
      .from("teachers")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error || !data) {
      logRouteError("teachers-create", error, { actorUserId, schoolId: targetSchoolId });
      return jsonError(error?.message || "تعذر إضافة المعلم.", 500);
    }

    let accountInfo: { app_username: string; app_password_plain: string; auth_user_id: string } | null = null;
    try {
      accountInfo = await autoCreateTeacherAppAccount(actorSupabase, data.id, targetSchoolId, fullName, actorUserId);
    } catch {
      // Don't fail teacher creation if account creation fails
    }

    return NextResponse.json({
      ok: true,
      teacher: accountInfo ? { ...data, ...accountInfo, app_status: "active" } : data,
    }, { status: 201 });
  } catch (error) {
    logRouteError("teachers-create", error, { actorUserId, schoolId: targetSchoolId });
    return jsonError("تعذر إضافة المعلم.", 500);
  }
}
