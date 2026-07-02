import { NextRequest, NextResponse } from "next/server";

import {
  AVAILABLE_GATE,
  featureGateFromError,
  resolveMobileRouteContextAny,
} from "@/lib/mobile-api-admin";

export async function POST(req: NextRequest) {
  const context = await resolveMobileRouteContextAny(req);
  if (!context.ok) return context.response;

  const { serviceSupabase, authUserId } = context.value;

  let body: { token?: string; platform?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  if (!body.token) {
    return NextResponse.json({ ok: false, error: "token_required" }, { status: 400 });
  }

  const { data, error } = await serviceSupabase
    .from("push_tokens")
    .upsert(
      {
        user_id: authUserId,
        token: body.token,
        platform: body.platform ?? "unknown",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,token" },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({
      ok: true,
      gate: featureGateFromError(error, "push_tokens"),
      saved: false,
    });
  }

  return NextResponse.json({
    ok: true,
    gate: AVAILABLE_GATE,
    saved: true,
    record: data,
  });
}
