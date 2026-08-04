import { NextRequest, NextResponse } from "next/server";

import {
  parseMobileListParams,
  queryMobileCalendarEvents,
  resolveMobileRouteContext,
  type MobileSharedQueryContext,
} from "@/lib/mobile-api-server";
import { resolveAdminMobileRouteContext } from "@/lib/mobile-admin-server";

export async function GET(req: NextRequest) {
  try {
    // Same gap as /shared/announcements: the admin attendance screen and the
    // super-admin dashboard both push to /calendar, and both 403'd because this
    // resolver only admits student/teacher accounts. Calendar events are a
    // school-wide read, so accept an admin context too.
    const context = await resolveMobileRouteContext(req);
    let ctx: MobileSharedQueryContext;
    if (context.ok) {
      ctx = context.value;
    } else {
      const adminContext = await resolveAdminMobileRouteContext(req);
      if (adminContext.ok === false) {
        // Report the student/teacher failure: it is the more specific one.
        return context.response;
      }
      ctx = adminContext.value;
    }

    const params = parseMobileListParams(req, { limit: 50, maxLimit: 200 });
    const url = new URL(req.url);
    const result = await queryMobileCalendarEvents(ctx, params, {
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
