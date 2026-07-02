import { NextRequest, NextResponse } from "next/server";

import {
  AVAILABLE_GATE,
  featureGateFromError,
} from "@/lib/mobile-api-admin";
import { resolveMobileRouteContext } from "@/lib/mobile-api-server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) {
  const context = await resolveMobileRouteContext(req, "student");
  if (!context.ok) return context.response;

  const { serviceSupabase, schoolId, account } = context.value;
  const studentId = account.student?.id;
  const { examId } = await params;

  if (!studentId) {
    return NextResponse.json({ ok: false, error: "student_not_found" }, { status: 400 });
  }

  const { data: existing } = await serviceSupabase
    .from("exam_attempts")
    .select("id")
    .eq("exam_id", examId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      ok: true,
      gate: AVAILABLE_GATE,
      attempt: existing,
      resumed: true,
    });
  }

  const { data, error } = await serviceSupabase
    .from("exam_attempts")
    .insert({
      exam_id: examId,
      student_id: studentId,
      school_id: schoolId,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({
      ok: true,
      gate: featureGateFromError(error, "exam_attempts"),
      attempt: null,
    });
  }

  return NextResponse.json({
    ok: true,
    gate: AVAILABLE_GATE,
    attempt: data,
    resumed: false,
  });
}
