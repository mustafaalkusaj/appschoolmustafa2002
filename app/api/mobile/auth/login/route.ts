import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/lib/env/public";
import {
  buildAuthRateLimitIdentifier,
  enforceRateLimit,
  normalizeRateLimitEmail,
} from "@/lib/rate-limit";
import { logRouteError } from "@/lib/route-utils";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

const LOGIN_RATE_LIMIT_MESSAGE = "محاولات كثيرة، حاول لاحقاً";

function jsonError(message: string, status: number, code: string) {
  return NextResponse.json(
    { ok: false, error: { message }, code },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function normalizeIdentifier(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Resolve a human/username login identifier to the account's real auth email.
 * Order of resolution:
 *   1. managed_user_credentials.login_identifier -> profile email (fast path)
 *      then auth.users email via admin (authoritative).
 *   2. teachers.app_username -> auth.users email via admin.
 * Returns null when no managed account matches the identifier.
 */
async function resolveAuthEmail(
  serviceSupabase: ReturnType<typeof createServiceSupabaseClient>,
  identifier: string,
): Promise<string | null> {
  const candidateAuthUserIds: string[] = [];

  const { data: credential } = await serviceSupabase
    .from("managed_user_credentials")
    .select("auth_user_id")
    .eq("login_identifier", identifier)
    .maybeSingle();

  const credentialAuthUserId =
    credential && typeof credential.auth_user_id === "string"
      ? credential.auth_user_id
      : null;
  if (credentialAuthUserId) {
    candidateAuthUserIds.push(credentialAuthUserId);
  }

  if (candidateAuthUserIds.length === 0) {
    const { data: teacher } = await serviceSupabase
      .from("teachers")
      .select("auth_user_id")
      .eq("app_username", identifier)
      .maybeSingle();

    const teacherAuthUserId =
      teacher && typeof teacher.auth_user_id === "string"
        ? teacher.auth_user_id
        : null;
    if (teacherAuthUserId) {
      candidateAuthUserIds.push(teacherAuthUserId);
    }
  }

  const authUserId = candidateAuthUserIds[0];
  if (!authUserId) return null;

  // Fast path: managed_user_profiles.email mirrors auth.users.email.
  const { data: profile } = await serviceSupabase
    .from("managed_user_profiles")
    .select("email")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  const profileEmail =
    profile && typeof profile.email === "string" && profile.email.trim()
      ? profile.email.trim()
      : null;

  // Authoritative: fetch the actual auth user email (handles teacher accounts
  // whose auth email differs from app_username / profile email).
  const { data: adminUser } = await serviceSupabase.auth.admin
    .getUserById(authUserId)
    .catch(() => ({ data: null }) as { data: null });

  const authEmail =
    adminUser?.user && typeof adminUser.user.email === "string" && adminUser.user.email.trim()
      ? adminUser.user.email.trim()
      : null;

  return authEmail ?? profileEmail;
}

export async function POST(req: NextRequest) {
  let _step = "request_parse";
  try {
    const body = await req.json().catch(() => null);
    const identifier = normalizeIdentifier(
      body && typeof body === "object" ? (body as Record<string, unknown>).identifier : null,
    );
    const password =
      body && typeof body === "object" && typeof (body as Record<string, unknown>).password === "string"
        ? ((body as Record<string, unknown>).password as string)
        : null;

    if (!identifier || !password) {
      return jsonError(
        "أدخل اسم المستخدم/البريد وكلمة المرور.",
        422,
        "AUTH_LOGIN_INVALID_INPUT",
      );
    }

    _step = "rate_limit";
    const rateLimited = await enforceRateLimit(req, {
      namespace: "mobile-auth-login",
      windowMs: 10 * 60_000,
      maxHits: 20,
      identifier: buildAuthRateLimitIdentifier(
        req,
        normalizeRateLimitEmail(identifier),
      ),
      productionFailureMode: "memory-fallback",
      onRateLimited: {
        error: "too_many_attempts",
        message: LOGIN_RATE_LIMIT_MESSAGE,
      },
    });
    if (rateLimited) {
      return rateLimited;
    }

    _step = "resolve_email";
    let email: string | null;
    if (identifier.includes("@")) {
      email = identifier;
    } else {
      const serviceSupabase = createServiceSupabaseClient();
      email = await resolveAuthEmail(serviceSupabase, identifier);
    }

    if (!email) {
      return jsonError(
        "بيانات الدخول غير صحيحة.",
        401,
        "AUTH_LOGIN_INVALID_CREDENTIALS",
      );
    }

    _step = "sign_in";
    const { supabaseUrl, supabaseAnonKey } = getPublicEnv();
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error: signInError } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !data.session?.access_token || !data.session.refresh_token) {
      if (signInError) {
        logRouteError("mobile-auth-login-sign-in", signInError, { identifier });
      }
      return jsonError(
        "بيانات الدخول غير صحيحة.",
        401,
        "AUTH_LOGIN_INVALID_CREDENTIALS",
      );
    }

    return NextResponse.json(
      {
        ok: true,
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logRouteError("mobile-auth-login-unexpected", error, { step: _step });
    return jsonError(
      "تعذر تسجيل الدخول. حاول مرة أخرى.",
      500,
      "AUTH_LOGIN_UNEXPECTED",
    );
  }
}
