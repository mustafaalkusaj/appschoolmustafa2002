import { NextRequest, NextResponse } from "next/server";

import { resolveAdminMobileRouteContext } from "@/lib/mobile-admin-server";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveAdminMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const { schoolId, serviceSupabase } = context.value;

    const { data, error } = await serviceSupabase
      .from("classes")
      .select("id, name, grade, section")
      .eq("school_id", schoolId)
      .order("grade", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;

    const items = (data ?? []).map((c) => ({
      id: c.id as string,
      name: (c.name as string | null) ?? "",
      grade: (c.grade as string | null) ?? null,
      section: (c.section as string | null) ?? null,
    }));

    return NextResponse.json({ ok: true, items });
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

    // Canonical column names, with legacy client field-name fallback for OTA rollout.
    const name =
      (typeof body.name === "string" && body.name) ||
      (typeof body.name_ar === "string" && body.name_ar) ||
      "";
    const grade =
      (typeof body.grade === "string" && body.grade) ||
      (body.grade_level != null ? String(body.grade_level) : null);
    const section = (typeof body.section === "string" && body.section) || null;

    if (!name.trim()) {
      return NextResponse.json(
        { ok: false, error: "missing_required_field" },
        { status: 400 },
      );
    }

    const { data, error } = await serviceSupabase
      .from("classes")
      .insert({
        school_id: schoolId,
        name: name.trim(),
        grade,
        section,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      item: { id: data.id, name: name.trim() },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
