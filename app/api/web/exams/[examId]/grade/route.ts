import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";

export const dynamic = "force-dynamic";

const MANAGE_ROLES = ["admin", "super_admin", "employee"] as const;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) {
  const { examId } = await params;
  const body = await request.json().catch(() => null);

  if (!body?.attemptId || !Array.isArray(body.grades)) {
    return NextResponse.json({ ok: false, error: "attemptId and grades[] are required" }, { status: 400 });
  }

  const context = await resolveSchoolScopedActorContext(
    body.schoolId ?? null,
    { allowedRoles: [...MANAGE_ROLES], roleDeniedMessage: "ليس لديك صلاحية تصحيح الامتحانات." },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorSupabase, targetSchoolId, actorUserId } = context.value;

  // Verify exam belongs to school
  const { data: exam, error: examError } = await actorSupabase
    .from("exams")
    .select("id, school_id")
    .eq("id", examId)
    .eq("school_id", targetSchoolId)
    .single();

  if (examError || !exam) {
    return NextResponse.json({ ok: false, error: "exam not found" }, { status: 404 });
  }

  // Verify attempt exists
  const { data: attempt, error: attemptError } = await actorSupabase
    .from("exam_attempts")
    .select("id, exam_id, score")
    .eq("id", body.attemptId)
    .eq("exam_id", examId)
    .single();

  if (attemptError || !attempt) {
    return NextResponse.json({ ok: false, error: "attempt not found" }, { status: 404 });
  }

  // Update each graded answer
  const grades = body.grades as Array<{ questionId: string; marks_awarded: number; feedback?: string }>;
  let manualTotal = 0;

  for (const grade of grades) {
    const marksAwarded = Number(grade.marks_awarded) || 0;
    manualTotal += marksAwarded;

    await actorSupabase
      .from("student_answers")
      .update({
        marks_awarded: marksAwarded,
        is_correct: marksAwarded > 0,
      })
      .eq("attempt_id", body.attemptId)
      .eq("question_id", grade.questionId);
  }

  // Recalculate total score
  const { data: allAnswers } = await actorSupabase
    .from("student_answers")
    .select("marks_awarded")
    .eq("attempt_id", body.attemptId);

  const totalScore = (allAnswers ?? []).reduce(
    (sum: number, a: { marks_awarded: unknown }) => sum + (Number(a.marks_awarded) || 0),
    0,
  );

  // Update attempt as graded
  const { error: updateError } = await actorSupabase
    .from("exam_attempts")
    .update({
      score: totalScore,
      status: "graded",
      graded_by: actorUserId,
      graded_at: new Date().toISOString(),
    })
    .eq("id", body.attemptId);

  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    attemptId: body.attemptId,
    totalScore,
    gradedQuestions: grades.length,
  });
}
