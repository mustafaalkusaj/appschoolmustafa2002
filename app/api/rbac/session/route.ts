import { NextRequest, NextResponse } from "next/server";

import { normalizePermissions, resolveKnownUserRole } from "@/types/roles";
import {
  RBAC_COOKIE_NAME,
  buildRBACSessionPayload,
  getExpiredRBACCookieOptions,
  getRBACCookieOptions,
  hasRBACSecret,
  signRBACSession,
  type RBACSessionPayload,
} from "@/lib/rbac-session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createRouteSupabaseClient, getRouteAuthenticatedUser } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  if (!hasRBACSecret()) {
    return NextResponse.json(
      { ok: false, message: "RBAC secret is not configured on server." },
      { status: 500 },
    );
  }

  const supabase = await createRouteSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await getRouteAuthenticatedUser(supabase, req.headers.get("authorization"));

  if (userError || !user?.id) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace: "rbac-session",
    windowMs: 60_000,
    maxHits: 30,
    identifier: user.id,
  });
  if (rateLimited) {
    return rateLimited;
  }

  // Use standard client with RLS (user can read own profile)
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    console.error("[RBAC Session] Profile fetch failed:", {
      userId: user.id,
      error: profileError,
      found: !!profile,
    });
    return NextResponse.json({ ok: false, message: "Profile not found" }, { status: 404 });
  }

  const role = resolveKnownUserRole(profile.role);
  if (!role) {
    const response = NextResponse.json(
      { ok: false, message: "هذا الحساب غير مخصص للوصول إلى لوحة الويب الإدارية." },
      { status: 403 },
    );
    response.cookies.set(RBAC_COOKIE_NAME, "", getExpiredRBACCookieOptions());
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

  let schoolActive = true;
  let subscriptionStatus: string | null = null;
  let subscriptionEnd: string | null = null;

  if (profile.school_id) {
    // Use standard client with RLS (user can read own school and its subscription)
    const [{ data: school }, { data: subscription }] = await Promise.all([
      supabase
        .from("schools")
        .select("is_active")
        .eq("id", profile.school_id)
        .maybeSingle(),
      supabase
        .from("subscriptions")
        .select("status, end_date")
        .eq("school_id", profile.school_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    schoolActive = school?.is_active !== false;
    subscriptionStatus = subscription?.status ?? null;
    subscriptionEnd = subscription?.end_date ?? null;
  } else if (role !== "super_admin") {
    schoolActive = false;
  }

  const profileExtended = profile as typeof profile & {
    scope_level?: string | null;
    allowed_module?: string | null;
    group_id?: string | null;
  };

  const rawScopeLevel = profileExtended.scope_level ?? null;
  const scopeLevel: RBACSessionPayload['scopeLevel'] =
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
    subscriptionStatus,
    subscriptionEnd,
    scopeLevel,
    allowedModule: profileExtended.allowed_module ?? null,
    groupId: profileExtended.group_id ?? null,
  });

  const signed = await signRBACSession(payload);
  if (!signed) {
    return NextResponse.json(
      { ok: false, message: "Failed to sign RBAC session." },
      { status: 500 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(RBAC_COOKIE_NAME, signed, getRBACCookieOptions());
  return response;
}

export async function DELETE(req: NextRequest) {
  const rateLimited = await enforceRateLimit(req, {
    namespace: "rbac-session-delete",
    windowMs: 60_000,
    maxHits: 60,
  });
  if (rateLimited) {
    return rateLimited;
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(RBAC_COOKIE_NAME, "", getExpiredRBACCookieOptions());
  return response;
}
