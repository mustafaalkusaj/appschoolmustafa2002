import { NextRequest, NextResponse } from "next/server";

import { buildStudentDashboardPayload, resolveMobileRouteContext } from "@/lib/mobile-api-server";

export async function GET(req: NextRequest) {
  const context = await resolveMobileRouteContext(req, "student");
  if (context.ok === false) {
    return context.response;
  }

  return NextResponse.json({
    ok: true,
    ...await buildStudentDashboardPayload(context.value),
  });
}
