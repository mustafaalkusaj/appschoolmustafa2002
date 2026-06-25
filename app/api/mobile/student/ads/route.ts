import { NextRequest, NextResponse } from "next/server";
import { resolveMobileRouteContext } from "@/lib/mobile-api-server";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req, "student");
    if (context.ok === false) {
      return context.response;
    }

    const { schoolId, serviceSupabase } = context.value;
    const now = new Date().toISOString();

    const { data, error } = await serviceSupabase
      .from("ads")
      .select(
        "id, type, title, body, bg_color, image_url, target_date, social_url, social_label, video_url, doc_url, doc_pages",
      )
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gt.${now}`)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, items: data ?? [] });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
