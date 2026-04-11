import { NextRequest, NextResponse } from "next/server";

import { buildSchoolCacheTag, rememberWithTtl } from "@/lib/server-cache";
import { getTeacherActivityMeta, jsonError } from "@/lib/teacher-activity-server";

export async function GET(request: NextRequest) {
  const schoolId = request.nextUrl.searchParams.get("schoolId") ?? request.nextUrl.searchParams.get("school_id");
  const input = {
    schoolId: request.nextUrl.searchParams.get("schoolId") ?? request.nextUrl.searchParams.get("school_id"),
    studentQuery: request.nextUrl.searchParams.get("studentQuery") ?? request.nextUrl.searchParams.get("student_query"),
    branchId: request.nextUrl.searchParams.get("branchId") ?? request.nextUrl.searchParams.get("branch_id"),
    className: request.nextUrl.searchParams.get("className") ?? request.nextUrl.searchParams.get("class_name"),
    section: request.nextUrl.searchParams.get("section"),
  };

  try {
    const payload = schoolId?.trim()
      ? await rememberWithTtl(
          `teacher-activity:meta:${schoolId.trim()}:${request.nextUrl.searchParams.toString()}`,
          15_000,
          async () => {
            const result = await getTeacherActivityMeta(request, input);
            if (result.ok === false) {
              const error = new Error(result.message) as Error & { status?: number };
              error.status = result.status;
              throw error;
            }
            return { ok: true as const, ...result.value };
          },
          { tags: [buildSchoolCacheTag(schoolId.trim(), "teacher-activity")] },
        )
      : await (async () => {
          const result = await getTeacherActivityMeta(request, input);
          if (result.ok === false) {
            return { ok: false as const, status: result.status, message: result.message };
          }
          return { ok: true as const, ...result.value };
        })();

    if (!payload.ok) {
      return jsonError(payload.message, payload.status);
    }

    return NextResponse.json(payload);
  } catch (error) {
    const status = error instanceof Error && "status" in error && typeof error.status === "number"
      ? error.status
      : 500;
    return jsonError(error instanceof Error ? error.message : "تعذر تحميل بيانات المتابعة.", status);
  }
}
