import { NextRequest, NextResponse } from "next/server";

import { parseTeacherMessageFilters } from "@/lib/teacher-activity";
import { jsonError, listTeacherMessages } from "@/lib/teacher-activity-server";

export async function GET(request: NextRequest) {
  const filters = parseTeacherMessageFilters(request.nextUrl.searchParams);

  try {
    const result = await listTeacherMessages(request, filters);

    if (result.ok === false) {
      return jsonError(result.message, result.status);
    }

    return NextResponse.json(
      {
        ok: true,
        items: result.value.items,
        totalCount: result.value.totalCount,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    const status = error instanceof Error && "status" in error && typeof error.status === "number"
      ? error.status
      : 500;
    return jsonError(error instanceof Error ? error.message : "تعذر تحميل الرسائل.", status);
  }
}
