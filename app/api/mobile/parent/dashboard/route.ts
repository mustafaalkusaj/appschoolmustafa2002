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
      children: [],
    });
  }

  const studentIds = (links ?? []).map((l) => l.student_id).filter(Boolean);

  if (!studentIds.length) {
    return NextResponse.json({ ok: true, gate: AVAILABLE_GATE, children: [] });
  }

  const { data: students } = await serviceSupabase
    .from("students")
    .select("*")
    .eq("school_id", schoolId)
    .in("id", studentIds);

  return NextResponse.json({
    ok: true,
    gate: AVAILABLE_GATE,
    children: students ?? [],
  });
}
