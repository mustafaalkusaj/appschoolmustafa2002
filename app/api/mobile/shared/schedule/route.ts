import { NextRequest, NextResponse } from "next/server";

import {
  AVAILABLE_GATE,
  featureGateFromError,
  resolveMobileRouteContextAny,
} from "@/lib/mobile-api-admin";

export async function GET(req: NextRequest) {
  const context = await resolveMobileRouteContextAny(req);
  if (!context.ok) return context.response;

  const { serviceSupabase, schoolId, role, authUserId } = context.value;

  let query = serviceSupabase
    .from("class_schedules")
    .select("*")
    .eq("school_id", schoolId)
    .order("day", { ascending: true })
    .order("start_time", { ascending: true });

  if (role === "student") {
    const { data: student } = await serviceSupabase
      .from("students")
      .select("class_id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (student?.class_id) {
      query = query.eq("class_id", student.class_id);
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

  return NextResponse.json({
    ok: true,
    gate: AVAILABLE_GATE,
    items: data ?? [],
  });
}
