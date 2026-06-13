import { NextRequest, NextResponse } from "next/server";

import {
  buildMobileSessionPayload,
  getAppConfigValue,
  getEnabledFeatures,
  resolveMobileRouteContext,
} from "@/lib/mobile-api-server";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req);
    if (context.ok === false) {
      return context.response;
    }

    const schoolId = context.value.schoolId;
    const [features, appVersion] = await Promise.all([
      getEnabledFeatures(schoolId),
      getAppConfigValue("app_version", schoolId),
    ]);

    return NextResponse.json({
      ok: true,
      account: buildMobileSessionPayload(context.value.account),
      features,
      app_version: appVersion,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
