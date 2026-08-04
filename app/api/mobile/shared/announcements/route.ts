import { NextRequest, NextResponse } from "next/server";

import {
  parseMobileListParams,
  queryMobileAnnouncements,
  resolveMobileRouteContext,
  type MobileSharedQueryContext,
} from "@/lib/mobile-api-server";
import { resolveAdminMobileRouteContext } from "@/lib/mobile-admin-server";

export async function GET(req: NextRequest) {
  try {
    // resolveMobileRouteContext only admits student/teacher accounts, but eight
    // admin screens and the super-admin dashboard push to /announcements — every
    // one of those bells 403'd. Announcements are a school-wide read, so fall
    // back to the admin context instead of rejecting.
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

    const params = parseMobileListParams(req, { limit: 20, maxLimit: 100 });
    const result = await queryMobileAnnouncements(ctx, params);

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
