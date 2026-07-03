import { NextRequest, NextResponse } from "next/server";

import {
  AVAILABLE_GATE,
  featureGateFromError,
  resolveMobileRouteContextAny,
} from "@/lib/mobile-api-admin";
import { buildScheduleItems } from "@/lib/mobile-schedule";

export async function GET(req: NextRequest) {
  const context = await resolveMobileRouteContextAny(req);
  if (!context.ok) return context.response;

  const { serviceSupabase, schoolId, role, authUserId } = context.value;

  let query = serviceSupabase
    .from("class_schedules")
    .select("*")
    .eq("school_id", schoolId)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (role === "student") {
    const { data: student } = await serviceSupabase
      .from("students")
      .select("class_name, section")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (student?.class_name) {
      query = query.eq("class_name", student.class_name);
      if (student.section) {
        query = query.eq("section", student.section);
      }
    }
  } else if (role === "teacher") {
    const { data: teacher } = await serviceSupabase
      .from("teachers")
      .select("id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (teacher?.id) {
      query = query.eq("teacher_id", teacher.id);
    }
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
