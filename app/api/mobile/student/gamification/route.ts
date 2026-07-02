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
    return NextResponse.json({ ok: true, gate: AVAILABLE_GATE, data: null });
  }

  const { data, error } = await serviceSupabase
    .from("gamification")
    .select("*")
    .eq("school_id", schoolId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({
      ok: true,
      gate: featureGateFromError(error, "gamification"),
      data: null,
    });
  }

  return NextResponse.json({
    ok: true,
    gate: AVAILABLE_GATE,
    data: data ?? null,
  });
}
