import { NextRequest, NextResponse } from "next/server";

import { createTeacherGradeRecord, type TeacherGradeCreateInput } from "@/lib/academic-records-server";
import { parseMobileListParams, queryTeacherGrades, resolveMobileRouteContext } from "@/lib/mobile-api-server";

export async function GET(req: NextRequest) {
  try {
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
    const result = await createTeacherGradeRecord(
      context.value,
      ((payload ?? {}) as TeacherGradeCreateInput),
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
