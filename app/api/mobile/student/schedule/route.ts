import { NextRequest, NextResponse } from "next/server";

import {
  AVAILABLE_GATE,
  featureGateFromError,
} from "@/lib/mobile-api-admin";
import { resolveMobileRouteContext } from "@/lib/mobile-api-server";
import { buildScheduleItems } from "@/lib/mobile-schedule";

export async function GET(req: NextRequest) {
  const context = await resolveMobileRouteContext(req, "student");
  if (!context.ok) return context.response;

  const { serviceSupabase, schoolId, account } = context.value;
  const studentId = account.student?.id;

  if (!studentId) {
    return NextResponse.json({ ok: true, gate: AVAILABLE_GATE, items: [] });
  }

  const { data: studentRow } = await serviceSupabase
    .from("students")
    .select("class_name, section")
    .eq("id", studentId)
    .maybeSingle();

  const className = studentRow?.class_name;
  if (!className) {
    return NextResponse.json({ ok: true, gate: AVAILABLE_GATE, items: [] });
  }

  let query = serviceSupabase
    .from("class_schedules")
    .select("*")
    .eq("school_id", schoolId)
    .eq("class_name", className)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (studentRow?.section) {
    query = query.eq("section", studentRow.section);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({
      ok: true,
      gate: featureGateFromError(error, "class_schedules"),
      items: [],
    });
  }

  const items = await buildScheduleItems(serviceSupabase, data);

  return NextResponse.json({
    ok: true,
    gate: AVAILABLE_GATE,
    items,
  });
}
