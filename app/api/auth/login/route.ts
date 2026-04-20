import { NextRequest, NextResponse } from "next/server";

import type { UserProfile } from "@/lib/auth";
import { loginRequestSchema } from "@/lib/api-schemas";
import { enforceRateLimit, getRateLimitClientIp } from "@/lib/rate-limit";
import {
  RBAC_COOKIE_NAME,
  buildRBACSessionPayload,
  getExpiredRBACCookieOptions,
  getRBACCookieOptions,
  hasRBACSecret,
  signRBACSession,
} from "@/lib/rbac-session";
import { jsonValidationError, logRouteError } from "@/lib/route-utils";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { normalizePermissions, resolveKnownUserRole, type Permission } from "@/types/roles";

type LoginFailureReason =
  | "invalid_credentials"
  | "profile_missing"
  | "inactive_account"
  | "server_config";

function buildFailureResponse(reason: LoginFailureReason, status: number) {
  return NextResponse.json(
    {
      ok: false,
      reason,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function clearRBACCookie(response: NextResponse) {
  response.cookies.set(RBAC_COOKIE_NAME, "", getExpiredRBACCookieOptions());
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = loginRequestSchema.safeParse(body);

  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace: "auth-login",
    windowMs: 10 * 60_000,
    maxHits: 5,
    identifier: `${getRateLimitClientIp(req)}:${parsed.data.email}`,
  });
  if (rateLimited) {
    return rateLimited;
  }

  if (!hasRBACSecret()) {
    return buildFailureResponse("server_config", 500);
  }

  const supabase = await createRouteSupabaseClient();
  const { data, error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (signInError || !data.user?.id) {
    if (signInError) {
      logRouteError("auth-login-sign-in", signInError, {
        email: parsed.data.email,
      });
    }
    return buildFailureResponse("invalid_credentials", 401);
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    logRouteError("auth-login-profile", profileError ?? new Error("Profile not found"), {
      userId: data.user.id,
    });
    await supabase.auth.signOut();
    return buildFailureResponse("profile_missing", 404);
  }

  const role = resolveKnownUserRole(profile.role);
  if (!role || !profile.is_active) {
    const response = buildFailureResponse(!profile.is_active ? "inactive_account" : "profile_missing", role ? 403 : 404);
    clearRBACCookie(response);
    await supabase.auth.signOut();
    return response;
  }

  const profileWithOptionalPermissions = profile as typeof profile & {
    custom_permissions?: unknown;
    permissions?: unknown;
  };
  const rawPermissions =
    (Array.isArray(profileWithOptionalPermissions.custom_permissions) &&
    profileWithOptionalPermissions.custom_permissions.length > 0
      ? profileWithOptionalPermissions.custom_permissions
      : profileWithOptionalPermissions.permissions) ?? [];
  const permissions = normalizePermissions(rawPermissions, role);

  let school: UserProfile["school"] = null;
  let subscription: UserProfile["subscription"] = null;
  let schoolActive = true;

  if (profile.school_id) {
    const [{ data: schoolData }, { data: subscriptionData }] = await Promise.all([
      supabase
        .from("schools")
        .select("id, name, is_active")
        .eq("id", profile.school_id)
        .maybeSingle(),
      supabase
        .from("subscriptions")
        .select("id, school_id, status, end_date")
        .eq("school_id", profile.school_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    school = (schoolData ?? null) as UserProfile["school"];
    subscription = (subscriptionData ?? null) as UserProfile["subscription"];
    schoolActive = school?.is_active !== false;
  } else if (role !== "super_admin") {
    schoolActive = false;
  }

  const profileExtended = profile as typeof profile & {
    scope_level?: string | null;
    allowed_module?: string | null;
    group_id?: string | null;
  };

  type ScopeLevel = 'super_admin' | 'group_admin' | 'branch_user' | 'restricted';
  const rawScopeLevel = profileExtended.scope_level ?? null;
  const scopeLevel: ScopeLevel | null =
    rawScopeLevel === 'super_admin' || rawScopeLevel === 'group_admin' ||
    rawScopeLevel === 'branch_user' || rawScopeLevel === 'restricted'
      ? rawScopeLevel
      : null;

  const payload = buildRBACSessionPayload({
    role,
    permissions,
    schoolId: profile.school_id ?? null,
    userActive: Boolean(profile.is_active),
    schoolActive,
    subscriptionStatus: subscription?.status ?? null,
    subscriptionEnd: subscription?.end_date ?? null,
    scopeLevel,
    allowedModule: profileExtended.allowed_module ?? null,
    groupId: profileExtended.group_id ?? null,
  });

  const signed = await signRBACSession(payload);
  if (!signed) {
    await supabase.auth.signOut();
    return buildFailureResponse("server_config", 500);
  }

  const response = NextResponse.json(
    {
      ok: true,
      profile: {
        id: profile.id,
        full_name: profile.full_name ?? null,
        email: profile.email ?? parsed.data.email,
        avatar_url:
          typeof data.user.user_metadata?.avatar_url === "string"
            ? data.user.user_metadata.avatar_url
            : typeof data.user.user_metadata?.picture === "string"
              ? data.user.user_metadata.picture
              : null,
        role,
        permissions: permissions as Permission[],
        custom_permissions: Array.isArray(profileWithOptionalPermissions.custom_permissions)
          ? (profileWithOptionalPermissions.custom_permissions as Permission[])
          : null,
        school_id: profile.school_id ?? null,
        is_active: Boolean(profile.is_active),
        phone: profile.phone ?? null,
        school,
        subscription,
      } satisfies UserProfile,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );

  response.cookies.set(RBAC_COOKIE_NAME, signed, getRBACCookieOptions());
  return response;
}
