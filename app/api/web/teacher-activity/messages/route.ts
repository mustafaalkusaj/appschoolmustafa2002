import { NextRequest, NextResponse } from "next/server";

import { parseTeacherMessageFilters } from "@/lib/teacher-activity";
import { jsonError, listTeacherMessages } from "@/lib/teacher-activity-server";

export async function GET(request: NextRequest) {
  const filters = parseTeacherMessageFilters(request.nextUrl.searchParams);
  const result = await listTeacherMessages(request, filters);

  if (result.ok === false) {
    return jsonError(result.message, result.status);
  }

  return NextResponse.json({
    ok: true,
    items: result.value.items,
    totalCount: result.value.totalCount,
  });
}
