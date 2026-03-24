import { NextRequest, NextResponse } from "next/server";

import { parseMobileListParams, queryTeacherGrades, resolveMobileRouteContext } from "@/lib/mobile-api-server";

export async function GET(req: NextRequest) {
  const context = await resolveMobileRouteContext(req, "teacher");
  if (context.ok === false) {
    return context.response;
  }

  const params = parseMobileListParams(req, { limit: 20, maxLimit: 100 });
  const result = await queryTeacherGrades(context.value, params);

  return NextResponse.json({
    ok: true,
    gate: result.gate,
    items: result.items,
    page: params.page,
    limit: params.limit,
  });
}
