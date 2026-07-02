import { NextRequest, NextResponse } from "next/server";

import { buildTeacherDashboardPayload, resolveMobileRouteContext } from "@/lib/mobile-api-server";
import { buildSchoolCacheTag, rememberWithTtl } from "@/lib/server-cache";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req, "teacher");
    if (context.ok === false) {
      return context.response;
    }

    const { authUserId, schoolId } = context.value;
    const payload = await rememberWithTtl(
      `mobile:teacher:dashboard:${authUserId}`,
      120_000,
      () => buildTeacherDashboardPayload(context.value),
      { tags: [buildSchoolCacheTag(schoolId, "dashboard")] },
    );

    return NextResponse.json({ ok: true, ...payload });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
