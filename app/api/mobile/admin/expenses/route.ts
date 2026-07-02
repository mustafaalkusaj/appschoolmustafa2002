import { NextRequest, NextResponse } from "next/server";

import {
  AVAILABLE_GATE,
  featureGateFromError,
  parseMobileListParams,
} from "@/lib/mobile-api-admin";
import { resolveMobileRouteContext } from "@/lib/mobile-api-server";

export async function GET(req: NextRequest) {
  const context = await resolveMobileRouteContext(req, "admin");
  if (!context.ok) return context.response;

  const { serviceSupabase, schoolId, branchId } = context.value;
  const params = parseMobileListParams(req);

  let query = serviceSupabase
    .from("expenses")
    .select("*", { count: "exact" })
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  if (params.search) {
    query = query.ilike("description", `%${params.search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({
      ok: true,
      gate: featureGateFromError(error, "expenses"),
      items: [],
    });
  }

  return NextResponse.json({
    ok: true,
    gate: AVAILABLE_GATE,
    items: data ?? [],
    total: count ?? 0,
    page: params.page,
    limit: params.limit,
  });
}
