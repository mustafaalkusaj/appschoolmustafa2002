import { NextRequest, NextResponse } from "next/server";
import { resolveStudentContext, unauthorized } from "@/lib/student-api";

export async function GET(req: NextRequest) {
  const ctx = await resolveStudentContext(req);
  if (!ctx) return unauthorized();

  const { supabase, studentId, schoolId, className } = ctx;

  const { data, error } = await supabase
    .from("assignments")
    .select("id, title, subject, due_at, content_kind, description, created_at")
    .eq("school_id", schoolId)
    .eq("class_name", className ?? "")
    .order("due_at", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const now = new Date().toISOString();
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const assignmentIds = rows.map((a) => a.id as string);

  /* ── this student's own submissions for these assignments ──
   * Try the grading-fields select first; fall back to the base columns if
   * the homework_grading_fields migration hasn't been applied yet. */
  const submissionByAssignmentId = new Map<string, Record<string, unknown>>();
  if (assignmentIds.length > 0) {
    const { data: submissions, error: submissionsError } = await supabase
      .from("assignment_submissions")
      .select("assignment_id, grade, feedback, status, is_late, submitted_at")
      .eq("school_id", schoolId)
      .eq("student_id", studentId)
      .in("assignment_id", assignmentIds);

    let submissionRows: Array<Record<string, unknown>>;
    if (submissionsError) {
      const { data: fallback } = await supabase
        .from("assignment_submissions")
        .select("assignment_id, submitted_at")
        .eq("school_id", schoolId)
        .eq("student_id", studentId)
        .in("assignment_id", assignmentIds);
      submissionRows = (fallback ?? []) as Array<Record<string, unknown>>;
    } else {
      submissionRows = (submissions ?? []) as unknown as Array<
        Record<string, unknown>
      >;
    }

    for (const s of submissionRows) {
      submissionByAssignmentId.set(s.assignment_id as string, s);
    }
  }

  const assignments = rows.map((a) => {
    const submission = submissionByAssignmentId.get(a.id as string);
    return {
      id: a.id as string,
      title: (a.title as string) ?? "—",
      subject: (a.subject as string) ?? null,
      due_at: ((a.due_at as string) ?? "").slice(0, 10),
      content_kind: (a.content_kind as string) ?? "homework",
      description: (a.description as string) ?? null,
      created_at: ((a.created_at as string) ?? "").slice(0, 10),
      is_past: (a.due_at as string) < now,
      submitted: Boolean(submission),
      grade: submission ? ((submission.grade as number | null) ?? null) : null,
      feedback: submission ? ((submission.feedback as string) ?? null) : null,
      status: submission ? ((submission.status as string) ?? "submitted") : null,
      is_late: submission ? Boolean(submission.is_late) : false,
    };
  });

  return NextResponse.json({ ok: true, data: assignments });
}
