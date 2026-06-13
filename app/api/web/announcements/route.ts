import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { createAnnouncement, listAnnouncements } from "@/lib/notifications/announcements-service";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const context = await resolveSchoolScopedActorContext(
    searchParams.get("schoolId"),
    { allowedRoles: ["admin", "super_admin", "employee"], roleDeniedMessage: "ليس لديك صلاحية عرض الإعلانات." },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorSupabase, targetSchoolId, actorBranchId, actorRole } = context.value;
  const requestedBranchId = searchParams.get("branchId");
  const branchId = requestedBranchId && (actorRole === "super_admin" || !actorBranchId)
    ? requestedBranchId
    : (actorBranchId ?? undefined);
  const page = Number(searchParams.get("page") || "1");
  const pageSize = Number(searchParams.get("pageSize") || "20");

  const result = await listAnnouncements(actorSupabase, targetSchoolId, {
    branchId: branchId ?? undefined,
    page,
    pageSize,
  });

  return NextResponse.json({ ok: true, ...result });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.title || !body?.body) {
    return NextResponse.json(
      { ok: false, error: "title and body are required" },
      { status: 400 },
    );
  }

  const context = await resolveSchoolScopedActorContext(
    body.schoolId ?? null,
    { allowedRoles: ["admin", "super_admin"], roleDeniedMessage: "ليس لديك صلاحية إنشاء الإعلانات." },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorSupabase, targetSchoolId, actorBranchId, actorRole, actorUserId } = context.value;
  const branchId = body.branchId && (actorRole === "super_admin" || !actorBranchId)
    ? body.branchId
    : (actorBranchId ?? null);

  const result = await createAnnouncement(actorSupabase, {
    schoolId: targetSchoolId,
    branchId,
    title: body.title,
    body: body.body,
    mediaUrl: body.mediaUrl,
    mediaType: body.mediaType,
    isPinned: body.isPinned ?? false,
    expiresAt: body.expiresAt,
    createdBy: actorUserId,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: result.item }, { status: 201 });
}
