import { NextRequest, NextResponse } from "next/server";

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

    const body = (await req.json().catch(() => null)) as
      | { token?: unknown; platform?: unknown }
      | null;

    const token = typeof body?.token === "string" ? body.token.trim() : "";
    if (!token) {
      return NextResponse.json({ ok: false, error: "token is required" }, { status: 400 });
    }

    // Validate Expo token format (parity with web push-token route).
    if (!token.startsWith("ExponentPushToken[") && !token.startsWith("ExpoPushToken[")) {
      return NextResponse.json(
        { ok: false, error: "Invalid Expo push token format" },
        { status: 400 },
      );
    }

    const ALLOWED_PLATFORMS = new Set(["ios", "android", "web", "mobile"]);
    const rawPlatform = typeof body?.platform === "string" ? body.platform.trim().toLowerCase() : "";
    const platform = ALLOWED_PLATFORMS.has(rawPlatform) ? rawPlatform : "mobile";
    const { authUserId, schoolId, serviceSupabase } = context.value;

    const { error } = await serviceSupabase.from("user_push_subscriptions").upsert(
      {
        user_id: authUserId,
        school_id: schoolId,
        subscription_json: { type: "expo", token },
        platform,
        is_active: true,
      },
      { onConflict: "user_id,school_id" },
    );

    if (error) {
      return NextResponse.json(
        { ok: false, error: "Failed to register push token" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
