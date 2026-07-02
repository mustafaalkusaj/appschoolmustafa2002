import { NextRequest, NextResponse } from "next/server";

import {
  AVAILABLE_GATE,
  featureGateFromError,
  parseMobileListParams,
  resolveMobileRouteContextAny,
} from "@/lib/mobile-api-admin";

export async function GET(req: NextRequest) {
  const context = await resolveMobileRouteContextAny(req, "super_admin");
  if (!context.ok) return context.response;

  const { serviceSupabase } = context.value;
  const params = parseMobileListParams(req);

  const { data, error } = await serviceSupabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (error) {
    return NextResponse.json({
      ok: true,
      gate: featureGateFromError(error, "audit_logs"),
      items: [],
    });
  }

  return NextResponse.json({
    ok: true,
    gate: AVAILABLE_GATE,
    items: data ?? [],
    page: params.page,
    limit: params.limit,
  });
}
