import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import {
  updateAnnouncement,
  deleteAnnouncement,
} from "@/lib/notifications/announcements-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const context = await resolveSchoolScopedActorContext(
    body.schoolId ?? null,
    { allowedRoles: ["admin", "super_admin"], roleDeniedMessage: "ليس لديك صلاحية تعديل الإعلانات." },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorSupabase, targetSchoolId } = context.value;
  const result = await updateAnnouncement(actorSupabase, id, targetSchoolId, {
    title:     body.title,
    body:      body.body,
    isPinned:  typeof body.isPinned === "boolean" ? body.isPinned : undefined,
    mediaUrl:  body.mediaUrl  !== undefined ? (body.mediaUrl  || null) : undefined,
    mediaType: body.mediaType !== undefined ? (body.mediaType || null) : undefined,
    expiresAt: body.expiresAt !== undefined ? (body.expiresAt || null) : undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const requestedSchoolId = request.nextUrl.searchParams.get("schoolId");

  const context = await resolveSchoolScopedActorContext(
    requestedSchoolId,
    { allowedRoles: ["admin", "super_admin"], roleDeniedMessage: "ليس لديك صلاحية حذف الإعلانات." },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorSupabase, targetSchoolId } = context.value;
  const result = await deleteAnnouncement(actorSupabase, id, targetSchoolId);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
