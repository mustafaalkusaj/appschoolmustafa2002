import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jsonError } from "@/lib/route-utils";

function getService() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function GET(req: NextRequest) {
  const groupId = req.nextUrl.searchParams.get("groupId");
  if (!groupId) return jsonError("groupId مطلوب", 400);
  const service = getService();
  const { data, error } = await service
    .from("group_alerts")
    .select("*")
    .eq("group_id", groupId)
    .eq("is_read", false)
    .order("created_at", { ascending: false });
  if (error) return jsonError("تعذر جلب التنبيهات", 500);
  return NextResponse.json({ ok: true, alerts: data });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null) as { id?: string } | null;
  if (!body?.id) return jsonError("id مطلوب", 400);
  const service = getService();
  const { error } = await service.from("group_alerts").update({ is_read: true }).eq("id", body.id);
  if (error) return jsonError("تعذر تحديث التنبيه", 500);
  return NextResponse.json({ ok: true });
}
