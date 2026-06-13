import { NextRequest, NextResponse } from "next/server";

import { forgotPasswordRequestSchema } from "@/lib/api-schemas";
import { normalizeLocale } from "@/lib/locale-routing";
import { enforceRateLimit, getRateLimitClientIp } from "@/lib/rate-limit";
import { jsonValidationError, logRouteError } from "@/lib/route-utils";
import { createRouteSupabaseClient } from "@/lib/supabase-server";

function buildResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = forgotPasswordRequestSchema.safeParse(body);

  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  const locale = normalizeLocale(parsed.data.locale);
  const rateLimited = await enforceRateLimit(req, {
    namespace: "auth-forgot-password",
    windowMs: 10 * 60_000,
    maxHits: 3,
    identifier: `${getRateLimitClientIp(req)}:${parsed.data.email}`,
  });
  if (rateLimited) {
    return rateLimited;
  }

  try {
    const supabase = await createRouteSupabaseClient();
    const redirectTo = `${req.nextUrl.origin}/${locale}/forgot-password?mode=recovery`;
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo,
    });

    if (error) {
      logRouteError("auth-forgot-password", error, {
        email: parsed.data.email,
      });
    }

    return buildResponse({
      ok: true,
    });
  } catch (error) {
    logRouteError("auth-forgot-password-unexpected", error, {
      email: parsed.data.email,
    });
    return buildResponse({
      ok: true,
    });
  }
}
