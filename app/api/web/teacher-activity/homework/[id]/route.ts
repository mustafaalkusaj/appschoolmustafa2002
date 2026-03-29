import { NextRequest, NextResponse } from "next/server";

import { validateHomeworkModerationInput } from "@/lib/teacher-activity";
import {
  deleteHomeworkByAdmin,
  getHomeworkDetail,
  jsonError,
  updateHomeworkByAdmin,
} from "@/lib/teacher-activity-server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const result = await getHomeworkDetail(
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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const body = await request.json().catch(() => null);
  const validation = validateHomeworkModerationInput(body);
  if (!validation.ok) {
    return jsonError(validation.message, 400, validation.fieldErrors);
  }

  const payload = body && typeof body === "object" ? (body as { schoolId?: string | null; school_id?: string | null }) : {};
  const { id } = await context.params;
  const result = await updateHomeworkByAdmin(request, id, {
    ...validation.value,
    schoolId: payload.schoolId ?? payload.school_id ?? null,
  });

  if (result.ok === false) {
    return jsonError(result.message, result.status);
  }

  return NextResponse.json({
    ok: true,
    item: result.value,
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const body = await request.json().catch(() => null);
  const payload =
    body && typeof body === "object"
      ? (body as { schoolId?: string | null; school_id?: string | null; reason?: string | null })
      : {};
  const { id } = await context.params;
  const result = await deleteHomeworkByAdmin(request, id, {
    schoolId: payload.schoolId ?? payload.school_id ?? null,
    reason: typeof payload.reason === "string" ? payload.reason.trim() || null : null,
  });

  if (result.ok === false) {
    return jsonError(result.message, result.status);
  }

  return NextResponse.json({
    ok: true,
    ...result.value,
  });
}
