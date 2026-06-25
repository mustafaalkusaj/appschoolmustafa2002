import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";

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

  const patch: Record<string, unknown> = {};
  if (body.title      !== undefined) patch.title       = body.title;
  if (body.body       !== undefined) patch.body        = body.body       || null;
  if (body.bgColor    !== undefined) patch.bg_color    = body.bgColor    || null;
  if (body.imageUrl   !== undefined) patch.image_url   = body.imageUrl   || null;
  if (body.targetDate !== undefined) patch.target_date = body.targetDate || null;
  if (body.socialUrl  !== undefined) patch.social_url  = body.socialUrl  || null;
  if (body.socialLabel !== undefined) patch.social_label = body.socialLabel || null;
  if (body.videoUrl   !== undefined) patch.video_url   = body.videoUrl   || null;
  if (body.docUrl     !== undefined) patch.doc_url     = body.docUrl     || null;
  if (body.docPages   !== undefined) patch.doc_pages   = body.docPages   ?? null;
  if (typeof body.isActive === "boolean") patch.is_active = body.isActive;
  if (body.startsAt   !== undefined) patch.starts_at   = body.startsAt   || null;
  if (body.endsAt     !== undefined) patch.ends_at     = body.endsAt     || null;
  patch.updated_at = new Date().toISOString();

  const { error } = await actorSupabase
    .from("ads")
    .update(patch)
    .eq("id", id)
    .eq("school_id", targetSchoolId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
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

  const { error } = await actorSupabase
    .from("ads")
    .delete()
    .eq("id", id)
    .eq("school_id", targetSchoolId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
