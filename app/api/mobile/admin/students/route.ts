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
    const status = url.searchParams.get("status");

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = serviceSupabase
      .from("students")
      .select(
        "id, name_ar, name_en, class_id, parent_phone, status",
        { count: "exact" },
      )
      .eq("school_id", schoolId)
      .is("deleted_at", null)
      .order("name_ar", { ascending: true })
      .range(from, to);

    if (status) {
      query = query.eq("status", status);
    }

    if (search.trim()) {
      query = query.or(
        `name_ar.ilike.%${search.trim()}%,name_en.ilike.%${search.trim()}%`,
      );
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const items = (data ?? []).map((s) => ({
      id: s.id,
      full_name: (s.name_ar as string | null) ?? (s.name_en as string | null) ?? "",
      full_name_en: (s.name_en as string | null) ?? "",
      class_id: (s.class_id as string | null) ?? null,
      phone: (s.parent_phone as string | null) ?? null,
      status: (s.status as string | null) ?? "active",
    }));

    return NextResponse.json({ ok: true, items, total: count ?? 0, page, limit });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
