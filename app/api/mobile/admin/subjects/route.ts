import { NextRequest, NextResponse } from "next/server";

import { resolveAdminMobileRouteContext } from "@/lib/mobile-admin-server";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveAdminMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const { schoolId, serviceSupabase } = context.value;

    const { data, error } = await serviceSupabase
      .from("subjects")
      .select("id, name, is_active, teacher_assignments(count)")
      .eq("school_id", schoolId)
      .order("name", { ascending: true });

    if (error) throw error;

    const items = (data ?? []).map((s) => ({
      id: s.id as string,
      name: (s.name as string | null) ?? "",
      is_active: (s.is_active as boolean | null) ?? true,
      teacher_count: Array.isArray(s.teacher_assignments)
        ? ((s.teacher_assignments[0] as { count: number } | undefined)?.count ??
          0)
        : 0,
    }));

    return NextResponse.json({ ok: true, items });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await resolveAdminMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const { schoolId, serviceSupabase } = context.value;
    const body = (await req.json()) as Record<string, unknown>;

    // Canonical column `name`, with legacy client field-name fallback for OTA rollout.
    const name =
      (typeof body.name === "string" && body.name) ||
      (typeof body.name_ar === "string" && body.name_ar) ||
      "";

    if (!name.trim()) {
      return NextResponse.json(
        { ok: false, error: "missing_required_field" },
        { status: 400 },
      );
    }

    const { data, error } = await serviceSupabase
      .from("subjects")
      .insert({
        school_id: schoolId,
        name: name.trim(),
        is_active: true,
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      item: { id: data.id, name: name.trim() },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
