import { NextRequest, NextResponse } from "next/server";
import { resolveStudentContext, unauthorized } from "@/lib/student-api";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveStudentContext(req);
  if (!ctx) return unauthorized();

  const { id } = await params;
  const { supabase, schoolId, studentId, className } = ctx;

  /* ── fetch assignment ── */
  const { data: assignment, error: aErr } = await supabase
    .from("assignments")
    .select(
      "id, title, subject, due_at, content_kind, description, class_name, created_at",
    )
    .eq("id", id)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (aErr) {
    return NextResponse.json(
      { ok: false, error: aErr.message },
      { status: 500 },
    );
  }

  if (!assignment) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  const row = assignment as Record<string, unknown>;

  /* verify the assignment belongs to this student's class */
  if (row.class_name !== className) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  /* ── fetch existing submission ──
   * Try the grading-fields select first; fall back to the base columns if
   * the homework_grading_fields migration hasn't been applied yet, so an
   * existing submission still renders correctly either way. */
  let submission: Record<string, unknown> | null = null;
  {
    const { data, error: submissionError } = await supabase
      .from("assignment_submissions")
      .select(
        "id, notes, file_url, file_name, file_mime_type, submitted_at, is_late, grade, feedback, status",
      )
      .eq("assignment_id", id)
      .eq("student_id", studentId)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (submissionError) {
      const { data: fallback } = await supabase
        .from("assignment_submissions")
        .select("id, notes, file_url, file_name, file_mime_type, submitted_at")
        .eq("assignment_id", id)
        .eq("student_id", studentId)
        .eq("school_id", schoolId)
        .maybeSingle();
      submission = fallback as Record<string, unknown> | null;
    } else {
      submission = data as Record<string, unknown> | null;
    }
  }

  return NextResponse.json({
    ok: true,
    data: {
      assignment: {
        id: row.id as string,
        title: (row.title as string) ?? "—",
        subject: (row.subject as string) ?? null,
        due_at: (row.due_at as string) ?? null,
        content_kind: (row.content_kind as string) ?? "homework",
        description: (row.description as string) ?? null,
        created_at: (row.created_at as string) ?? null,
      },
      submission: submission
        ? {
            id: submission.id as string,
            notes: (submission.notes as string) ?? null,
            file_url: (submission.file_url as string) ?? null,
            file_name: (submission.file_name as string) ?? null,
            submitted_at: (submission.submitted_at as string) ?? null,
            is_late: Boolean(submission.is_late),
            grade: (submission.grade as number | null) ?? null,
            feedback: (submission.feedback as string) ?? null,
            status: (submission.status as string) ?? "submitted",
          }
        : null,
    },
  });
}
