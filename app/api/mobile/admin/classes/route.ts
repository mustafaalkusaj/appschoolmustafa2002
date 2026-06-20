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
