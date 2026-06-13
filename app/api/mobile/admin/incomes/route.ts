import { NextRequest, NextResponse } from "next/server";

import { resolveAdminMobileRouteContext } from "@/lib/mobile-admin-server";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveAdminMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const { schoolId, serviceSupabase } = context.value;
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") || "20")));
    const offset = (page - 1) * pageSize;
    const fromDate = url.searchParams.get("fromDate");
    const toDate = url.searchParams.get("toDate");

    let query = serviceSupabase
      .from("incomes")
      .select("id, amount, income_date, source, notes, created_at, income_types(name)", {
        count: "exact",
      })
      .eq("school_id", schoolId)
      .order("income_date", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (fromDate) query = query.gte("income_date", fromDate);
    if (toDate) query = query.lte("income_date", toDate);

    const { data, error, count } = await query;

    if (error) throw error;

    const incomes = (data ?? []).map((row) => ({
      id: row.id,
      amount: row.amount,
      income_date: row.income_date,
      source: row.source ?? null,
      notes: row.notes ?? null,
      created_at: row.created_at,
      income_type_name: (row.income_types as { name?: string } | null)?.name ?? null,
    }));

    return NextResponse.json({ ok: true, incomes, total: count ?? 0, page, pageSize });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
