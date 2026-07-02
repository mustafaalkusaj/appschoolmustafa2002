import { NextRequest, NextResponse } from "next/server";

import {
  AVAILABLE_GATE,
  featureGateFromError,
  parseMobileListParams,
} from "@/lib/mobile-api-admin";
import { resolveMobileRouteContext } from "@/lib/mobile-api-server";

export async function GET(req: NextRequest) {
  const context = await resolveMobileRouteContext(req, "teacher");
  if (!context.ok) return context.response;

  const { serviceSupabase, schoolId, account } = context.value;
  const teacherId = account.teacher?.id;
  const params = parseMobileListParams(req);
  const url = new URL(req.url);
  const date =
    url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  if (!teacherId) {
    return NextResponse.json({ ok: true, gate: AVAILABLE_GATE, items: [] });
  }

  const { data, error } = await serviceSupabase
    .from("attendance_records")
    .select("*")
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId)
    .eq("date", date)
    .order("created_at", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

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
