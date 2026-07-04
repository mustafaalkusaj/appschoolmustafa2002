import { NextRequest, NextResponse } from "next/server";

import {
  AVAILABLE_GATE,
  featureGateFromError,
} from "@/lib/mobile-api-admin";
import { resolveMobileRouteContext } from "@/lib/mobile-api-server";

type ExamQuestionRow = {
  question_id: string;
  marks: number | null;
  sort_order: number | null;
  questions:
    | { id: string; prompt: string | null; type: string | null; options: unknown; answer: string | null }
    | { id: string; prompt: string | null; type: string | null; options: unknown; answer: string | null }[]
    | null;
};

function normalizeAnswer(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value).trim().toLowerCase();
  if (typeof value === "string") return value.trim().toLowerCase();
  return String(value).trim().toLowerCase();
}

function extractQuestion(row: ExamQuestionRow) {
  const q = row.questions;
  if (Array.isArray(q)) return q[0] ?? null;
  return q ?? null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) {
  const context = await resolveMobileRouteContext(req, "student");
  if (!context.ok) return context.response;

  const { serviceSupabase, account } = context.value;
  const studentId = account.student?.id;
  const { examId } = await params;

  if (!studentId) {
    return NextResponse.json({ ok: false, error: "student_not_found" }, { status: 400 });
  }

  // student_id is always derived server-side from the authenticated account.
  const { data: attempt, error: attemptError } = await serviceSupabase
    .from("exam_attempts")
    .select("*")
    .eq("exam_id", examId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (attemptError) {
    return NextResponse.json({
      ok: true,
      gate: featureGateFromError(attemptError, "exam_attempts"),
      attempt: null,
      questions_breakdown: [],
    });
  }

  if (!attempt) {
    return NextResponse.json({ ok: false, error: "attempt_not_found" }, { status: 404 });
  }

  const { data: examQuestions, error: questionsError } = await serviceSupabase
    .from("exam_questions")
    .select("question_id, marks, sort_order, questions ( id, prompt, type, options, answer )")
    .eq("exam_id", examId)
    .order("sort_order", { ascending: true });

  if (questionsError) {
    return NextResponse.json({
      ok: true,
      gate: featureGateFromError(questionsError, "exam_questions"),
      attempt,
      questions_breakdown: [],
    });
  }

  const submittedAnswers =
    attempt.answers_json && typeof attempt.answers_json === "object"
      ? (attempt.answers_json as Record<string, unknown>)
      : {};

  const questionsBreakdown = ((examQuestions ?? []) as ExamQuestionRow[])
    .map((row) => {
      const question = extractQuestion(row);
      if (!question) return null;

      const studentAnswer = submittedAnswers[row.question_id] ?? null;
      const correctAnswer = question.answer ?? null;
      const marks = typeof row.marks === "number" && row.marks > 0 ? row.marks : 1;
      const isCorrect =
        !!correctAnswer &&
        normalizeAnswer(studentAnswer) !== "" &&
        normalizeAnswer(studentAnswer) === normalizeAnswer(correctAnswer);

      return {
        question_id: row.question_id,
        sort_order: row.sort_order,
        prompt: question.prompt,
        type: question.type,
        options: question.options,
        correct_answer: correctAnswer,
        student_answer: studentAnswer,
        marks,
        is_correct: isCorrect,
        earned_marks: isCorrect ? marks : 0,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return NextResponse.json({
    ok: true,
    gate: AVAILABLE_GATE,
    attempt,
    questions_breakdown: questionsBreakdown,
  });
}
