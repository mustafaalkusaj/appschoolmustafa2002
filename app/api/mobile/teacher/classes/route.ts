import { NextRequest, NextResponse } from "next/server";

import { buildTeacherClassesPayload, resolveMobileRouteContext } from "@/lib/mobile-api-server";

export async function GET(req: NextRequest) {
  const context = await resolveMobileRouteContext(req, "teacher");
  if (context.ok === false) {
    return context.response;
  }

  return NextResponse.json({
    ok: true,
    ...buildTeacherClassesPayload(context.value.account),
  });
}
