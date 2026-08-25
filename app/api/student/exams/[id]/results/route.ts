import { NextRequest, NextResponse } from "next/server";
import { resolveStudentContext, unauthorized } from "@/lib/student-api";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveStudentContext(req);
  if (!ctx) return unauthorized();

  const { id: examId } = await params;
  const { supabase, schoolId, studentId } = ctx;

  /* ── fetch attempt ── */
  const { data: attempt, error: aErr } = await supabase
    .from("exam_attempts")
    .select("id, score, submitted_at, time_spent_seconds, status")
    .eq("exam_id", examId)
    .eq("student_id", studentId)
    .eq("school_id", schoolId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (aErr) {
    return NextResponse.json(
      { ok: false, error: aErr.message },
      { status: 500 },
    );
  }

  if (!attempt) {
    return NextResponse.json(
      { ok: false, error: "no_attempt" },
      { status: 404 },
    );
  }

  const att = attempt as Record<string, unknown>;

  if (att.status !== "completed") {
    return NextResponse.json(
      { ok: false, error: "attempt_not_completed" },
      { status: 400 },
    );
  }

  /* ── fetch exam total ── */
  const { data: examRow } = await supabase
    .from("exams")
    .select("total_marks, title, subject")
    .eq("id", examId)
    .maybeSingle();

  const exam = examRow as Record<string, unknown> | null;

  /* ── fetch student answers with question prompts ── */
  const { data: saRows, error: saErr } = await supabase
    .from("student_answers")
    .select("question_id, student_answer, is_correct, marks_awarded")
    .eq("attempt_id", att.id as string);

  if (saErr) {
    return NextResponse.json(
      { ok: false, error: saErr.message },
      { status: 500 },
    );
  }

  const questionIds = (saRows ?? []).map(
    (r) => (r as Record<string, unknown>).question_id as string,
  );

  let questionsMap = new Map<string, Record<string, unknown>>();

  if (questionIds.length > 0) {
    const { data: qRows } = await supabase
      .from("questions")
      .select("id, prompt, type, options, answer")
      .in("id", questionIds);

    for (const q of ((qRows ?? []) as unknown as Array<Record<string, unknown>>)) {
      questionsMap.set(q.id as string, q);
    }
  }

  /* ── fetch marks from exam_questions ── */
  const { data: eqRows } = await supabase
    .from("exam_questions")
    .select("question_id, marks")
    .eq("exam_id", examId);

  const marksMap = new Map<string, number>();
  for (const eq of (eqRows ?? []) as Array<Record<string, unknown>>) {
    marksMap.set(eq.question_id as string, Number(eq.marks ?? 1));
  }

  const breakdown = (saRows ?? []).map((sa) => {
    const r = sa as Record<string, unknown>;
    const qId = r.question_id as string;
    const q = questionsMap.get(qId);
    return {
      questionId: qId,
      prompt: q ? ((q.prompt as string) ?? "") : "",
      type: q ? ((q.type as string) ?? "mcq") : "mcq",
      options: q ? (q.options ?? null) : null,
      correctAnswer: q ? (q.answer ?? null) : null,
      explanation: null,
      studentAnswer: r.student_answer,
      isCorrect: r.is_correct as boolean,
      marksAwarded: Number(r.marks_awarded ?? 0),
      maxMarks: marksMap.get(qId) ?? 1,
    };
  });

  const totalMarks = exam ? Number(exam.total_marks ?? 0) : 0;
  const score = Number(att.score ?? 0);
  const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;

  return NextResponse.json({
    ok: true,
    data: {
      examTitle: exam ? ((exam.title as string) ?? "") : "",
      examSubject: exam ? ((exam.subject as string) ?? null) : null,
      score,
      totalMarks,
      percentage: Math.round(percentage * 10) / 10,
      passed: percentage >= 50,
      timeSpent: Number(att.time_spent_seconds ?? 0),
      submittedAt: (att.submitted_at as string) ?? null,
      breakdown,
    },
  });
}
