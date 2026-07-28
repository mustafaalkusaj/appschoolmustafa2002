import { NextRequest, NextResponse } from "next/server";

import {
  parseMobileListParams,
  queryStudentPayments,
  resolveMobileRouteContext,
} from "@/lib/mobile-api-server";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req, "student");
    if (context.ok === false) {
      return context.response;
    }

    const params = parseMobileListParams(req, { limit: 20, maxLimit: 100 });
    const result = await queryStudentPayments(context.value, params);

    const response = NextResponse.json({
      ok: true,
      gate: result.gate,
      items: result.items,
      page: params.page,
      limit: params.limit,
    });
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
