import { NextRequest, NextResponse } from "next/server";

import { getTeacherActivityMeta, jsonError } from "@/lib/teacher-activity-server";

export async function GET(request: NextRequest) {
  const result = await getTeacherActivityMeta(request, {
    schoolId: request.nextUrl.searchParams.get("schoolId") ?? request.nextUrl.searchParams.get("school_id"),
    studentQuery: request.nextUrl.searchParams.get("studentQuery") ?? request.nextUrl.searchParams.get("student_query"),
    branchId: request.nextUrl.searchParams.get("branchId") ?? request.nextUrl.searchParams.get("branch_id"),
    className: request.nextUrl.searchParams.get("className") ?? request.nextUrl.searchParams.get("class_name"),
    section: request.nextUrl.searchParams.get("section"),
  });

  if (result.ok === false) {
    return jsonError(result.message, result.status);
  }

  return NextResponse.json({
    ok: true,
    ...result.value,
  });
}
