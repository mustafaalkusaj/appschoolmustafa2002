import { NextRequest, NextResponse } from "next/server";

import { resolveAdminMobileRouteContext } from "@/lib/mobile-admin-server";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveAdminMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const { schoolId, serviceSupabase } = context.value;

    const { data, error } = await serviceSupabase
      .from("classes")
      .select("id, name_ar, name_en, grade_level, academic_year_id")
      .eq("school_id", schoolId)
      .is("deleted_at", null)
      .order("grade_level", { ascending: true })
      .order("name_ar", { ascending: true });

    if (error) throw error;

    const items = (data ?? []).map((c) => ({
      id: c.id as string,
      name: (c.name_ar as string | null) ?? (c.name_en as string | null) ?? "",
      name_en: (c.name_en as string | null) ?? "",
      grade_level: (c.grade_level as number | null) ?? null,
      academic_year_id: (c.academic_year_id as string | null) ?? null,
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
    const body = await req.json();

    const { name_ar, name_en, grade_level } = body as {
      name_ar?: string;
      name_en?: string;
      grade_level?: number;
    };

    if (!name_ar || typeof name_ar !== "string" || !name_ar.trim()) {
      return NextResponse.json(
        { ok: false, error: "missing_required_field" },
        { status: 400 },
      );
    }

    const { data, error } = await serviceSupabase
      .from("classes")
      .insert({
        school_id: schoolId,
        name_ar: name_ar.trim(),
        name_en: name_en ?? null,
        grade_level: grade_level ?? null,
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      item: { id: data.id, name: name_ar.trim() },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
