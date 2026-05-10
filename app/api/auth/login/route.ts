import { NextRequest, NextResponse } from "next/server";

import type { UserProfile } from "@/lib/auth";
import { resolveWebUserProfileWithStatus } from "@/lib/authorization/snapshot";
import { loginRequestSchema } from "@/lib/api-schemas";
import { buildAuthRateLimitIdentifier, enforceRateLimit, normalizeRateLimitEmail } from "@/lib/rate-limit";
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
  | "unknown_role"
  | "server_config";

type LoginFailureCode =
  | "AUTH_LOGIN_INVALID_CREDENTIALS"
  | "AUTH_LOGIN_PROFILE_MISSING"
  | "AUTH_LOGIN_PROFILE_INACTIVE"
  | "AUTH_LOGIN_UNKNOWN_ROLE"
  | "AUTH_LOGIN_SERVER_CONFIG"
  | "AUTH_LOGIN_PROFILE_LOOKUP_FAILED"
  | "AUTH_LOGIN_UNEXPECTED";

const LOGIN_RATE_LIMIT_MESSAGE = "محاولات كثيرة، حاول لاحقاً";

function buildFailureResponse(
  reason: LoginFailureReason,
  status: number,
  code: LoginFailureCode,
) {
  return NextResponse.json(
    {
      ok: false,
      error: "login_failed",
      code,
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
  let _step = "request_parse";
  try {
    const body = await req.json().catch(() => null);
    const parsed = loginRequestSchema.safeParse(body);

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    _step = "rate_limit";
    const normalizedEmail = normalizeRateLimitEmail(parsed.data.email);
    const rateLimited = await enforceRateLimit(req, {
      namespace: "auth-login",
      windowMs: 10 * 60_000,
      maxHits: 20,
      identifier: buildAuthRateLimitIdentifier(req, normalizedEmail),
      productionFailureMode: "memory-fallback",
      onRateLimited: {
        error: "too_many_attempts",
        message: LOGIN_RATE_LIMIT_MESSAGE,
      },
    });
    if (rateLimited) {
      return rateLimited;
    }

    _step = "rbac_secret_check";
    if (!hasRBACSecret()) {
      logRouteError("auth-login-config", new Error("RBAC session secret is unavailable."));
      return buildFailureResponse("server_config", 500, "AUTH_LOGIN_SERVER_CONFIG");
    }

    _step = "supabase_client";
    const supabase = await createRouteSupabaseClient();
    _step = "supabase_signin";
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail || parsed.data.email,
      password: parsed.data.password,
    });

    if (signInError || !data.user?.id) {
      if (signInError) {
        logRouteError("auth-login-sign-in", signInError, {
          email: parsed.data.email,
        });
      }
      return buildFailureResponse(
        "invalid_credentials",
        401,
        "AUTH_LOGIN_INVALID_CREDENTIALS",
      );
    }

    _step = "profile_lookup";
    let profileLookupFailed = false;
    const resolved = await resolveWebUserProfileWithStatus(supabase, data.user.id).catch((error) => {
      profileLookupFailed = true;
      logRouteError("auth-login-profile", error, {
        userId: data.user.id,
      });
      return null;
    });

    if (profileLookupFailed || !resolved) {
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          error: "login_failed",
          code: "AUTH_LOGIN_PROFILE_LOOKUP_FAILED",
        },
        {
          status: 500,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    if (resolved.status === "profile_missing") {
      const response = buildFailureResponse(
        "profile_missing",
        403,
        "AUTH_LOGIN_PROFILE_MISSING",
      );
      clearRBACCookie(response);
      await supabase.auth.signOut();
      return response;
    }

    if (resolved.status === "unknown_role") {
      const response = buildFailureResponse(
        "unknown_role",
        403,
        "AUTH_LOGIN_UNKNOWN_ROLE",
      );
      clearRBACCookie(response);
      logRouteError("auth-login-role", new Error("Unknown role for login profile."), {
        userId: data.user.id,
        role: resolved.role,
      });
      await supabase.auth.signOut();
      return response;
    }

    const { profile, snapshot } = resolved;
    if (!profile.is_active) {
      const response = buildFailureResponse(
        "inactive_account",
        403,
        "AUTH_LOGIN_PROFILE_INACTIVE",
      );
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
      return buildFailureResponse("server_config", 500, "AUTH_LOGIN_SERVER_CONFIG");
    }

    const response = NextResponse.json(
      {
        ok: true,
        profile: {
          ...profile,
          id: profile.id,
          full_name: profile.full_name ?? null,
          email: profile.email ?? normalizedEmail ?? parsed.data.email,
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
  } catch (error) {
    logRouteError("auth-login-unexpected", error, { step: _step });
    return NextResponse.json(
      {
        error: "login_failed",
        code: "AUTH_LOGIN_UNEXPECTED",
        step: _step,
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
