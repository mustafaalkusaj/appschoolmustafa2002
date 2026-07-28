import { NextRequest, NextResponse } from "next/server";

import {
  parseMobileListParams,
  queryMobileBehaviorLogs,
  resolveMobileRouteContext,
} from "@/lib/mobile-api-server";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req, "student");
    if (context.ok === false) {
      return context.response;
    }

    const student = context.value.account.student;
    if (!student?.id) {
      return NextResponse.json({
        ok: true,
        gate: { available: true },
        items: [],
        page: 1,
        limit: 20,
      });
    }

    const params = parseMobileListParams(req, { limit: 20, maxLimit: 100 });

    // Students can only see their own behavior logs.
    const result = await queryMobileBehaviorLogs(context.value, params, {
      studentId: student.id,
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
