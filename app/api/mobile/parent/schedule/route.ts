import { NextRequest, NextResponse } from "next/server";

import {
  AVAILABLE_GATE,
  featureGateFromError,
  resolveMobileRouteContextAny,
} from "@/lib/mobile-api-admin";
import { buildScheduleItems } from "@/lib/mobile-schedule";

export async function GET(req: NextRequest) {
  const context = await resolveMobileRouteContextAny(req, "parent");
  if (!context.ok) return context.response;

  const { serviceSupabase, schoolId, authUserId } = context.value;

  const { data: links, error: linkError } = await serviceSupabase
    .from("parent_student_links")
    .select("student_id")
    .eq("parent_id", authUserId);

  if (linkError) {
    return NextResponse.json({
      ok: true,
      gate: featureGateFromError(linkError, "parent_student_links"),
      students: [],
      items: [],
    });
  }

  const studentIds = (links ?? []).map((l) => l.student_id).filter(Boolean);

  if (!studentIds.length) {
    return NextResponse.json({ ok: true, gate: AVAILABLE_GATE, students: [], items: [] });
  }

  const { data: students } = await serviceSupabase
    .from("students")
    .select("id, full_name, class_name, section")
    .eq("school_id", schoolId)
    .in("id", studentIds);

  const classNames = Array.from(
    new Set((students ?? []).map((s) => s.class_name).filter(Boolean)),
  ) as string[];

  if (!classNames.length) {
    return NextResponse.json({ ok: true, gate: AVAILABLE_GATE, students: students ?? [], items: [] });
  }

  const { data: schedules, error: schedError } = await serviceSupabase
    .from("class_schedules")
    .select("*")
    .eq("school_id", schoolId)
    .in("class_name", classNames)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (schedError) {
    return NextResponse.json({
      ok: true,
      gate: featureGateFromError(schedError, "class_schedules"),
      students: students ?? [],
      items: [],
    });
  }

  const items = await buildScheduleItems(serviceSupabase, schedules);

  return NextResponse.json({
    ok: true,
    gate: AVAILABLE_GATE,
    students: students ?? [],
    items,
  });
}
