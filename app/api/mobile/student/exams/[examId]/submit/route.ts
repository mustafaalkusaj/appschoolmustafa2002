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

  const { serviceSupabase, account } = context.value;
  const studentId = account.student?.id;
  const { examId } = await params;

  if (!studentId) {
    return NextResponse.json({ ok: false, error: "student_not_found" }, { status: 400 });
  }

  let body: { answers?: Record<string, unknown>; score?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const { data, error } = await serviceSupabase
    .from("exam_attempts")
    .update({
      answers: body.answers ?? {},
      score: body.score ?? null,
      submitted_at: new Date().toISOString(),
    })
    .eq("exam_id", examId)
    .eq("student_id", studentId)
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
  });
}
