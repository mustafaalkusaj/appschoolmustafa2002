import { NextRequest, NextResponse } from "next/server";

import {
  parseMobileListParams,
  queryMobileBehaviorLogs,
  type MobileRouteContext,
} from "@/lib/mobile-api-server";
import { resolveAdminMobileRouteContext } from "@/lib/mobile-admin-server";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveAdminMobileRouteContext(req);
    if (context.ok === false) {
      return context.response;
    }

    const params = parseMobileListParams(req, { limit: 20, maxLimit: 100 });
    const url = new URL(req.url);

    // queryMobileBehaviorLogs only reads serviceSupabase + schoolId, both present
    // on the admin context. Cast to the shared shape to reuse the query.
    const result = await queryMobileBehaviorLogs(
      context.value as unknown as MobileRouteContext,
      params,
      { studentId: url.searchParams.get("student_id")?.trim() || undefined },
    );

    return NextResponse.json({
      ok: true,
      gate: result.gate,
      items: result.items,
      page: params.page,
      limit: params.limit,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
