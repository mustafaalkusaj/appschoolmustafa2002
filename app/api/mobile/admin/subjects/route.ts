import { NextRequest, NextResponse } from "next/server";

import { resolveAdminMobileRouteContext } from "@/lib/mobile-admin-server";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveAdminMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const { schoolId, serviceSupabase } = context.value;

    const { data, error } = await serviceSupabase
      .from("subjects")
      .select("id, name_ar, name_en, code, teacher_assignments(count)")
      .eq("school_id", schoolId)
      .is("deleted_at", null)
      .order("name_ar", { ascending: true });

    if (error) throw error;

    const items = (data ?? []).map((s) => ({
      id: s.id as string,
      name: (s.name_ar as string | null) ?? (s.name_en as string | null) ?? "",
      name_en: (s.name_en as string | null) ?? "",
      code: (s.code as string | null) ?? null,
      teacher_count: Array.isArray(s.teacher_assignments)
        ? (s.teacher_assignments[0] as { count: number } | undefined)?.count ?? 0
        : 0,
    }));

    return NextResponse.json({ ok: true, items });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
