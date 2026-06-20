import { NextRequest, NextResponse } from "next/server";

import { resolveSuperAdminMobileRouteContext } from "@/lib/mobile-super-admin-server";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveSuperAdminMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const { serviceSupabase } = context.value;

    const url = new URL(req.url);
    const search = url.searchParams.get("search") ?? "";
    const status = url.searchParams.get("status") ?? "all";

    let query = serviceSupabase
      .from("managed_user_profiles")
      .select("auth_user_id, full_name, school_id, is_active, role, created_at")
      .eq("role", "admin");

    if (search.trim()) {
      query = query.ilike("full_name", `%${search.trim()}%`);
    }

    if (status === "active") {
      query = query.eq("is_active", true);
    } else if (status === "inactive") {
      query = query.eq("is_active", false);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ ok: true, items: data ?? [] });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
