import { NextRequest, NextResponse } from "next/server";

import { getTeacherActivityMeta, jsonError } from "@/lib/teacher-activity-server";
import { getCacheHeaders, CACHE_STRATEGIES } from "@/lib/cache-strategies";

export async function GET(request: NextRequest) {
  const input = {
    schoolId: request.nextUrl.searchParams.get("schoolId") ?? request.nextUrl.searchParams.get("school_id"),
    studentQuery: request.nextUrl.searchParams.get("studentQuery") ?? request.nextUrl.searchParams.get("student_query"),
    branchId: request.nextUrl.searchParams.get("branchId") ?? request.nextUrl.searchParams.get("branch_id"),
    className: request.nextUrl.searchParams.get("className") ?? request.nextUrl.searchParams.get("class_name"),
    section: request.nextUrl.searchParams.get("section"),
  };

  try {
    const result = await getTeacherActivityMeta(request, input);

    if (result.ok === false) {
      return jsonError(result.message, result.status);
    }

    return NextResponse.json(
      {
        ok: true,
        ...result.value,
      },
      {
        headers: getCacheHeaders(CACHE_STRATEGIES.TEACHER_ACTIVITY_META),
      },
    );
  } catch (error) {
    const status = error instanceof Error && "status" in error && typeof error.status === "number"
      ? error.status
      : 500;
    return jsonError(error instanceof Error ? error.message : "تعذر تحميل بيانات المتابعة.", status);
  }
}
