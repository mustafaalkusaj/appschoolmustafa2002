import { NextRequest, NextResponse } from "next/server";

import { createTeacherAssignmentRecord, type TeacherAssignmentCreateInput } from "@/lib/academic-records-server";
import { parseMobileListParams, queryTeacherAssignments, resolveMobileRouteContext } from "@/lib/mobile-api-server";

export async function GET(req: NextRequest) {
  try {
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
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req, "teacher");
    if (context.ok === false) {
      return context.response;
    }

    const payload = await req.json().catch(() => null);
    const result = await createTeacherAssignmentRecord(
      context.value,
      ((payload ?? {}) as TeacherAssignmentCreateInput),
    );

    return NextResponse.json({
      ok: result.ok,
      gate: result.gate,
      message: result.message,
      affectedCount: result.affectedCount ?? 0,
    });
  } catch {
    return NextResponse.json(
      { ok: false, gate: { available: false }, message: "حدث خطأ" },
      { status: 500 },
    );
  }
}
