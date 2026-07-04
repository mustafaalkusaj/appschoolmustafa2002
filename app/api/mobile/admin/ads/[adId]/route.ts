import { NextRequest, NextResponse } from "next/server";

import { resolveMobileRouteContextAny } from "@/lib/mobile-api-admin";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ adId: string }> },
) {
  const context = await resolveMobileRouteContextAny(req, "admin");
  if (!context.ok) return context.response;

  const { adId } = await params;
  const { serviceSupabase, schoolId } = context.value;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "بيانات غير صالحة." } },
      { status: 400 },
    );
  }

  const ALLOWED_FIELDS = [
    "type",
    "title",
    "body",
    "bg_color",
    "is_active",
    "starts_at",
    "ends_at",
    "social_label",
    "social_url",
    "image_url",
    "target_date",
    "video_url",
    "doc_url",
    "doc_pages",
  ] as const;

  const allowed: Record<string, unknown> = {};
  for (const field of ALLOWED_FIELDS) {
    if (field in body) {
      allowed[field] = body[field];
    }
  }

  const { data, error } = await serviceSupabase
    .from("advertisements")
    .update({ ...allowed, school_id: schoolId })
    .eq("id", adId)
    .eq("school_id", schoolId)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: { message: error.message } },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ adId: string }> },
) {
  const context = await resolveMobileRouteContextAny(req, "admin");
  if (!context.ok) return context.response;

  const { adId } = await params;
  const { serviceSupabase, schoolId } = context.value;

  const { error } = await serviceSupabase
    .from("advertisements")
    .delete()
    .eq("id", adId)
    .eq("school_id", schoolId);

  if (error) {
    return NextResponse.json(
      { ok: false, error: { message: error.message } },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
