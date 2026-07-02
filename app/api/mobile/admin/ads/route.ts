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

  const { data, error } = await serviceSupabase
    .from("advertisements")
    .select("*")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

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
    page: params.page,
    limit: params.limit,
  });
}

export async function POST(req: NextRequest) {
  const context = await resolveMobileRouteContextAny(req, "admin");
  if (!context.ok) return context.response;

  const { serviceSupabase, schoolId } = context.value;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "بيانات غير صالحة." } },
      { status: 400 },
    );
  }

  const { data, error } = await serviceSupabase
    .from("advertisements")
    .insert({ ...body, school_id: schoolId })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: { message: error.message } },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, data });
}
