import { NextRequest, NextResponse } from "next/server";

import { resolveAdminMobileRouteContext } from "@/lib/mobile-admin-server";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveAdminMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const { schoolId, serviceSupabase } = context.value;

    const { data, error } = await serviceSupabase
      .from("ads")
      .select(
        "id, type, title, body, bg_color, image_url, target_date, social_url, social_label, video_url, doc_url, doc_pages, is_active, starts_at, ends_at, created_at",
      )
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ ok: true, items: data ?? [] });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await resolveAdminMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const { schoolId, serviceSupabase } = context.value;

    const body = await req.json() as {
      type?: string;
      title?: string;
      body?: string;
      bg_color?: string;
      image_url?: string;
      target_date?: string;
      social_url?: string;
      social_label?: string;
      video_url?: string;
      doc_url?: string;
      doc_pages?: number;
      is_active?: boolean;
      starts_at?: string;
      ends_at?: string;
    };

    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { ok: false, error: "missing_required_field", field: "title" },
        { status: 400 },
      );
    }

    if (!body.type || typeof body.type !== "string") {
      return NextResponse.json(
        { ok: false, error: "missing_required_field", field: "type" },
        { status: 400 },
      );
    }

    const { data, error } = await serviceSupabase
      .from("ads")
      .insert({
        school_id: schoolId,
        type: body.type,
        title: body.title.trim(),
        body: body.body ?? null,
        bg_color: body.bg_color ?? null,
        image_url: body.image_url ?? null,
        target_date: body.target_date ?? null,
        social_url: body.social_url ?? null,
        social_label: body.social_label ?? null,
        video_url: body.video_url ?? null,
        doc_url: body.doc_url ?? null,
        doc_pages: body.doc_pages ?? null,
        is_active: body.is_active ?? true,
        starts_at: body.starts_at ?? null,
        ends_at: body.ends_at ?? null,
      })
      .select("id, type, title, body, bg_color, image_url, target_date, social_url, social_label, video_url, doc_url, doc_pages, is_active, starts_at, ends_at, created_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, item: data });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
