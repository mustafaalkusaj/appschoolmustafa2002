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

  /* ── fetch existing submission ── */
  const { data: submission } = await supabase
    .from("assignment_submissions")
    .select("id, notes, file_url, file_name, file_mime_type, submitted_at")
    .eq("assignment_id", id)
    .eq("student_id", studentId)
    .eq("school_id", schoolId)
    .maybeSingle();

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
            id: (submission as Record<string, unknown>).id as string,
            notes:
              ((submission as Record<string, unknown>).notes as string) ?? null,
            file_url:
              ((submission as Record<string, unknown>).file_url as string) ??
              null,
            file_name:
              ((submission as Record<string, unknown>).file_name as string) ??
              null,
            submitted_at:
              ((submission as Record<string, unknown>).submitted_at as string) ??
              null,
          }
        : null,
    },
  });
}
