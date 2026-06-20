import { NextRequest, NextResponse } from "next/server";

import { resolveAdminMobileRouteContext } from "@/lib/mobile-admin-server";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveAdminMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const { schoolId, serviceSupabase } = context.value;
    const url = new URL(req.url);

    const search = url.searchParams.get("search") ?? "";
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? "50")));

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = serviceSupabase
      .from("teachers")
      .select("id, full_name, subject, phone, is_active", { count: "exact" })
      .eq("school_id", schoolId)
      .order("full_name", { ascending: true })
      .range(from, to);

    if (search.trim()) {
      query = query.ilike("full_name", `%${search.trim()}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const items = (data ?? []).map((t) => ({
      id: t.id as string,
      full_name: (t.full_name as string | null) ?? "",
      subject: (t.subject as string | null) ?? null,
      phone: (t.phone as string | null) ?? null,
      is_active: (t.is_active as boolean | null) ?? true,
    }));

    return NextResponse.json({ ok: true, items, total: count ?? 0, page, limit });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
