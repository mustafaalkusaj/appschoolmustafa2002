import { NextRequest, NextResponse } from "next/server";

import { recordTeacherAttendance, resolveMobileRouteContext } from "@/lib/mobile-api-server";

export async function POST(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req, "teacher");
    if (context.ok === false) {
      return context.response;
    }

    const payload = (await req.json().catch(() => null)) ?? {};
    const result = await recordTeacherAttendance(context.value, payload as Record<string, unknown>);

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
