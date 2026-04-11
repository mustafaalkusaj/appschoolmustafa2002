import { NextRequest, NextResponse } from "next/server";

import { buildSchoolCacheTag, rememberWithTtl } from "@/lib/server-cache";
import { parseTeacherMessageFilters } from "@/lib/teacher-activity";
import { jsonError, listTeacherMessages } from "@/lib/teacher-activity-server";

export async function GET(request: NextRequest) {
  const filters = parseTeacherMessageFilters(request.nextUrl.searchParams);
  const schoolId = filters.schoolId?.trim();

  try {
    const payload = schoolId
      ? await rememberWithTtl(
          `teacher-activity:messages:${schoolId}:${request.nextUrl.searchParams.toString()}`,
          15_000,
          async () => {
            const result = await listTeacherMessages(request, filters);
            if (result.ok === false) {
              const error = new Error(result.message) as Error & { status?: number };
              error.status = result.status;
              throw error;
            }

            return {
              ok: true as const,
              items: result.value.items,
              totalCount: result.value.totalCount,
            };
          },
          { tags: [buildSchoolCacheTag(schoolId, "teacher-activity")] },
        )
      : await (async () => {
          const result = await listTeacherMessages(request, filters);
          if (result.ok === false) {
            return { ok: false as const, status: result.status, message: result.message };
          }

          return {
            ok: true as const,
            items: result.value.items,
            totalCount: result.value.totalCount,
          };
        })();

    if (!payload.ok) {
      return jsonError(payload.message, payload.status);
    }

    return NextResponse.json(payload);
  } catch (error) {
    const status = error instanceof Error && "status" in error && typeof error.status === "number"
      ? error.status
      : 500;
    return jsonError(error instanceof Error ? error.message : "تعذر تحميل الرسائل.", status);
  }
}
