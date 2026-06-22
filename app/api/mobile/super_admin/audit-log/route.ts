import { NextRequest, NextResponse } from "next/server";

import { resolveSuperAdminMobileRouteContext } from "@/lib/mobile-super-admin-server";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveSuperAdminMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const { serviceSupabase } = context.value;
    const url = new URL(req.url);

    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 50)));
    const offset = (page - 1) * limit;
    const action = url.searchParams.get("action") || null;
    const schoolId = url.searchParams.get("school_id") || null;

    let query = serviceSupabase
      .from("audit_logs")
      .select("id, school_id, user_id, action, resource, resource_id, ip_address, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (action) query = query.eq("action", action);
    if (schoolId) query = query.eq("school_id", schoolId);

    const { data, error, count } = await query;
    if (error) throw error;

    const rows = data ?? [];

    // Resolve actor display names (audit rows only carry the auth user id).
    const userIds = Array.from(
      new Set(rows.map((row) => row.user_id).filter((id): id is string => Boolean(id))),
    );
    const nameById = new Map<string, string>();
    if (userIds.length) {
      const { data: profiles } = await serviceSupabase
        .from("managed_user_profiles")
        .select("auth_user_id, full_name")
        .in("auth_user_id", userIds);
      for (const profile of profiles ?? []) {
        if (profile.auth_user_id && profile.full_name) {
          nameById.set(profile.auth_user_id, profile.full_name);
        }
      }
    }

    const items = rows.map((row) => ({
      ...row,
      actor_name: row.user_id ? nameById.get(row.user_id) ?? null : null,
    }));

    return NextResponse.json({ ok: true, items, total: count ?? 0, page, limit });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
