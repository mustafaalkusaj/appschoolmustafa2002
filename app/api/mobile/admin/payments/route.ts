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

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Try student_payments table first
    try {
      let paymentsQuery = serviceSupabase
        .from("student_payments")
        .select(
          "id, student_id, full_name, class_name, section, total_fee, paid_fee, remaining_fee",
          { count: "exact" },
        )
        .eq("school_id", schoolId)
        .order("remaining_fee", { ascending: false })
        .range(from, to)
        .returns<
          {
            id: string;
            student_id: string | null;
            full_name: string | null;
            class_name: string | null;
            section: string | null;
            total_fee: number | null;
            paid_fee: number | null;
            remaining_fee: number | null;
          }[]
        >();

      if (search.trim()) {
        paymentsQuery = paymentsQuery.ilike("full_name", `%${search.trim()}%`);
      }

      const { data, error, count } = await paymentsQuery;

      if (error) throw error;

      const items = (data ?? []).map((p) => ({
        id: p.id as string,
        student_id: (p.student_id as string | null) ?? null,
        full_name: (p.full_name as string | null) ?? "",
        class_name: (p.class_name as string | null) ?? null,
        section: (p.section as string | null) ?? null,
        total_fee: Number(p.total_fee ?? 0),
        paid_fee: Number(p.paid_fee ?? 0),
        remaining_fee: Number(p.remaining_fee ?? 0),
      }));

      return NextResponse.json({ ok: true, items, total: count ?? 0, page, limit });
    } catch {
      // student_payments table not available — fall back to students table
    }

    // Fallback: query students table directly
    let studentsQuery = serviceSupabase
      .from("students")
      .select(
        "id, full_name, class_name, section, total_fee, paid_fee, remaining_fee",
        { count: "exact" },
      )
      .eq("school_id", schoolId)
      .is("deleted_at", null)
      .order("remaining_fee", { ascending: false })
      .range(from, to);

    if (search.trim()) {
      studentsQuery = studentsQuery.ilike("full_name", `%${search.trim()}%`);
    }

    const { data, error, count } = await studentsQuery;

    if (error) throw error;

    const items = (data ?? []).map((s) => ({
      id: s.id as string,
      student_id: s.id as string,
      full_name: (s.full_name as string | null) ?? "",
      class_name: (s.class_name as string | null) ?? null,
      section: (s.section as string | null) ?? null,
      total_fee: Number((s as Record<string, unknown>).total_fee ?? 0),
      paid_fee: Number((s as Record<string, unknown>).paid_fee ?? 0),
      remaining_fee: Number((s as Record<string, unknown>).remaining_fee ?? 0),
    }));

    return NextResponse.json({ ok: true, items, total: count ?? 0, page, limit });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
