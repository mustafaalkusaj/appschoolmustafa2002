import { NextRequest, NextResponse } from "next/server";

import {
  createBehaviorLog,
  parseMobileListParams,
  queryMobileBehaviorLogs,
  resolveMobileRouteContext,
} from "@/lib/mobile-api-server";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req, "teacher");
    if (context.ok === false) {
      return context.response;
    }

    const params = parseMobileListParams(req, { limit: 20, maxLimit: 100 });
    const url = new URL(req.url);
    const requestedStudentId = url.searchParams.get("student_id")?.trim() || undefined;

    // IDOR guard: behavior_logs has no roster column, so a client-supplied
    // student_id must be verified against the teacher's own assigned roster.
    if (requestedStudentId) {
      const rosterIds = new Set(
        (context.value.account.teacher?.assigned_students ?? [])
          .map((student) => student.student_id)
          .filter(Boolean),
      );
      if (!rosterIds.has(requestedStudentId)) {
        return NextResponse.json(
          { ok: false, error: "هذا الطالب غير مرتبط بك." },
          { status: 403 },
        );
      }
    }

    const result = await queryMobileBehaviorLogs(context.value, params, {
      studentId: requestedStudentId,
    });

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

    const payload = (await req.json().catch(() => null)) ?? {};
    const result = await createBehaviorLog(context.value, payload as Record<string, unknown>);

    return NextResponse.json(
      {
        ok: result.ok,
        gate: result.gate,
        message: result.message,
        data: result.data ?? null,
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
