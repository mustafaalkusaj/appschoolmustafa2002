import { NextRequest, NextResponse } from "next/server";

import { parseMobileListParams, queryStudentAttendance, resolveMobileRouteContext } from "@/lib/mobile-api-server";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req, "student");
    if (context.ok === false) {
      return context.response;
    }

    const params = parseMobileListParams(req, { limit: 31, maxLimit: 120 });
    const result = await queryStudentAttendance(context.value, params);

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
