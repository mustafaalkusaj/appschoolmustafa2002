import { NextRequest, NextResponse } from "next/server";

import { validateFeeNotificationInput } from "@/lib/teacher-activity";
import { createFeeNotification, jsonError, listFeeNotifications } from "@/lib/teacher-activity-server";

export async function GET(request: NextRequest) {
  const page = Number(request.nextUrl.searchParams.get("page") || "1");
  const pageSize = Number(request.nextUrl.searchParams.get("pageSize") || request.nextUrl.searchParams.get("page_size") || "20");
  const result = await listFeeNotifications(request, {
    schoolId: request.nextUrl.searchParams.get("schoolId") ?? request.nextUrl.searchParams.get("school_id"),
    branchId: request.nextUrl.searchParams.get("branchId") ?? request.nextUrl.searchParams.get("branch_id"),
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : 20,
    search: request.nextUrl.searchParams.get("search"),
  });

  if (result.ok === false) {
    return jsonError(result.message, result.status);
  }

  return NextResponse.json({
    ok: true,
    items: result.value.items,
    totalCount: result.value.totalCount,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const validation = validateFeeNotificationInput(body);
  if (!validation.ok) {
    return jsonError(validation.message, 400, validation.fieldErrors);
  }

  const result = await createFeeNotification(request, validation.value);
  if (result.ok === false) {
    return jsonError(result.message, result.status);
  }

  return NextResponse.json(
    {
      ok: true,
      item: result.value,
    },
    { status: 201 },
  );
}
