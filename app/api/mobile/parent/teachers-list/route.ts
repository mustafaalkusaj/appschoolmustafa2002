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
      teachers: [],
    });
  }

  const studentIds = (links ?? []).map((l) => l.student_id).filter(Boolean);

  if (!studentIds.length) {
    return NextResponse.json({ ok: true, gate: AVAILABLE_GATE, teachers: [] });
  }

  const { data: teacherLinks } = await serviceSupabase
    .from("student_teacher_links")
    .select("teacher_id")
    .in("student_id", studentIds);

  const teacherIds = Array.from(new Set((teacherLinks ?? []).map((l) => l.teacher_id).filter(Boolean)));

  if (!teacherIds.length) {
    return NextResponse.json({ ok: true, gate: AVAILABLE_GATE, teachers: [] });
  }

  const { data: teachers, error: teachError } = await serviceSupabase
    .from("teachers")
    .select("*")
    .eq("school_id", schoolId)
    .in("id", teacherIds)
    .order("full_name", { ascending: true });

  if (teachError) {
    return NextResponse.json({
      ok: true,
      gate: featureGateFromError(teachError, "teachers"),
      teachers: [],
    });
  }

  return NextResponse.json({
    ok: true,
    gate: AVAILABLE_GATE,
    teachers: teachers ?? [],
  });
}
