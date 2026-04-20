import { NextRequest, NextResponse } from "next/server";

import type { UserProfile } from "@/lib/auth";
import { resolveWebUserProfile } from "@/lib/authorization/snapshot";
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
import type { Permission } from "@/types/roles";

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

  const resolved = await resolveWebUserProfile(supabase, data.user.id).catch((error) => {
    logRouteError("auth-login-profile", error, {
      userId: data.user.id,
    });
    return null;
  });

  if (!resolved) {
    await supabase.auth.signOut();
    return buildFailureResponse("profile_missing", 404);
  }

  const { profile, snapshot } = resolved;
  if (!profile.is_active) {
    const response = buildFailureResponse("inactive_account", 403);
    clearRBACCookie(response);
    await supabase.auth.signOut();
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
    await supabase.auth.signOut();
    return buildFailureResponse("server_config", 500);
  }

  const response = NextResponse.json(
    {
      ok: true,
      profile: {
        ...profile,
        id: profile.id,
        full_name: profile.full_name ?? null,
        email: profile.email ?? parsed.data.email,
        avatar_url:
          typeof data.user.user_metadata?.avatar_url === "string"
            ? data.user.user_metadata.avatar_url
            : typeof data.user.user_metadata?.picture === "string"
              ? data.user.user_metadata.picture
              : null,
        role: snapshot.role,
        permissions: snapshot.permissions as Permission[],
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
