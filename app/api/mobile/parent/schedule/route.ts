import { NextRequest, NextResponse } from "next/server";

import {
  AVAILABLE_GATE,
  featureGateFromError,
  resolveMobileRouteContextAny,
} from "@/lib/mobile-api-admin";

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
    .select("id, full_name, class_id")
    .eq("school_id", schoolId)
    .in("id", studentIds);

  const classIds = (students ?? []).map((s) => s.class_id).filter(Boolean);

  if (!classIds.length) {
    return NextResponse.json({ ok: true, gate: AVAILABLE_GATE, students: students ?? [], items: [] });
  }

  const { data: schedules, error: schedError } = await serviceSupabase
    .from("class_schedules")
    .select("*")
    .eq("school_id", schoolId)
    .in("class_id", classIds)
    .order("day", { ascending: true })
    .order("start_time", { ascending: true });

  if (schedError) {
    return NextResponse.json({
      ok: true,
      gate: featureGateFromError(schedError, "class_schedules"),
      students: students ?? [],
      items: [],
    });
  }

  return NextResponse.json({
    ok: true,
    gate: AVAILABLE_GATE,
    students: students ?? [],
    items: schedules ?? [],
  });
}
