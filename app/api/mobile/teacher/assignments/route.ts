import { NextRequest, NextResponse } from "next/server";

import { parseMobileListParams, queryTeacherAssignments, resolveMobileRouteContext } from "@/lib/mobile-api-server";

export async function GET(req: NextRequest) {
  const context = await resolveMobileRouteContext(req, "teacher");
  if (context.ok === false) {
    return context.response;
  }

  const params = parseMobileListParams(req, { limit: 20, maxLimit: 100 });
  const result = await queryTeacherAssignments(context.value, params);

  return NextResponse.json({
    ok: true,
    gate: result.gate,
    items: result.items,
    page: params.page,
    limit: params.limit,
  });
}
