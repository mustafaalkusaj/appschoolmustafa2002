import { NextRequest, NextResponse } from "next/server";

import {
  recordTeacherAttendance,
  recordTeacherAttendanceBatch,
  resolveMobileRouteContext,
} from "@/lib/mobile-api-server";

export async function POST(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req, "teacher");
    if (context.ok === false) {
      return context.response;
    }

    const payload = ((await req.json().catch(() => null)) ?? {}) as Record<
      string,
      unknown
    >;

    // `records: [...]` saves a whole roster in one round trip; a bare object
    // stays supported for callers that mark a single student.
    const result = Array.isArray(payload.records)
      ? await recordTeacherAttendanceBatch(context.value, payload.records)
      : await recordTeacherAttendance(context.value, payload);

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
