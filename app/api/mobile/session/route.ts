import { NextRequest, NextResponse } from "next/server";

import { buildMobileSessionPayload, resolveMobileRouteContext } from "@/lib/mobile-api-server";

export async function GET(req: NextRequest) {
  const context = await resolveMobileRouteContext(req);
  if (context.ok === false) {
    return context.response;
  }

  return NextResponse.json({
    ok: true,
    account: buildMobileSessionPayload(context.value.account),
  });
}
