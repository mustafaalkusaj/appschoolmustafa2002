import { NextRequest, NextResponse } from "next/server";

import { resolveWebUserProfile } from "@/lib/authorization/snapshot";
import {
  RBAC_COOKIE_NAME,
  buildRBACSessionPayload,
  getExpiredRBACCookieOptions,
  getRBACCookieOptions,
  hasRBACSecret,
  signRBACSession,
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

  const resolved = await resolveWebUserProfile(supabase, user.id).catch((error) => {
    console.error("[RBAC Session] Profile fetch failed:", {
      userId: user.id,
      error,
      found: false,
    });
    return null;
  });

  if (!resolved) {
    return NextResponse.json({ ok: false, message: "Profile not found" }, { status: 404 });
  }

  const { snapshot } = resolved;
  if (!snapshot.userActive) {
    const response = NextResponse.json(
      { ok: false, message: "هذا الحساب غير نشط." },
      { status: 403 },
    );
    response.cookies.set(RBAC_COOKIE_NAME, "", getExpiredRBACCookieOptions());
    return response;
  }

  const payload = buildRBACSessionPayload({
    userId: snapshot.userId,
    role: snapshot.role,
    permissions: snapshot.permissions,
    schoolId: snapshot.schoolId,
    branchId: snapshot.branchId,
    allowedBranchIds: snapshot.allowedBranchIds,
    userActive: snapshot.userActive,
    schoolActive: snapshot.schoolActive,
    subscriptionStatus: snapshot.subscriptionStatus,
    subscriptionEnd: snapshot.subscriptionEnd,
    scopeLevel: snapshot.scopeLevel,
    allowedModule: snapshot.allowedModule,
    allowedModules: snapshot.allowedModules,
    allowedPages: snapshot.allowedPages,
    defaultPath: snapshot.defaultPath,
    isSinglePageUser: snapshot.isSinglePageUser,
    hierarchyLevel: snapshot.hierarchyLevel,
    permissionsVersion: snapshot.permissionsVersion,
    groupId: snapshot.groupId,
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

export async function GET(req: NextRequest) {
  const supabase = await createRouteSupabaseClient();
  const {
    data: { user },
    error,
  } = await getRouteAuthenticatedUser(supabase, req.headers.get("authorization"));

  if (error || !user?.id) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const resolved = await resolveWebUserProfile(supabase, user.id);
  if (!resolved) {
    return NextResponse.json({ ok: false, message: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    profile: resolved.profile,
    session: resolved.snapshot,
  });
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

  // Revoke the underlying Supabase session so the refresh token/JWT is
  // invalidated server-side. Guarded so a signOut failure still clears the
  // RBAC cookie and returns success.
  try {
    const supabase = await createRouteSupabaseClient();
    await supabase.auth.signOut();
  } catch (error) {
    console.error("[RBAC Session] Supabase signOut failed during logout:", error);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(RBAC_COOKIE_NAME, "", getExpiredRBACCookieOptions());
  return response;
}
