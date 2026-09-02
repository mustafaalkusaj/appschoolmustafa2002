import { NextRequest, NextResponse } from "next/server";
import { resolveStudentContext, unauthorized } from "@/lib/student-api";

/**
 * Records an exam-integrity event (tab switch, focus lost, copy/paste, ...)
 * for an in-progress attempt. Mirrors
 * app/api/mobile/student/exams/integrity/route.ts, scoped to one exam via
 * the [id] segment and authenticated with the web RBAC session cookie
 * instead of a bearer token.
 */

const VALID_EVENT_TYPES = [
  "app_switch",
  "tab_change",
  "screenshot_attempt",
  "copy_paste",
  "focus_lost",
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveStudentContext(req);
  if (!ctx) return unauthorized();

  const { id: examId } = await params;
  const { supabase, schoolId, studentId } = ctx;

  const body = await req.json().catch(() => null);
  const attemptId: string | undefined = body?.attemptId ?? body?.attempt_id;
  const rawEventType: string | undefined = body?.eventType ?? body?.event_type;

  if (!attemptId || !rawEventType) {
    return NextResponse.json(
      { ok: false, error: "missing_fields" },
      { status: 400 },
    );
  }

  const eventType = String(rawEventType).trim().toLowerCase();
  if (!VALID_EVENT_TYPES.includes(eventType)) {
    return NextResponse.json(
      { ok: false, error: "invalid_event_type" },
      { status: 400 },
    );
  }

  const { data: attempt, error: attemptError } = await supabase
    .from("exam_attempts")
    .select("id, exam_id, student_id")
    .eq("id", attemptId)
    .eq("exam_id", examId)
    .eq("student_id", studentId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (attemptError || !attempt) {
    return NextResponse.json(
      { ok: false, error: "attempt_not_found" },
      { status: 404 },
    );
  }

  const attemptRow = attempt as { id: string; exam_id: string };

  const { data, error } = await supabase
    .from("exam_integrity_logs")
    .insert({
      attempt_id: attemptRow.id,
      exam_id: attemptRow.exam_id,
      student_id: studentId,
      school_id: schoolId,
      event_type: eventType,
      metadata: body?.metadata ?? null,
    })
    .select("id, event_type, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, data });
}
