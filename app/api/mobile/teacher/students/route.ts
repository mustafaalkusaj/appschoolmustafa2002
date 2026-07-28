import { NextRequest, NextResponse } from "next/server";

import {
  parseMobileListParams,
  queryTeacherStudents,
  resolveMobileRouteContext,
} from "@/lib/mobile-api-server";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req, "teacher");
    if (context.ok === false) {
      return context.response;
    }

    const params = parseMobileListParams(req, { limit: 20, maxLimit: 100 });
    const result = await queryTeacherStudents(context.value, params);

    return NextResponse.json({
      ok: true,
      gate: { available: true },
      items: result.items,
      page: result.page,
      limit: result.limit,
      total: result.total,
      has_more: result.has_more,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
