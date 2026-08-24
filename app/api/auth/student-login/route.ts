import { NextRequest, NextResponse } from "next/server";

import { resolveManagedAccountBase } from "@/lib/managed-users/queries";
import { loginRequestSchema } from "@/lib/api-schemas";
import {
  buildAuthRateLimitIdentifier,
  enforceRateLimit,
  normalizeRateLimitEmail,
} from "@/lib/rate-limit";
import {
  RBAC_COOKIE_NAME,
  buildRBACSessionPayload,
  getExpiredRBACCookieOptions,
  getRBACCookieOptions,
  hasRBACSecret,
  signRBACSession,
} from "@/lib/rbac-session";
import { logRouteError } from "@/lib/route-utils";
import {
  applyPendingCookies,
  createRouteSupabaseClientWithCookies,
} from "@/lib/supabase-server";
import { buildTemplatePermissions, DEFAULT_PATH_BY_ROLE } from "@/types/roles";

const RATE_LIMIT_MSG = "محاولات كثيرة، حاول لاحقاً";

function fail(status: number, code: string, reason: string) {
  return NextResponse.json(
    { ok: false, error: "login_failed", code, reason },
    { status, headers: { "Cache-Control": "no-store" } },
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
      return fail(400, "STUDENT_LOGIN_VALIDATION", "invalid_input");
    }

    _step = "rate_limit";
    const normalizedEmail = normalizeRateLimitEmail(parsed.data.email);
    const rateLimited = await enforceRateLimit(req, {
      namespace: "student-login",
      windowMs: 10 * 60_000,
      maxHits: 20,
      identifier: buildAuthRateLimitIdentifier(req, normalizedEmail),
      productionFailureMode: "memory-fallback",
      onRateLimited: { error: "too_many_attempts", message: RATE_LIMIT_MSG },
    });
    if (rateLimited) return rateLimited;

    _step = "rbac_secret_check";
    if (!hasRBACSecret()) {
      logRouteError("student-login-config", new Error("RBAC secret missing."));
      return fail(500, "STUDENT_LOGIN_SERVER_CONFIG", "server_config");
    }

    _step = "supabase_signin";
    const { client: supabase, pendingCookies } =
      await createRouteSupabaseClientWithCookies();
    const { data, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: normalizedEmail || parsed.data.email,
        password: parsed.data.password,
      });

    if (signInError || !data.user?.id) {
      return fail(401, "STUDENT_LOGIN_INVALID_CREDENTIALS", "invalid_credentials");
    }

    _step = "resolve_managed_account";
    const resolved = await resolveManagedAccountBase(data.user.id).catch(
      (error) => {
        logRouteError("student-login-resolve", error, {
          userId: data.user.id,
        });
        return null;
      },
    );

    if (!resolved || resolved.role !== "student") {
      await supabase.auth.signOut();
      const response = fail(
        401,
        "STUDENT_LOGIN_INVALID_CREDENTIALS",
        "invalid_credentials",
      );
      clearRBACCookie(response);
      return response;
    }

    if (!resolved.identity.is_active) {
      await supabase.auth.signOut();
      const response = fail(403, "STUDENT_LOGIN_INACTIVE", "inactive_account");
      clearRBACCookie(response);
      return response;
    }

    if (!resolved.schoolId) {
      await supabase.auth.signOut();
      return fail(401, "STUDENT_LOGIN_NO_SCHOOL", "invalid_credentials");
    }

    _step = "build_session";
    const permissions = buildTemplatePermissions("student");
    const payload = buildRBACSessionPayload({
      userId: data.user.id,
      role: "student",
      permissions,
      schoolId: resolved.schoolId,
      branchId: null,
      allowedBranchIds: [],
      userActive: resolved.identity.is_active,
      schoolActive: true,
      subscriptionStatus: null,
      subscriptionEnd: null,
      scopeLevel: "restricted",
      allowedModule: null,
      allowedModules: [],
      allowedPages: [],
      defaultPath: DEFAULT_PATH_BY_ROLE.student,
      isSinglePageUser: false,
      hierarchyLevel: null,
      permissionsVersion: 1,
      groupId: null,
    });

    const signed = await signRBACSession(payload);
    if (!signed) {
      await supabase.auth.signOut();
      return fail(500, "STUDENT_LOGIN_SERVER_CONFIG", "server_config");
    }

    const studentName =
      resolved.user?.full_name ??
      resolved.authUser.user_metadata?.full_name ??
      null;

    const response = NextResponse.json(
      {
        ok: true,
        profile: {
          id: data.user.id,
          full_name: studentName,
          email: data.user.email ?? null,
          avatar_url: null,
          role: "student" as const,
          permissions,
          school_id: resolved.schoolId,
          is_active: resolved.identity.is_active,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );

    applyPendingCookies(response, pendingCookies);
    response.cookies.set(RBAC_COOKIE_NAME, signed, getRBACCookieOptions());

    return response;
  } catch (error) {
    logRouteError("student-login-unexpected", error, { step: _step });
    return NextResponse.json(
      { error: "login_failed", code: "STUDENT_LOGIN_UNEXPECTED" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
