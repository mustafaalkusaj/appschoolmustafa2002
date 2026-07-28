import { NextRequest, NextResponse } from "next/server";

import {
  createTeacherGradeRecord,
  deleteTeacherGradeRecord,
  updateTeacherGradeRecord,
  type TeacherGradeCreateInput,
  type TeacherGradeUpdateInput,
} from "@/lib/academic-records-server";
import {
  parseMobileListParams,
  queryTeacherGrades,
  resolveMobileRouteContext,
} from "@/lib/mobile-api-server";

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
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
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
      (payload ?? {}) as TeacherGradeCreateInput,
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

/** Correct a mark this teacher recorded. Body must carry `id`. */
export async function PATCH(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req, "teacher");
    if (context.ok === false) {
      return context.response;
    }

    const payload = await req.json().catch(() => null);
    const result = await updateTeacherGradeRecord(
      context.value,
      (payload ?? {}) as TeacherGradeUpdateInput,
    );

    return NextResponse.json(
      {
        ok: result.ok,
        gate: result.gate,
        message: result.message,
        affectedCount: result.affectedCount ?? 0,
      },
      { status: result.ok ? 200 : 400 },
    );
  } catch {
    return NextResponse.json(
      { ok: false, gate: { available: false }, message: "حدث خطأ" },
      { status: 500 },
    );
  }
}

/** Delete a mark this teacher recorded. `?id=` or `{ id }` in the body. */
export async function DELETE(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req, "teacher");
    if (context.ok === false) {
      return context.response;
    }

    const queryId = req.nextUrl.searchParams.get("id");
    const payload = queryId
      ? null
      : ((await req.json().catch(() => null)) as { id?: unknown } | null);

    const result = await deleteTeacherGradeRecord(
      context.value,
      queryId ?? payload?.id,
    );

    return NextResponse.json(
      {
        ok: result.ok,
        gate: result.gate,
        message: result.message,
        affectedCount: result.affectedCount ?? 0,
      },
      { status: result.ok ? 200 : 400 },
    );
  } catch {
    return NextResponse.json(
      { ok: false, gate: { available: false }, message: "حدث خطأ" },
      { status: 500 },
    );
  }
}
