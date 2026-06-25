import { NextRequest, NextResponse } from "next/server";

import { resolveAdminMobileRouteContext } from "@/lib/mobile-admin-server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await resolveAdminMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const { schoolId, serviceSupabase } = context.value;
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
    }

    // Scope check: verify ad belongs to this school
    const { data: existing, error: findError } = await serviceSupabase
      .from("ads")
      .select("id")
      .eq("id", id)
      .eq("school_id", schoolId)
      .single();

    if (findError || !existing) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    const body = await req.json() as Record<string, unknown>;

    // Build allowed update payload (only known fields)
    const allowed: Record<string, unknown> = {};
    const fields = [
      "type", "title", "body", "bg_color", "image_url", "target_date",
      "social_url", "social_label", "video_url", "doc_url", "doc_pages",
      "is_active", "starts_at", "ends_at",
    ] as const;
    for (const field of fields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        allowed[field] = body[field];
      }
    }

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ ok: false, error: "no_fields_to_update" }, { status: 400 });
    }

    const { data, error } = await serviceSupabase
      .from("ads")
      .update(allowed)
      .eq("id", id)
      .eq("school_id", schoolId)
      .select("id, type, title, body, bg_color, image_url, target_date, social_url, social_label, video_url, doc_url, doc_pages, is_active, starts_at, ends_at, created_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, item: data });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await resolveAdminMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const { schoolId, serviceSupabase } = context.value;
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
    }

    // Scope check: verify ad belongs to this school
    const { data: existing, error: findError } = await serviceSupabase
      .from("ads")
      .select("id")
      .eq("id", id)
      .eq("school_id", schoolId)
      .single();

    if (findError || !existing) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    const { error } = await serviceSupabase
      .from("ads")
      .delete()
      .eq("id", id)
      .eq("school_id", schoolId);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
