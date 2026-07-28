import { NextRequest, NextResponse } from "next/server";

import { enforceRateLimit } from "@/lib/rate-limit";

import { resolveMobileRouteContext } from "@/lib/mobile-api-server";

/**
 * Mobile push-token registration (any authenticated role).
 * Proxies to the same `user_push_subscriptions` upsert logic as the
 * web push-token route, but authenticates via the mobile surface
 * (resolveMobileRouteContext / Supabase auth) instead of the web JWT.
 */
export async function POST(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req);
    if (context.ok === false) {
      return context.response;
    }

    const rateLimited = await enforceRateLimit(req, {
      namespace: "mobile-push-token-register",
      windowMs: 60 * 60_000,
      maxHits: 10,
      identifier: context.value.authUserId,
    });
    if (rateLimited) {
      return rateLimited;
    }

    const body = (await req.json().catch(() => null)) as {
      token?: unknown;
      platform?: unknown;
    } | null;

    const token = typeof body?.token === "string" ? body.token.trim() : "";
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "token is required" },
        { status: 400 },
      );
    }

    // Validate Expo token format (parity with web push-token route).
    if (
      !token.startsWith("ExponentPushToken[") &&
      !token.startsWith("ExpoPushToken[")
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid Expo push token format" },
        { status: 400 },
      );
    }

    const ALLOWED_PLATFORMS = new Set(["ios", "android", "web", "mobile"]);
    const rawPlatform =
      typeof body?.platform === "string"
        ? body.platform.trim().toLowerCase()
        : "";
    const platform = ALLOWED_PLATFORMS.has(rawPlatform)
      ? rawPlatform
      : "mobile";
    const { authUserId, schoolId, serviceSupabase } = context.value;

    const { error } = await serviceSupabase
      .from("user_push_subscriptions")
      .upsert(
        {
          user_id: authUserId,
          school_id: schoolId,
          subscription_json: { type: "expo", token },
          platform,
          is_active: true,
        },
        { onConflict: "user_id,school_id,platform" },
      );

    if (error) {
      return NextResponse.json(
        { ok: false, error: "Failed to register push token" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const body = (await req.json().catch(() => null)) as {
      token?: unknown;
      platform?: unknown;
    } | null;
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const platform =
      typeof body?.platform === "string"
        ? body.platform.trim().toLowerCase()
        : "";
    const { authUserId, schoolId, serviceSupabase } = context.value;

    let query = serviceSupabase
      .from("user_push_subscriptions")
      .update({ is_active: false })
      .eq("user_id", authUserId)
      .eq("school_id", schoolId);

    if (platform) query = query.eq("platform", platform);
    if (token) query = query.contains("subscription_json", { token });

    const { error } = await query;
    if (error) {
      return NextResponse.json(
        { ok: false, error: "Failed to deactivate push token" },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
