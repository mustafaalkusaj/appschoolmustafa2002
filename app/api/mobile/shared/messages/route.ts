import { NextRequest, NextResponse } from "next/server";

import { enforceRateLimit } from "@/lib/rate-limit";

import {
  parseMobileListParams,
  queryMobileConversations,
  resolveMobileRouteContext,
  sendConversationMessage,
} from "@/lib/mobile-api-server";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req);
    if (context.ok === false) {
      return context.response;
    }

    const params = parseMobileListParams(req, { limit: 20, maxLimit: 100 });
    const result = await queryMobileConversations(context.value, params);

    return NextResponse.json({
      ok: true,
      gate: result.gate,
      items: result.items,
      page: params.page,
      limit: params.limit,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req);
    if (context.ok === false) {
      return context.response;
    }

    const rateLimited = await enforceRateLimit(req, {
      namespace: "mobile-messages-send",
      windowMs: 60_000,
      maxHits: 60,
      identifier: context.value.authUserId,
    });
    if (rateLimited) {
      return rateLimited;
    }

    const payload = (await req.json().catch(() => null)) ?? {};
    const result = await sendConversationMessage(
      context.value,
      payload as Record<string, unknown>,
    );

    return NextResponse.json(
      {
        ok: result.ok,
        gate: result.gate,
        message: result.message,
        data: result.data ?? null,
      },
      { status: result.ok ? 200 : 400 },
    );
  } catch {
    return NextResponse.json(
      { ok: false, gate: { available: false }, message: "حدث خطأ" },
      { status: 500 },
    );
  }
}
