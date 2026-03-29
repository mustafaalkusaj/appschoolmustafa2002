import { NextRequest, NextResponse } from "next/server";

import { getFeeNotificationDetail, jsonError } from "@/lib/teacher-activity-server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const result = await getFeeNotificationDetail(
    request,
    id,
    request.nextUrl.searchParams.get("schoolId") ?? request.nextUrl.searchParams.get("school_id"),
  );

  if (result.ok === false) {
    return jsonError(result.message, result.status);
  }

  return NextResponse.json({
    ok: true,
    item: result.value,
  });
}
