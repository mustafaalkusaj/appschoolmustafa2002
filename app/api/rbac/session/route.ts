import { NextResponse } from "next/server";

import { normalizePermissions, normalizeUserRole } from "@/types/roles";
import {
  RBAC_COOKIE_NAME,
  buildRBACSessionPayload,
  getRBACCookieOptions,
  hasRBACSecret,
  signRBACSession,
} from "@/lib/rbac-session";
import { createRouteSupabaseClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
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
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
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

  const role = normalizeUserRole(profile.role);
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

  const payload = buildRBACSessionPayload({
    role,
    permissions,
    schoolId: profile.school_id ?? null,
    userActive: Boolean(profile.is_active),
    schoolActive,
    subscriptionStatus,
    subscriptionEnd,
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

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(RBAC_COOKIE_NAME, "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
  return response;
}
