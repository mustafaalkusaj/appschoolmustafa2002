import { NextRequest, NextResponse } from "next/server";
import { resolveStudentContext, unauthorized } from "@/lib/student-api";
import { sendPushNotification } from "@/lib/push-notifications";
import { resolveTeacherAuthUserId } from "@/lib/assignment-notifications";

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

  /* ── verify assignment exists and belongs to student's class ──
   * `allow_late` is fetched separately (best-effort) so that a school
   * whose DB hasn't run the homework_grading_fields migration yet keeps
   * working — the base lookup never fails because of a missing column. */
  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, title, class_name, teacher_id, due_at")
    .eq("id", assignmentId)
    .eq("school_id", schoolId)
    .maybeSingle();

  const assignmentRow = assignment as Record<string, unknown> | null;

  if (!assignmentRow || assignmentRow.class_name !== className) {
    return NextResponse.json(
      { ok: false, error: "assignment_not_found" },
      { status: 404 },
    );
  }

  let allowLate = true; // permissive default until the migration adds the column
  try {
    const { data: allowLateRow } = await supabase
      .from("assignments")
      .select("allow_late")
      .eq("id", assignmentId)
      .maybeSingle();
    const value = (allowLateRow as Record<string, unknown> | null)?.allow_late;
    if (typeof value === "boolean") allowLate = value;
  } catch {
    // column not present yet — keep permissive default
  }

  const dueAt = assignmentRow.due_at as string | null;
  const isLate = Boolean(dueAt) && new Date() > new Date(dueAt as string);

  if (isLate && !allowLate) {
    return NextResponse.json(
      { ok: false, error: "late_not_allowed" },
      { status: 403 },
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
        is_late: isLate,
      })
      .eq("id", existingId)
      .select("id, notes, submitted_at, is_late")
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
      is_late: isLate,
    })
    .select("id, notes, submitted_at, is_late")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  /* ── notify the teacher of a new (first-time) submission ── */
  try {
    const teacherId = assignmentRow.teacher_id as string | null;
    if (teacherId) {
      const teacherAuthUserId = await resolveTeacherAuthUserId(
        supabase,
        schoolId,
        teacherId,
      );

      if (teacherAuthUserId) {
        const { data: studentRow } = await supabase
          .from("students")
          .select("full_name")
          .eq("id", studentId)
          .eq("school_id", schoolId)
          .maybeSingle();

        const studentName =
          (studentRow as Record<string, unknown> | null)?.full_name as
            | string
            | undefined;

        await sendPushNotification(supabase, {
          schoolId,
          branchId: null,
          userIds: [teacherAuthUserId],
          type: "assignment_submission",
          title: "📥 تسليم جديد",
          message: `${studentName ?? "طالب"} سلّم واجب: ${assignmentRow.title as string}`,
          link: `/teacher/assignments/${assignmentId}`,
          metadata: { assignmentId, studentId },
          recipientRole: "teacher",
        });
      }
    }
  } catch {
    // notification failure should not block submission
  }

  return NextResponse.json({ ok: true, data: created }, { status: 201 });
}
