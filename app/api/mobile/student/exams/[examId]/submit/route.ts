import { NextRequest, NextResponse } from "next/server";

import { resolveMobileRouteContext } from "@/lib/mobile-api-server";

const OBJECTIVE_TYPES = ["multiple_choice", "true_false", "fill_blank", "matching", "ordering"];

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
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) {
  try {
    const context = await resolveMobileRouteContext(req, "student");
    if (context.ok === false) {
      return context.response;
    }

    const { examId } = await params;
    const { schoolId, account, serviceSupabase: supabase } = context.value;
    const studentId = account.student?.id;

    if (!studentId) {
      return NextResponse.json(
        { ok: false, error: { message: "لم يتم العثور على بيانات الطالب." } },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => null);
    // Mobile sends snake_case (attempt_id); accept camelCase as a fallback.
    const attemptId: string | undefined = body?.attempt_id ?? body?.attemptId;
    if (!attemptId || !Array.isArray(body.answers)) {
      return NextResponse.json(
        { ok: false, error: { message: "attempt_id و answers[] مطلوبان." } },
        { status: 400 },
      );
    }

    // Validate each answer entry has the required shape.
    const MAX_ANSWERS = 500;
    if (body.answers.length > MAX_ANSWERS) {
      return NextResponse.json(
        { ok: false, error: { message: `يتجاوز عدد الإجابات الحد الأقصى (${MAX_ANSWERS}).` } },
        { status: 400 },
      );
    }
    for (let i = 0; i < body.answers.length; i++) {
      const ans = body.answers[i];
      if (typeof ans !== "object" || ans === null) {
        return NextResponse.json(
          { ok: false, error: { message: `answers[${i}]: يجب أن يكون كائناً صالحاً.` } },
          { status: 400 },
        );
      }
      const questionId = (ans as Record<string, unknown>).question_id ?? (ans as Record<string, unknown>).questionId;
      if (typeof questionId !== "string" || questionId.trim() === "") {
        return NextResponse.json(
          { ok: false, error: { message: `answers[${i}]: الحقل question_id مطلوب وينبغي أن يكون نصاً.` } },
          { status: 400 },
        );
      }
      const answerValue = (ans as Record<string, unknown>).answer;
      if (answerValue === undefined || answerValue === null || answerValue === "") {
        return NextResponse.json(
          { ok: false, error: { message: `answers[${i}]: الحقل answer مطلوب ولا يجوز أن يكون فارغاً.` } },
          { status: 400 },
        );
      }
    }

    // Verify the exam belongs to the student's school (mirror the start guard).
    const { data: exam, error: examError } = await supabase
      .from("exams")
      .select("id")
      .eq("id", examId)
      .eq("school_id", schoolId)
      .single();

    if (examError || !exam) {
      return NextResponse.json(
        { ok: false, error: { message: "الامتحان غير موجود." } },
        { status: 404 },
      );
    }

    // Verify attempt belongs to this student and is in_progress
    const { data: attempt, error: attemptError } = await supabase
      .from("exam_attempts")
      .select("id, exam_id, student_id, status, started_at")
      .eq("id", attemptId)
      .eq("exam_id", examId)
      .eq("student_id", studentId)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json(
        { ok: false, error: { message: "المحاولة غير موجودة." } },
        { status: 404 },
      );
    }

    const attemptRow = attempt as { id: string; status: string; started_at: string | null };

    if (attemptRow.status !== "in_progress") {
      return NextResponse.json(
        { ok: false, error: { message: "تم تسليم هذه المحاولة مسبقاً." } },
        { status: 400 },
      );
    }

    // Get exam questions with correct answers
    const { data: examQuestions } = await supabase
      .from("exam_questions")
      .select("question_id, marks, questions!inner(id, type, answer)")
      .eq("exam_id", examId);

    const questionMap = new Map<string, { type: string | null; answer: string | null; marks: number }>();
    for (const rawEq of (examQuestions ?? [])) {
      const eq = rawEq as unknown as { question_id: string; marks: number; questions: { id: string; type: string | null; answer: string | null } };
      questionMap.set(eq.question_id, {
        type: eq.questions.type,
        answer: eq.questions.answer,
        marks: Number(eq.marks) || 1,
      });
    }

    // Reject the whole submission if any answer references a question that is
    // not part of this exam's question set (prevents injecting foreign rows).
    for (let i = 0; i < body.answers.length; i++) {
      const ans = body.answers[i] as Record<string, unknown>;
      const questionId = (ans.question_id ?? ans.questionId) as string;
      if (!questionMap.has(questionId)) {
        return NextResponse.json(
          { ok: false, error: { message: `answers[${i}]: السؤال غير موجود في هذا الامتحان.` } },
          { status: 400 },
        );
      }
    }

    // Grade each answer
    let totalScore = 0;
    let gradedCount = 0;
    let pendingManualGrade = 0;

    const studentAnswerRows = (body.answers as Array<{
      question_id?: string; questionId?: string;
      answer: unknown;
      time_spent_seconds?: number; timeSpentSeconds?: number;
      flagged?: boolean;
    }>).map((ans) => {
      const questionId = ans.question_id ?? ans.questionId ?? "";
      const timeSpent = ans.time_spent_seconds ?? ans.timeSpentSeconds ?? null;
      const questionInfo = questionMap.get(questionId);
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
        attempt_id: attemptId,
        question_id: questionId,
        student_answer: ans.answer,
        is_correct: isCorrect,
        marks_awarded: marksAwarded,
        time_spent_seconds: timeSpent,
        flagged: ans.flagged ?? false,
      };
    });

    // Insert student answers
    const { error: answersError } = await supabase
      .from("student_answers")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(studentAnswerRows as any, { onConflict: "attempt_id,question_id" });

    if (answersError) {
      return NextResponse.json(
        { ok: false, error: { message: answersError.message } },
        { status: 500 },
      );
    }

    // Calculate time spent
    const now = new Date();
    const startedAt = attemptRow.started_at ? new Date(attemptRow.started_at) : now;
    const timeSpentSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

    // Update attempt
    const submitStatus = pendingManualGrade > 0 ? "submitted" : "graded";
    const { error: updateError } = await supabase
      .from("exam_attempts")
      .update({
        status: submitStatus,
        score: totalScore,
        submitted_at: now.toISOString(),
        time_spent_seconds: timeSpentSeconds,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        answers_json: studentAnswerRows as any,
      })
      .eq("id", attemptId);

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: { message: updateError.message } },
        { status: 500 },
      );
    }

    // Check if show_results_immediately
    const { data: settings } = await supabase
      .from("exam_settings")
      .select("show_results_immediately")
      .eq("exam_id", examId)
      .maybeSingle();

    const showResults = (settings as { show_results_immediately?: boolean } | null)?.show_results_immediately ?? false;

    const result: Record<string, unknown> = {
      ok: true,
      attempt_id: attemptId,
      attemptId,
      status: submitStatus,
      score: totalScore,
      graded_count: gradedCount,
      pending_manual_grade: pendingManualGrade,
      time_spent_seconds: timeSpentSeconds,
    };

    if (showResults) {
      result.answers = studentAnswerRows.map((a) => ({
        question_id: a.question_id,
        is_correct: a.is_correct,
        marks_awarded: a.marks_awarded,
      }));
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
