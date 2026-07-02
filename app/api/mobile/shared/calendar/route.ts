import { NextRequest, NextResponse } from "next/server";

import {
  AVAILABLE_GATE,
  featureGateFromError,
  resolveMobileRouteContextAny,
} from "@/lib/mobile-api-admin";

export async function GET(req: NextRequest) {
  const context = await resolveMobileRouteContextAny(req);
  if (!context.ok) return context.response;

  const { serviceSupabase, schoolId } = context.value;

  const url = new URL(req.url);
  const month = url.searchParams.get("month");

  let query = serviceSupabase
    .from("calendar_events")
    .select("*")
    .eq("school_id", schoolId)
    .order("date", { ascending: true });

  if (month) {
    const start = `${month}-01`;
    const end = `${month}-31`;
    query = query.gte("date", start).lte("date", end);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({
      ok: true,
      gate: featureGateFromError(error, "calendar_events"),
      items: [],
    });
  }

  return NextResponse.json({
    ok: true,
    gate: AVAILABLE_GATE,
    items: data ?? [],
  });
}
