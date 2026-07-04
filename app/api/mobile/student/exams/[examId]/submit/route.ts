import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  AVAILABLE_GATE,
  featureGateFromError,
} from "@/lib/mobile-api-admin";
import { resolveMobileRouteContext } from "@/lib/mobile-api-server";

// Client sends a map of questionId -> submitted answer. The client-provided
// `score` (if any) is deliberately NOT part of the schema: grading happens
// entirely server-side against the answer key.
const submitBodySchema = z.object({
  answers: z.record(z.string(), z.unknown()).default({}),
  time_spent_seconds: z.number().int().nonnegative().optional(),
});

type ExamQuestionRow = {
  question_id: string;
  marks: number | null;
  questions:
    | { id: string; answer: string | null; type: string | null }
    | { id: string; answer: string | null; type: string | null }[]
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

export async function POST(
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

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const parsed = submitBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { answers, time_spent_seconds: timeSpentSeconds } = parsed.data;

  // Ensure the attempt exists, belongs to this student, and has not already
  // been submitted. This pre-check plus the `.is("submitted_at", null)` guard
  // on the update together block resubmission.
  const { data: attempt, error: attemptError } = await serviceSupabase
    .from("exam_attempts")
    .select("id, submitted_at")
    .eq("exam_id", examId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (attemptError) {
    return NextResponse.json({
      ok: true,
      gate: featureGateFromError(attemptError, "exam_attempts"),
      attempt: null,
    });
  }

  if (!attempt) {
    return NextResponse.json({ ok: false, error: "attempt_not_found" }, { status: 404 });
  }

  if (attempt.submitted_at) {
    return NextResponse.json(
      { ok: false, error: "already_submitted", attempt },
      { status: 409 },
    );
  }

  // Load the answer key for this exam. Grading is done server-side only.
  const { data: examQuestions, error: questionsError } = await serviceSupabase
    .from("exam_questions")
    .select("question_id, marks, questions ( id, answer, type )")
    .eq("exam_id", examId);

  if (questionsError) {
    return NextResponse.json({
      ok: true,
      gate: featureGateFromError(questionsError, "exam_questions"),
      attempt: null,
    });
  }

  let computedScore = 0;
  for (const row of (examQuestions ?? []) as ExamQuestionRow[]) {
    const question = extractQuestion(row);
    if (!question) continue;

    const correct = normalizeAnswer(question.answer);
    if (!correct) continue; // no key defined; cannot be scored

    const submitted = normalizeAnswer(answers[row.question_id]);
    if (submitted && submitted === correct) {
      const weight = typeof row.marks === "number" && row.marks > 0 ? row.marks : 1;
      computedScore += weight;
    }
  }

  const updatePayload: Record<string, unknown> = {
    answers_json: answers,
    score: computedScore,
    submitted_at: new Date().toISOString(),
    status: "submitted",
  };

  if (typeof timeSpentSeconds === "number") {
    updatePayload.time_spent_seconds = timeSpentSeconds;
  }

  const { data, error } = await serviceSupabase
    .from("exam_attempts")
    .update(updatePayload)
    .eq("exam_id", examId)
    .eq("student_id", studentId)
    .is("submitted_at", null)
    .select()
    .single();

  if (error) {
    return NextResponse.json({
      ok: true,
      gate: featureGateFromError(error, "exam_attempts"),
      attempt: null,
    });
  }

  return NextResponse.json({
    ok: true,
    gate: AVAILABLE_GATE,
    attempt: data,
  });
}
