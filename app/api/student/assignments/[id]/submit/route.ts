import { NextRequest, NextResponse } from "next/server";
import { resolveStudentContext, unauthorized } from "@/lib/student-api";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveStudentContext(req);
  if (!ctx) return unauthorized();

  const { id: assignmentId } = await params;
  const { supabase, schoolId, studentId, className } = ctx;

  /* ── validate body ── */
  let body: { notes?: string };
  try {
    body = (await req.json()) as { notes?: string };
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_body" },
      { status: 400 },
    );
  }

  const notes =
    typeof body.notes === "string" ? body.notes.trim() : "";

  if (notes.length === 0) {
    return NextResponse.json(
      { ok: false, error: "notes_required" },
      { status: 400 },
    );
  }

  /* ── verify assignment exists and belongs to student's class ── */
  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, class_name")
    .eq("id", assignmentId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (
    !assignment ||
    (assignment as Record<string, unknown>).class_name !== className
  ) {
    return NextResponse.json(
      { ok: false, error: "assignment_not_found" },
      { status: 404 },
    );
  }

  /* ── check for existing submission ── */
  const { data: existing } = await supabase
    .from("assignment_submissions")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("student_id", studentId)
    .eq("school_id", schoolId)
    .maybeSingle();

  const existingId = existing
    ? ((existing as Record<string, unknown>).id as string)
    : null;

  if (existingId) {
    /* ── update ── */
    const { data: updated, error } = await supabase
      .from("assignment_submissions")
      .update({
        notes,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", existingId)
      .select("id, notes, submitted_at")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, data: updated });
  }

  /* ── insert ── */
  const { data: created, error } = await supabase
    .from("assignment_submissions")
    .insert({
      school_id: schoolId,
      assignment_id: assignmentId,
      student_id: studentId,
      notes,
      submitted_at: new Date().toISOString(),
    })
    .select("id, notes, submitted_at")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, data: created }, { status: 201 });
}
