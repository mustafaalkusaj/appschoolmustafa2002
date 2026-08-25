import { NextRequest, NextResponse } from "next/server";
import { resolveStudentContext, unauthorized } from "@/lib/student-api";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveStudentContext(req);
  if (!ctx) return unauthorized();

  const { id: examId } = await params;
  const { supabase, schoolId, studentId } = ctx;

  /* ── parse body ── */
  let body: { attemptId?: string; answers?: Record<string, unknown> };
  try {
    body = (await req.json()) as {
      attemptId?: string;
      answers?: Record<string, unknown>;
    };
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_body" },
      { status: 400 },
    );
  }

  const { attemptId, answers } = body;

  if (!attemptId || !answers || typeof answers !== "object") {
    return NextResponse.json(
      { ok: false, error: "missing_fields" },
      { status: 400 },
    );
  }

  /* ── verify attempt ownership ── */
  const { data: attempt, error: aErr } = await supabase
    .from("exam_attempts")
    .select("id, status, started_at")
    .eq("id", attemptId)
    .eq("exam_id", examId)
    .eq("student_id", studentId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (aErr || !attempt) {
    return NextResponse.json(
      { ok: false, error: "attempt_not_found" },
      { status: 404 },
    );
  }

  const att = attempt as Record<string, unknown>;

  if (att.status !== "in_progress") {
    return NextResponse.json(
      { ok: false, error: "attempt_not_in_progress" },
      { status: 409 },
    );
  }

  /* ── fetch correct answers for auto-grading ── */
  const { data: eqRows } = await supabase
    .from("exam_questions")
    .select("question_id, marks")
    .eq("exam_id", examId);

  const questionIds = (eqRows ?? []).map(
    (r) => (r as Record<string, unknown>).question_id as string,
  );

  const marksMap = new Map<string, number>();
  for (const eq of eqRows ?? []) {
    const r = eq as Record<string, unknown>;
    marksMap.set(r.question_id as string, Number(r.marks ?? 1));
  }

  const { data: qRows } = await supabase
    .from("questions")
    .select("id, type, answer")
    .in("id", questionIds.length > 0 ? questionIds : ["__none__"]);

  const correctMap = new Map<
    string,
    { type: string; answer: unknown }
  >();
  for (const q of (qRows ?? []) as Array<Record<string, unknown>>) {
    correctMap.set(q.id as string, {
      type: (q.type as string) ?? "mcq",
      answer: q.answer,
    });
  }

  /* ── grade and save each answer ── */
  let totalScore = 0;
  let totalPossible = 0;

  const answerEntries = Object.entries(answers);

  for (const [questionId, studentAnswer] of answerEntries) {
    const correct = correctMap.get(questionId);
    const qMarks = marksMap.get(questionId) ?? 1;
    totalPossible += qMarks;

    let isCorrect = false;
    let marksAwarded = 0;

    if (correct) {
      const qType = correct.type;
      if (qType === "mcq" || qType === "true_false") {
        /* normalize to string for comparison */
        const studentStr = String(studentAnswer ?? "").trim().toLowerCase();
        const correctStr = String(correct.answer ?? "").trim().toLowerCase();
        isCorrect = studentStr === correctStr;
        marksAwarded = isCorrect ? qMarks : 0;
      } else {
        /* short_answer — leave for manual grading, award 0 for now */
        isCorrect = false;
        marksAwarded = 0;
      }
    }

    totalScore += marksAwarded;

    /* upsert student_answers */
    await supabase.from("student_answers").upsert(
      {
        attempt_id: attemptId,
        question_id: questionId,
        student_answer: studentAnswer as unknown as undefined,
        is_correct: isCorrect,
        marks_awarded: marksAwarded,
      },
      { onConflict: "attempt_id,question_id" },
    );
  }

  /* ── finalize attempt ── */
  const now = new Date();
  const startedAt = new Date(att.started_at as string);
  const timeSpent = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

  const { error: uErr } = await supabase
    .from("exam_attempts")
    .update({
      status: "completed",
      score: totalScore,
      submitted_at: now.toISOString(),
      time_spent_seconds: timeSpent,
      answers_json: answers as unknown as undefined,
    })
    .eq("id", attemptId);

  if (uErr) {
    return NextResponse.json(
      { ok: false, error: uErr.message },
      { status: 500 },
    );
  }

  /* ── fetch exam total for pass check ── */
  const { data: examRow } = await supabase
    .from("exams")
    .select("total_marks")
    .eq("id", examId)
    .maybeSingle();

  const examTotal = examRow
    ? Number((examRow as Record<string, unknown>).total_marks ?? totalPossible)
    : totalPossible;

  const percentage = examTotal > 0 ? (totalScore / examTotal) * 100 : 0;

  return NextResponse.json({
    ok: true,
    data: {
      score: totalScore,
      total: examTotal,
      percentage: Math.round(percentage * 10) / 10,
      passed: percentage >= 50,
    },
  });
}
