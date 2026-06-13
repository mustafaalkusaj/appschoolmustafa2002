import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["admin", "super_admin", "employee"] as const;
const OBJECTIVE_TYPES = ["multiple_choice", "true_false", "fill_blank", "matching", "ordering"];

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

function autoGrade(
  questionType: string | null,
  correctAnswer: string | null,
  studentAnswer: unknown,
): boolean | null {
  if (!questionType || !OBJECTIVE_TYPES.includes(questionType)) return null;
  if (correctAnswer === null || correctAnswer === undefined) return null;

  const studentStr = typeof studentAnswer === "string"
    ? studentAnswer.trim().toLowerCase()
    : JSON.stringify(studentAnswer);
  const correctStr = correctAnswer.trim().toLowerCase();

  return studentStr === correctStr;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) {
  const { examId } = await params;
  const body = await request.json().catch(() => null);

  if (!body?.attemptId || !Array.isArray(body.answers)) {
    return NextResponse.json({ ok: false, error: "attemptId and answers[] are required" }, { status: 400 });
  }

  const context = await resolveSchoolScopedActorContext(
    body.schoolId ?? null,
    { allowedRoles: [...ALLOWED_ROLES], roleDeniedMessage: "ليس لديك صلاحية تقديم الامتحان." },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorSupabase, targetSchoolId } = context.value;

  // Verify attempt exists and is in_progress
  const { data: attempt, error: attemptError } = await actorSupabase
    .from("exam_attempts")
    .select("id, exam_id, student_id, status, started_at")
    .eq("id", body.attemptId)
    .eq("exam_id", examId)
    .single();

  if (attemptError || !attempt) {
    return NextResponse.json({ ok: false, error: "attempt not found" }, { status: 404 });
  }

  if (attempt.status !== "in_progress") {
    return NextResponse.json({ ok: false, error: "attempt already submitted" }, { status: 400 });
  }

  // Get exam questions with correct answers
  const { data: examQuestions } = await actorSupabase
    .from("exam_questions")
    .select("question_id, marks, questions!inner(id, type, answer)")
    .eq("exam_id", examId);

  const questionMap = new Map<string, { type: string | null; answer: string | null; marks: number }>();
  for (const eq of examQuestions ?? []) {
    const q = eq.questions as unknown as { id: string; type: string | null; answer: string | null };
    questionMap.set(eq.question_id, {
      type: q.type,
      answer: q.answer,
      marks: Number(eq.marks) || 1,
    });
  }

  // Grade each answer
  let totalScore = 0;
  let gradedCount = 0;
  let pendingManualGrade = 0;

  const studentAnswerRows = (body.answers as Array<{ questionId: string; answer: unknown; timeSpentSeconds?: number; flagged?: boolean }>).map((ans) => {
    const questionInfo = questionMap.get(ans.questionId);
    const isCorrect = questionInfo
      ? autoGrade(questionInfo.type, questionInfo.answer, ans.answer)
      : null;
    const marksAwarded = isCorrect === true ? (questionInfo?.marks ?? 1) : 0;

    if (isCorrect !== null) {
      gradedCount++;
      totalScore += marksAwarded;
    } else {
      pendingManualGrade++;
    }

    return {
      attempt_id: body.attemptId,
      question_id: ans.questionId,
      student_answer: ans.answer,
      is_correct: isCorrect,
      marks_awarded: marksAwarded,
      time_spent_seconds: ans.timeSpentSeconds ?? null,
      flagged: ans.flagged ?? false,
    };
  });

  // Insert student answers
  const { error: answersError } = await actorSupabase
    .from("student_answers")
    .upsert(studentAnswerRows, { onConflict: "attempt_id,question_id" });

  if (answersError) {
    return NextResponse.json({ ok: false, error: answersError.message }, { status: 500 });
  }

  // Calculate time spent
  const now = new Date();
  const startedAt = attempt.started_at ? new Date(attempt.started_at) : now;
  const timeSpentSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

  // Update attempt
  const submitStatus = pendingManualGrade > 0 ? "submitted" : "graded";
  const { error: updateError } = await actorSupabase
    .from("exam_attempts")
    .update({
      status: submitStatus,
      score: totalScore,
      submitted_at: now.toISOString(),
      time_spent_seconds: timeSpentSeconds,
      answers_json: studentAnswerRows,
    })
    .eq("id", body.attemptId);

  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
  }

  // Update question usage stats
  for (const ans of studentAnswerRows) {
    try {
      await actorSupabase.rpc("increment_question_times_used", { qid: ans.question_id });
    } catch {
      // Non-critical
    }
  }

  // Check if show_results_immediately
  const { data: settings } = await actorSupabase
    .from("exam_settings")
    .select("show_results_immediately")
    .eq("exam_id", examId)
    .maybeSingle();

  // Notify student with result (fire-and-forget)
  try {
    const { notifyExamResult } = await import("@/lib/notify-events");
    if (typeof notifyExamResult === "function") {
      await notifyExamResult({
        supabase: actorSupabase,
        schoolId: targetSchoolId,
        studentId: attempt.student_id,
        examTitle: examId,
        score: totalScore,
      });
    }
  } catch {
    // notification failure must never block submission
  }

  const result: Record<string, unknown> = {
    ok: true,
    attemptId: body.attemptId,
    status: submitStatus,
    score: totalScore,
    gradedCount,
    pendingManualGrade,
    timeSpentSeconds,
  };

  if (settings?.show_results_immediately) {
    result.answers = studentAnswerRows.map((a) => ({
      questionId: a.question_id,
      isCorrect: a.is_correct,
      marksAwarded: a.marks_awarded,
    }));
  }

  return NextResponse.json(result);
}
