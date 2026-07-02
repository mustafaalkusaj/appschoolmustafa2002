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

  if (!teacherId) {
    return NextResponse.json({ ok: true, gate: AVAILABLE_GATE, items: [] });
  }

  const { data, error } = await serviceSupabase
    .from("class_schedules")
    .select("*, classes(name), subjects(name)")
    .eq("teacher_id", teacherId)
    .eq("school_id", schoolId)
    .order("day_of_week", { ascending: true })
    .range(params.offset, params.offset + params.limit - 1);

  if (error) {
    return NextResponse.json({
      ok: true,
      gate: featureGateFromError(error, "class_schedules"),
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
