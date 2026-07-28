import { NextRequest, NextResponse } from "next/server";

import {
  buildAuthRateLimitIdentifier,
  enforceRateLimit,
} from "@/lib/rate-limit";
import { getPublicEnv } from "@/lib/env/public";
import { createClient } from "@supabase/supabase-js";
import z from "zod";

const mobileLoginSchema = z.object({
  identifier: z.string().trim().min(1).max(320),
  password: z.string().min(1).max(256),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = mobileLoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "invalid_request" },
        { status: 400 },
      );
    }

    const { identifier, password } = parsed.data;

    const rateLimited = await enforceRateLimit(req, {
      namespace: "mobile-auth-login",
      windowMs: 10 * 60_000,
      maxHits: 20,
      identifier: buildAuthRateLimitIdentifier(req, identifier.toLowerCase()),
      productionFailureMode: "memory-fallback",
      onRateLimited: {
        error: "too_many_attempts",
        message: "محاولات كثيرة، حاول لاحقاً",
      },
    });
    if (rateLimited) return rateLimited;

    const { supabaseUrl, supabaseAnonKey } = getPublicEnv();
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Determine auth email:
    // - Already @schoolapp.local → use as-is (managed account)
    // - Contains @ (real email like user@school.edu) → try as-is first (web account)
    // - No @ (plain username) → append @schoolapp.local (managed account)
    const isRealEmail =
      identifier.includes("@") && !identifier.endsWith("@schoolapp.local");
    const managedEmail = identifier.endsWith("@schoolapp.local")
      ? identifier
      : `${identifier}@schoolapp.local`;

    let data;
    let error;

    if (isRealEmail) {
      const result = await supabase.auth.signInWithPassword({
        email: identifier,
        password,
      });
      if (!result.error && result.data.session) {
        data = result.data;
        error = null;
      } else {
        const fallback = await supabase.auth.signInWithPassword({
          email: managedEmail,
          password,
        });
        data = fallback.data;
        error = fallback.error;
      }
    } else {
      const result = await supabase.auth.signInWithPassword({
        email: managedEmail,
        password,
      });
      data = result.data;
      error = result.error;
    }

    if (error || !data.session) {
      return NextResponse.json(
        { ok: false, error: "invalid_credentials" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
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
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
