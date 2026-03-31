import { NextRequest, NextResponse } from "next/server";
import { isMissingColumnError } from "@/lib/admin-infrastructure";
import { enforceRateLimit } from "@/lib/rate-limit";
import { ALL_PERMISSIONS, normalizePermissions, normalizeUserRole } from "@/types/roles";
import {
  createRouteSupabaseClient,
  createServiceSupabaseClient,
  getRouteAuthenticatedUser,
} from "@/lib/supabase-server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;

type CreateUserBody = {
  email: string;
  password: string;
  full_name?: string | null;
  role?: string | null;
  school_id?: string | null;
  phone?: string | null;
  is_active?: boolean;
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
    return { ok: false as const, message: "Password must be between 8 and 72 characters." };
  }

  const role = normalizeUserRole(data.role);
  const schoolId = (data.school_id || "").trim() || null;
  if (role !== "super_admin" && !schoolId) {
    return { ok: false as const, message: "school_id is required for non-super_admin users." };
  }

  const fullName = typeof data.full_name === "string" ? data.full_name.trim() : "";
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
      full_name: fullName || null,
      phone: phone || null,
      is_active: isActive,
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

  const rateLimitResponse = enforceRateLimit(req, {
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
    role: validation.value.role,
    school_id: validation.value.school_id,
    phone: validation.value.phone,
    is_active: validation.value.is_active,
    custom_permissions: validation.value.custom_permissions,
  };

  let { error: insertProfileError } = await serviceSupabase.from("user_profiles").insert(profilePayload);

  if (isMissingColumnError(insertProfileError, "user_profiles", "custom_permissions")) {
    // Omit the custom_permissions column when the schema doesn't support it yet
    const { custom_permissions: _omit, ...legacyPayload } = profilePayload;
    void _omit;
    ({ error: insertProfileError } = await serviceSupabase.from("user_profiles").insert(legacyPayload));
  }
  
  if (insertProfileError) {
    // Rollback: delete the auth user if profile creation fails
    await serviceSupabase.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json(
      { error: { message: insertProfileError.message } },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
    },
    { status: 201 },
  );
}
