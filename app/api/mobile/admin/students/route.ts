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
        "id, full_name, class_name, section, phone, parent_phone, status",
        { count: "exact" },
      )
      .eq("school_id", schoolId)
      .is("deleted_at", null)
      .order("full_name", { ascending: true })
      .range(from, to);

    if (status) {
      query = query.eq("status", status);
    }

    if (search.trim()) {
      // Single-column ilike (no raw .or() DSL) — avoids PostgREST filter injection.
      query = query.ilike("full_name", `%${search.trim()}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const items = (data ?? []).map((s) => ({
      id: s.id,
      full_name: (s.full_name as string | null) ?? "",
      class_name: (s.class_name as string | null) ?? null,
      section: (s.section as string | null) ?? null,
      phone: (s.phone as string | null) ?? (s.parent_phone as string | null) ?? null,
      status: (s.status as string | null) ?? "active",
    }));

    return NextResponse.json({ ok: true, items, total: count ?? 0, page, limit });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await resolveAdminMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const { schoolId, serviceSupabase } = context.value;
    const body = (await req.json()) as Record<string, unknown>;

    // Accept the canonical column names; fall back to the legacy client field
    // names so an un-updated mobile build keeps working during the OTA rollout.
    const fullName =
      (typeof body.full_name === "string" && body.full_name) ||
      (typeof body.name_ar === "string" && body.name_ar) ||
      (typeof body.name === "string" && body.name) ||
      "";
    const className =
      (typeof body.class_name === "string" && body.class_name) || null;
    const section = (typeof body.section === "string" && body.section) || null;
    const parentPhone =
      (typeof body.parent_phone === "string" && body.parent_phone) ||
      (typeof body.phone === "string" && body.phone) ||
      null;

    if (!fullName.trim()) {
      return NextResponse.json(
        { ok: false, error: "missing_required_field" },
        { status: 400 },
      );
    }

    const { data, error } = await serviceSupabase
      .from("students")
      .insert({
        school_id: schoolId,
        full_name: fullName.trim(),
        class_name: className,
        section,
        parent_phone: parentPhone,
        status: "active",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      item: { id: data.id, full_name: fullName.trim() },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
