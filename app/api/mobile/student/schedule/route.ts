import { NextRequest, NextResponse } from "next/server";

import {
  AVAILABLE_GATE,
  featureGateFromError,
} from "@/lib/mobile-api-admin";
import { resolveMobileRouteContext } from "@/lib/mobile-api-server";

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
    .select("class_id")
    .eq("id", studentId)
    .maybeSingle();

  const classId = studentRow?.class_id;
  if (!classId) {
    return NextResponse.json({ ok: true, gate: AVAILABLE_GATE, items: [] });
  }

  const { data, error } = await serviceSupabase
    .from("class_schedules")
    .select("*")
    .eq("school_id", schoolId)
    .eq("class_id", classId)
    .order("day", { ascending: true })
    .order("start_time", { ascending: true });

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
  });
}
