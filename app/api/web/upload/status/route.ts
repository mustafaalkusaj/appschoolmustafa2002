import { NextRequest, NextResponse } from "next/server";

import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { jsonError } from "@/lib/route-utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return jsonError("Token is required.", 400);
  }

  const sb = createServiceSupabaseClient();

  const { data, error } = await sb
    .from("upload_sessions")
    .select("status, image_url")
    .eq("token", token)
    .single();

  if (error || !data) {
    return jsonError("Session not found.", 404);
  }

  return NextResponse.json({ status: data.status, image_url: data.image_url });
}
