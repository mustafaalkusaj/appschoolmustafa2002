import { NextRequest, NextResponse } from "next/server";

import { resolveMobileRouteContext } from "@/lib/mobile-api-server";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ notificationId: string }> },
) {
  const resolved = await resolveMobileRouteContext(req, "student");
  if (resolved.ok === false) {
    return resolved.response;
  }

  const { notificationId } = await context.params;
  const { error } = await resolved.value.serviceSupabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", resolved.value.authUserId)
    .eq("school_id", resolved.value.schoolId);

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: "internal_error",
        },
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
