import { NextRequest, NextResponse } from "next/server";

import {
  AVAILABLE_GATE,
  featureGateFromError,
  parseMobileListParams,
  resolveMobileRouteContextAny,
} from "@/lib/mobile-api-admin";

export async function GET(req: NextRequest) {
  const context = await resolveMobileRouteContextAny(req, "admin");
  if (!context.ok) return context.response;

  const { serviceSupabase, schoolId } = context.value;
  const params = parseMobileListParams(req);
  const url = new URL(req.url);
  const date =
    url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  let query = serviceSupabase
    .from("attendance_records")
    .select("*")
    .eq("school_id", schoolId)
    .eq("date", date)
    .order("created_at", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (params.search) {
    query = query.or(`student_name.ilike.%${params.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({
      ok: true,
      gate: featureGateFromError(error, "attendance_records"),
      items: [],
    });
  }

  return NextResponse.json({
    ok: true,
    gate: AVAILABLE_GATE,
    items: data ?? [],
    page: params.page,
    limit: params.limit,
    date,
  });
}
