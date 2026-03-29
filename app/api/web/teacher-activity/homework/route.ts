import { NextRequest, NextResponse } from "next/server";

import { parseHomeworkFilters } from "@/lib/teacher-activity";
import { jsonError, listHomework } from "@/lib/teacher-activity-server";

export async function GET(request: NextRequest) {
  const filters = parseHomeworkFilters(request.nextUrl.searchParams);
  const result = await listHomework(request, filters);

  if (result.ok === false) {
    return jsonError(result.message, result.status);
  }

  return NextResponse.json({
    ok: true,
    items: result.value.items,
    totalCount: result.value.totalCount,
  });
}
