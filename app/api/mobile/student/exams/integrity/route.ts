import { NextRequest, NextResponse } from "next/server";

import {
  AVAILABLE_GATE,
  featureGateFromError,
} from "@/lib/mobile-api-admin";
import { resolveMobileRouteContext } from "@/lib/mobile-api-server";

export async function POST(req: NextRequest) {
  const context = await resolveMobileRouteContext(req, "student");
  if (!context.ok) return context.response;

  const { serviceSupabase, schoolId, account } = context.value;
  const studentId = account.student?.id;

  if (!studentId) {
    return NextResponse.json({ ok: false, error: "student_not_found" }, { status: 400 });
  }

  let body: { attempt_id?: string; event_type?: string; metadata?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  if (!body.attempt_id || !body.event_type) {
    return NextResponse.json({ ok: false, error: "attempt_id_and_event_type_required" }, { status: 400 });
  }

  const { data, error } = await serviceSupabase
    .from("exam_integrity_logs")
    .insert({
      attempt_id: body.attempt_id,
      student_id: studentId,
      school_id: schoolId,
      event_type: body.event_type,
      metadata: body.metadata ?? {},
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({
      ok: true,
      gate: featureGateFromError(error, "exam_integrity_logs"),
      logged: false,
    });
  }

  return NextResponse.json({
    ok: true,
    gate: AVAILABLE_GATE,
    logged: true,
    record: data,
  });
}
