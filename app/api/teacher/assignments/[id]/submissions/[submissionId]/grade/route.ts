import { NextRequest, NextResponse } from "next/server";
import { resolveTeacherContext, unauthorized } from "@/lib/teacher-api";
import { sendPushNotification } from "@/lib/push-notifications";
import { resolveStudentAuthUserId } from "@/lib/assignment-notifications";
import {
  assignmentsTable,
  assignmentSubmissionsTable,
} from "@/lib/assignment-grading-tables";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> },
) {
  const ctx = await resolveTeacherContext(req);
  if (!ctx) return unauthorized();

  const { id: assignmentId, submissionId } = await params;
  const { supabase, teacherId, schoolId } = ctx;

  let body: { grade?: unknown; feedback?: unknown };
  try {
    body = (await req.json()) as { grade?: unknown; feedback?: unknown };
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const grade = typeof body.grade === "number" ? body.grade : Number(body.grade);
  const feedback =
    typeof body.feedback === "string" ? body.feedback.trim() : null;

  if (!Number.isFinite(grade)) {
    return NextResponse.json(
      { ok: false, error: "grade_required" },
      { status: 400 },
    );
  }

  const { data: assignment, error: assignmentError } = await assignmentsTable(
    supabase,
  )
    .select("id, title, teacher_id, max_grade")
    .eq("id", assignmentId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (assignmentError) {
    return NextResponse.json(
      { ok: false, error: "fetch_failed" },
      { status: 500 },
    );
  }

  const assignmentRow = assignment as Record<string, unknown> | null;
  if (!assignmentRow || assignmentRow.teacher_id !== teacherId) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  const maxGrade = (assignmentRow.max_grade as number) ?? 100;
  if (grade < 0 || grade > maxGrade) {
    return NextResponse.json(
      { ok: false, error: "grade_out_of_range" },
      { status: 400 },
    );
  }

  const { data: submission, error: submissionError } = await supabase
    .from("assignment_submissions")
    .select("id, student_id, assignment_id")
    .eq("id", submissionId)
    .eq("assignment_id", assignmentId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (submissionError) {
    return NextResponse.json(
      { ok: false, error: "fetch_failed" },
      { status: 500 },
    );
  }

  const submissionRow = submission as Record<string, unknown> | null;
  if (!submissionRow) {
    return NextResponse.json(
      { ok: false, error: "submission_not_found" },
      { status: 404 },
    );
  }

  const { data: updated, error } = await assignmentSubmissionsTable(supabase)
    .update({
      grade,
      feedback,
      status: "graded",
      graded_at: new Date().toISOString(),
      graded_by: teacherId,
    })
    .eq("id", submissionId)
    .select("id, grade, feedback, status, graded_at")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: "update_failed" },
      { status: 500 },
    );
  }

  try {
    const studentAuthUserId = await resolveStudentAuthUserId(
      supabase,
      schoolId,
      submissionRow.student_id as string,
    );

    if (studentAuthUserId) {
      await sendPushNotification(supabase, {
        schoolId,
        branchId: null,
        userIds: [studentAuthUserId],
        type: "assignment",
        title: "✅ تم تقييم واجبك",
        message: `الدرجة: ${grade}/${maxGrade}`,
        link: "/student/assignments",
        metadata: { assignmentId, submissionId },
        recipientRole: "student",
      });
    }
  } catch {
    // notification failure should not block grading
  }

  return NextResponse.json({
    ok: true,
    data: updated as Record<string, unknown>,
  });
}
