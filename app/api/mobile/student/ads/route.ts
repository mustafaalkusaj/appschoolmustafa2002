import { NextRequest, NextResponse } from "next/server";

import {
  AVAILABLE_GATE,
  featureGateFromError,
} from "@/lib/mobile-api-admin";
import { resolveMobileRouteContext } from "@/lib/mobile-api-server";

export async function GET(req: NextRequest) {
  const context = await resolveMobileRouteContext(req, "student");
  if (!context.ok) return context.response;

  const { serviceSupabase, schoolId } = context.value;

  const now = new Date().toISOString();

  const { data, error } = await serviceSupabase
    .from("advertisements")
    .select("*")
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({
      ok: true,
      gate: featureGateFromError(error, "advertisements"),
      items: [],
    });
  }

  return NextResponse.json({
    ok: true,
    gate: AVAILABLE_GATE,
    items: data ?? [],
  });
}
