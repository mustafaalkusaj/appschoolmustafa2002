import { NextRequest, NextResponse } from "next/server";
import { isMissingColumnError } from "@/lib/admin-infrastructure";
import { resolveScopedUserConfig, ScopedUserConfigError } from "@/lib/authorization/scoped-user-config";
import { enforceRateLimit } from "@/lib/rate-limit";
import { replaceSuperAdminUserPageAccess } from "@/lib/super-admin-server";
import { normalizeJobTitle } from "@/lib/users/job-title";
import { ALL_PERMISSIONS, normalizePermissions, normalizeUserRole } from "@/types/roles";
import {
  createRouteSupabaseClient,
  createServiceSupabaseClient,
  getRouteAuthenticatedUser,
} from "@/lib/supabase-server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 10;
const MAX_PASSWORD_LENGTH = 72;

type CreateUserBody = {
  email: string;
  password: string;
  full_name?: string | null;
  job_title?: string | null;
  role?: string | null;
  school_id?: string | null;
  branch_id?: string | null;
  phone?: string | null;
  is_active?: boolean;
  scope_level?: string | null;
  is_single_page_user?: boolean;
  allowed_pages?: unknown;
  custom_permissions?: unknown;
};

function validateCreateUserInput(body: unknown) {
  const data = (body || {}) as Partial<CreateUserBody>;

  const email = (data.email || "").trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false as const, message: "A valid email address is required." };
  }

  const password = data.password || "";
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    return { ok: false as const, message: "Password must be between 10 and 72 characters." };
  }

  const role = normalizeUserRole(data.role);
  const schoolId = (data.school_id || "").trim() || null;
  if (role !== "super_admin" && !schoolId) {
    return { ok: false as const, message: "school_id is required for non-super_admin users." };
  }

  const branchId = typeof data.branch_id === "string" && data.branch_id.trim() ? data.branch_id.trim() : null;

  const fullName = typeof data.full_name === "string" ? data.full_name.trim() : "";
  const jobTitle = normalizeJobTitle(data.job_title);
  const phone = typeof data.phone === "string" ? data.phone.trim() : "";
  const isActive = data.is_active ?? true;
  if (typeof isActive !== "boolean") {
    return { ok: false as const, message: "is_active must be a boolean value." };
  }

  let customPermissions: import("@/types/roles").Permission[] | null = null;
  if (Array.isArray(data.custom_permissions)) {
    const requestedPermissions = data.custom_permissions.filter(
      (permission): permission is string => typeof permission === "string" && permission.trim().length > 0,
    );
    const allowedPermissions = new Set<string>(ALL_PERMISSIONS);
    const validPermissions = requestedPermissions.filter((permission) => allowedPermissions.has(permission));
    customPermissions = validPermissions.length > 0 ? normalizePermissions(validPermissions, role) : null;
  }

  return {
    ok: true as const,
    value: {
      email,
      password,
      role,
      school_id: schoolId,
      branch_id: branchId,
      full_name: fullName || null,
      job_title: jobTitle,
      phone: phone || null,
      is_active: isActive,
      scope_level: typeof data.scope_level === "string" ? data.scope_level.trim().toLowerCase() : null,
      is_single_page_user: data.is_single_page_user === true,
      allowed_pages: Array.isArray(data.allowed_pages)
        ? data.allowed_pages.filter((page): page is string => typeof page === "string" && page.trim().length > 0)
        : [],
      custom_permissions: customPermissions,
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    createServiceSupabaseClient();
  } catch {
    return NextResponse.json(
      { error: { message: "Supabase server configuration is missing." } },
      { status: 500 },
    );
  }

  const body = await req.json().catch(() => null);
  const validation = validateCreateUserInput(body);
  if (!validation.ok) {
    return NextResponse.json({ error: { message: validation.message } }, { status: 400 });
  }

  const actorSupabase = await createRouteSupabaseClient();
  const {
    data: { user: actorUser },
    error: actorUserError,
  } = await getRouteAuthenticatedUser(actorSupabase, req.headers.get("authorization"));

  if (actorUserError || !actorUser?.id) {
    return NextResponse.json({ error: { message: "Unauthorized." } }, { status: 401 });
  }

  const rateLimitResponse = await enforceRateLimit(req, {
    namespace: "users-create",
    windowMs: 10 * 60 * 1000,
    maxHits: 10,
    identifier: actorUser.id,
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Use actorSupabase to check permissions (RLS)
  const { data: actorProfile, error: actorProfileError } = await actorSupabase
    .from("user_profiles")
    .select("role, is_active")
    .eq("id", actorUser.id)
    .maybeSingle();

  if (actorProfileError || !actorProfile || actorProfile.is_active === false) {
    return NextResponse.json({ error: { message: "Unauthorized." } }, { status: 401 });
  }

  const actorRole = normalizeUserRole(actorProfile.role);
  if (actorRole !== "super_admin") {
    return NextResponse.json(
      { error: { message: "Only super_admin users can create users." } },
      { status: 403 },
    );
  }

  // Only use service client for admin Auth operations
  const serviceSupabase = createServiceSupabaseClient();

  if (validation.value.school_id) {
    const { data: school, error: schoolError } = await serviceSupabase
      .from("schools")
      .select("id, is_active")
      .eq("id", validation.value.school_id)
      .maybeSingle();

    if (schoolError || !school) {
      return NextResponse.json({ error: { message: "Invalid school_id." } }, { status: 400 });
    }
  }

  const effectivePermissions = validation.value.custom_permissions ?? normalizePermissions([], validation.value.role);

  let scopedConfig;
  try {
    scopedConfig = resolveScopedUserConfig({
      role: validation.value.role,
      schoolId: validation.value.school_id,
      branchId: validation.value.branch_id,
      scopeLevel: validation.value.scope_level,
      isSinglePageUser: validation.value.is_single_page_user,
      allowedPages: validation.value.allowed_pages,
      permissions: effectivePermissions,
    });
  } catch (error) {
    const message = error instanceof ScopedUserConfigError ? error.message : "Invalid scope configuration.";
    return NextResponse.json({ error: { message } }, { status: 400 });
  }

  if (scopedConfig.branchId && scopedConfig.schoolId) {
    const { data: branch, error: branchError } = await serviceSupabase
      .from("branches")
      .select("id")
      .eq("id", scopedConfig.branchId)
      .eq("school_id", scopedConfig.schoolId)
      .maybeSingle();

    if (branchError || !branch?.id) {
      return NextResponse.json({ error: { message: "Invalid branch_id for the selected school." } }, { status: 400 });
    }
  }

  const { data: authData, error: createAuthError } = await serviceSupabase.auth.admin.createUser({
    email: validation.value.email,
    password: validation.value.password,
    email_confirm: true,
    user_metadata: { createdBy: actorUser.id },
  });

  if (createAuthError || !authData?.user) {
    return NextResponse.json(
      { error: { message: createAuthError?.message || "Failed to create auth user." } },
      { status: 400 },
    );
  }

  const profilePayload = {
    id: authData.user.id,
    email: validation.value.email,
    full_name: validation.value.full_name,
    job_title: validation.value.job_title,
    role: validation.value.role,
    school_id: scopedConfig.schoolId,
    branch_id: scopedConfig.branchId,
    default_branch_id: scopedConfig.defaultBranchId,
    phone: validation.value.phone,
    is_active: validation.value.is_active,
    scope_level: scopedConfig.scopeLevel,
    allowed_module: scopedConfig.allowedModule,
    is_single_page_user: scopedConfig.isSinglePageUser,
    hierarchy_level: null,
    custom_permissions: validation.value.custom_permissions,
  };

  let { error: insertProfileError } = await serviceSupabase.from("user_profiles").insert(profilePayload);

  for (let attempt = 0; insertProfileError && attempt < 2; attempt += 1) {
    if (isMissingColumnError(insertProfileError, "user_profiles", "custom_permissions") && "custom_permissions" in profilePayload) {
      delete (profilePayload as Record<string, unknown>).custom_permissions;
      ({ error: insertProfileError } = await serviceSupabase.from("user_profiles").insert(profilePayload));
      continue;
    }

    if (isMissingColumnError(insertProfileError, "user_profiles", "job_title") && "job_title" in profilePayload) {
      delete (profilePayload as Record<string, unknown>).job_title;
      ({ error: insertProfileError } = await serviceSupabase.from("user_profiles").insert(profilePayload));
      continue;
    }

    break;
  }

  if (isMissingColumnError(insertProfileError, "user_profiles", "branch_id")) {
    await serviceSupabase.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json(
      { error: { message: "The scoped authorization fields are missing from user_profiles. Run migration 20260420_000000_scoped_authorization_foundation.sql first." } },
      { status: 400 },
    );
  }
  
  if (insertProfileError) {
    // Rollback: delete the auth user if profile creation fails
    await serviceSupabase.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json(
      { error: { message: insertProfileError.message } },
      { status: 500 },
    );
  }

  try {
    if (scopedConfig.schoolId && scopedConfig.pageAccessGrants.length > 0) {
      await replaceSuperAdminUserPageAccess(serviceSupabase, {
        userId: authData.user.id,
        schoolId: scopedConfig.schoolId,
        branchId: scopedConfig.branchId,
        grants: scopedConfig.pageAccessGrants,
      });
    }
  } catch (error) {
    await serviceSupabase.from("user_profiles").delete().eq("id", authData.user.id);
    await serviceSupabase.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : "Failed to configure page access." } },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        school_id: scopedConfig.schoolId,
        branch_id: scopedConfig.branchId,
        scope_level: scopedConfig.scopeLevel,
        allowed_pages: scopedConfig.allowedPages,
      },
    },
    { status: 201 },
  );
}
