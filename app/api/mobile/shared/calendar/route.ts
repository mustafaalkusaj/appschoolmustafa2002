import { NextRequest, NextResponse } from "next/server";

import {
  parseMobileListParams,
  queryMobileCalendarEvents,
  resolveMobileRouteContext,
} from "@/lib/mobile-api-server";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req);
    if (context.ok === false) {
      return context.response;
    }

    const params = parseMobileListParams(req, { limit: 50, maxLimit: 200 });
    const url = new URL(req.url);
    const result = await queryMobileCalendarEvents(context.value, params, {
      from: url.searchParams.get("from")?.trim() || undefined,
      to: url.searchParams.get("to")?.trim() || undefined,
    });

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
