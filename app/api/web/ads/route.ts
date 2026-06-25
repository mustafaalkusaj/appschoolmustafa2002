import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";

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

  const { actorSupabase, targetSchoolId } = context.value;

  const { data, error } = await actorSupabase
    .from("ads")
    .select("*")
    .eq("school_id", targetSchoolId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, items: data ?? [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.title || !body?.type) {
    return NextResponse.json(
      { ok: false, error: "title and type are required" },
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

  const { actorSupabase, targetSchoolId, actorUserId } = context.value;

  const { data, error } = await actorSupabase
    .from("ads")
    .insert({
      school_id: targetSchoolId,
      type: body.type,
      title: body.title,
      body: body.body ?? null,
      bg_color: body.bgColor ?? "#4F46E5",
      image_url: body.imageUrl ?? null,
      target_date: body.targetDate ?? null,
      social_url: body.socialUrl ?? null,
      social_label: body.socialLabel ?? null,
      video_url: body.videoUrl ?? null,
      doc_url: body.docUrl ?? null,
      doc_pages: body.docPages ?? null,
      is_active: body.isActive ?? true,
      starts_at: body.startsAt ?? null,
      ends_at: body.endsAt ?? null,
      created_by: actorUserId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data }, { status: 201 });
}
