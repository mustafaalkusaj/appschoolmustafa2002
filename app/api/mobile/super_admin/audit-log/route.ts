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

    // Resolve actor display names — check managed_user_profiles first, then auth metadata.
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

      const unresolvedIds = userIds.filter((id) => !nameById.has(id));
      if (unresolvedIds.length) {
        const { data: authUsers } = await serviceSupabase.auth.admin.listUsers({ perPage: 100 });
        for (const u of authUsers?.users ?? []) {
          if (unresolvedIds.includes(u.id)) {
            const name = u.user_metadata?.full_name ?? u.email?.split("@")[0] ?? null;
            if (name) nameById.set(u.id, name);
          }
        }
      }
    }

    // Resolve resource_id to human-readable labels where possible.
    const RESOURCE_TABLE: Record<string, { table: string; col: string }> = {
      students: { table: "students", col: "full_name" },
      student: { table: "students", col: "full_name" },
      teachers: { table: "teachers", col: "full_name" },
      teacher: { table: "teachers", col: "full_name" },
      classes: { table: "classes", col: "name" },
      class: { table: "classes", col: "name" },
      subjects: { table: "subjects", col: "name" },
      subject: { table: "subjects", col: "name" },
    };

    const resourceLabelById = new Map<string, string>();
    const lookupEntries: { table: string; col: string; ids: string[] }[] = [];
    const seen = new Map<string, Set<string>>();
    for (const row of rows) {
      if (!row.resource_id || !row.resource) continue;
      const mapping = RESOURCE_TABLE[row.resource.toLowerCase()];
      if (!mapping) continue;
      const key = `${mapping.table}:${mapping.col}`;
      if (!seen.has(key)) seen.set(key, new Set());
      seen.get(key)!.add(row.resource_id);
    }
    seen.forEach((ids, key) => {
      const [table, col] = key.split(":");
      lookupEntries.push({ table, col, ids: Array.from(ids) });
    });

    for (const { table, col, ids } of lookupEntries) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: resolved } = await (serviceSupabase as any)
        .from(table)
        .select(`id, ${col}`)
        .in("id", ids);
      for (const r of (resolved ?? []) as Record<string, unknown>[]) {
        if (r.id && r[col]) resourceLabelById.set(r.id as string, r[col] as string);
      }
    }

    const items = rows.map((row) => ({
      ...row,
      actor_name: row.user_id ? nameById.get(row.user_id) ?? null : null,
      resource_label: row.resource_id ? resourceLabelById.get(row.resource_id) ?? null : null,
    }));

    return NextResponse.json({ ok: true, items, total: count ?? 0, page, limit });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
