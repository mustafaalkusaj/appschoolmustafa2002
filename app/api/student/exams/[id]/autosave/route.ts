import { NextRequest, NextResponse } from "next/server";
import { resolveStudentContext, unauthorized } from "@/lib/student-api";
import { enforceRateLimit } from "@/lib/rate-limit";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Partial (non-final) answer persistence for an in-progress exam attempt.
 *
 * Mirrors app/api/mobile/student/exams/[examId]/autosave/route.ts: the draft
 * is stored in `exam_attempts.answers_json` — the same nullable jsonb column
 * the web submit route already writes on final submission. Nothing here
 * touches `student_answers`, `score`, `submitted_at` or `status`, so an
 * autosave can never finalize an attempt; only /submit does that.
 *
 * POST -> upsert the draft for an in_progress attempt
 * GET  -> read the draft back (used on resume so server state can win over
 *         the client's local copy)
 */

const MAX_ANSWERS = 500;

type DraftAnswer = {
  question_id: string;
  answer: unknown;
  time_spent_seconds: number | null;
};

type Draft = {
  answers: DraftAnswer[];
  flags: Record<string, boolean>;
  current_index: number;
  saved_at: string;
};

async function loadInProgressAttempt(
  supabase: SupabaseClient<Database>,
  {
    examId,
    attemptId,
    schoolId,
    studentId,
  }: {
    examId: string;
    attemptId: string;
    schoolId: string;
    studentId: string;
  },
): Promise<
  | { ok: true; attempt: { id: string; answers_json: unknown } }
  | { ok: false; response: NextResponse }
> {
  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select("id")
    .eq("id", examId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (examError || !exam) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "exam_not_found" },
        { status: 404 },
      ),
    };
  }

  const { data: attempt, error: attemptError } = await supabase
    .from("exam_attempts")
    .select("id, exam_id, student_id, status, answers_json")
    .eq("id", attemptId)
    .eq("exam_id", examId)
    .eq("student_id", studentId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (attemptError || !attempt) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "attempt_not_found" },
        { status: 404 },
      ),
    };
  }

  const attemptRow = attempt as {
    id: string;
    status: string | null;
    answers_json: unknown;
  };

  if (attemptRow.status !== "in_progress") {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "attempt_not_in_progress" },
        { status: 409 },
      ),
    };
  }

  return {
    ok: true,
    attempt: { id: attemptRow.id, answers_json: attemptRow.answers_json },
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveStudentContext(req);
  if (!ctx) return unauthorized();

  const rateLimited = await enforceRateLimit(req, {
    namespace: "student-exam-autosave",
    windowMs: 60_000,
    maxHits: 60,
    identifier: ctx.userId,
  });
  if (rateLimited) return rateLimited;

  const { id: examId } = await params;
  const { supabase, schoolId, studentId } = ctx;

  const body = await req.json().catch(() => null);
  const attemptId: string | undefined = body?.attemptId ?? body?.attempt_id;
  if (!attemptId || !Array.isArray(body?.answers)) {
    return NextResponse.json(
      { ok: false, error: "missing_fields" },
      { status: 400 },
    );
  }

  if (body.answers.length > MAX_ANSWERS) {
    return NextResponse.json(
      { ok: false, error: "too_many_answers" },
      { status: 400 },
    );
  }

  const draftAnswers: DraftAnswer[] = [];
  for (let i = 0; i < body.answers.length; i++) {
    const ans = body.answers[i];
    if (typeof ans !== "object" || ans === null) {
      return NextResponse.json(
        { ok: false, error: `invalid_answer_${i}` },
        { status: 400 },
      );
    }
    const record = ans as Record<string, unknown>;
    const questionId = record.questionId ?? record.question_id;
    if (typeof questionId !== "string" || questionId.trim() === "") {
      return NextResponse.json(
        { ok: false, error: `missing_question_id_${i}` },
        { status: 400 },
      );
    }
    const rawTime = record.timeSpentSeconds ?? record.time_spent_seconds;
    draftAnswers.push({
      question_id: questionId,
      answer: record.answer ?? null,
      time_spent_seconds:
        typeof rawTime === "number" && Number.isFinite(rawTime)
          ? Math.max(0, Math.floor(rawTime))
          : null,
    });
  }

  const guard = await loadInProgressAttempt(supabase, {
    examId,
    attemptId,
    schoolId,
    studentId,
  });
  if (guard.ok === false) return guard.response;

  const rawFlags = body.flags;
  const flags: Record<string, boolean> = {};
  if (rawFlags && typeof rawFlags === "object" && !Array.isArray(rawFlags)) {
    for (const [key, value] of Object.entries(
      rawFlags as Record<string, unknown>,
    )) {
      if (value === true) flags[key] = true;
    }
  }

  const rawIndex = body.currentIndex ?? body.current_index;
  const currentIndex =
    typeof rawIndex === "number" && Number.isFinite(rawIndex) && rawIndex >= 0
      ? Math.floor(rawIndex)
      : 0;

  const draft: Draft = {
    answers: draftAnswers,
    flags,
    current_index: currentIndex,
    saved_at: new Date().toISOString(),
  };

  // Scoped UPDATE only — never an insert, so an autosave cannot conjure an
  // attempt, and the status filter is repeated here so a submit that lands
  // between the guard read and this write is not overwritten.
  const { error: updateError } = await supabase
    .from("exam_attempts")
    // `answer` is genuinely unknown JSON, mirroring the cast the submit
    // route already uses for this column.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ answers_json: draft as any })
    .eq("id", attemptId)
    .eq("exam_id", examId)
    .eq("student_id", studentId)
    .eq("school_id", schoolId)
    .eq("status", "in_progress");

  if (updateError) {
    return NextResponse.json(
      { ok: false, error: "save_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: {
      attemptId,
      savedAt: draft.saved_at,
      savedCount: draftAnswers.length,
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveStudentContext(req);
  if (!ctx) return unauthorized();

  const { id: examId } = await params;
  const { supabase, schoolId, studentId } = ctx;

  const attemptId = req.nextUrl.searchParams.get("attemptId");
  if (!attemptId) {
    return NextResponse.json(
      { ok: false, error: "missing_attempt_id" },
      { status: 400 },
    );
  }

  const guard = await loadInProgressAttempt(supabase, {
    examId,
    attemptId,
    schoolId,
    studentId,
  });
  if (guard.ok === false) return guard.response;

  const stored = guard.attempt.answers_json;
  const draft =
    stored && typeof stored === "object" && !Array.isArray(stored)
      ? (stored as Partial<Draft>)
      : null;

  return NextResponse.json({
    ok: true,
    data: {
      attemptId,
      draft: draft
        ? {
            answers: Array.isArray(draft.answers) ? draft.answers : [],
            flags:
              draft.flags && typeof draft.flags === "object" ? draft.flags : {},
            currentIndex:
              typeof draft.current_index === "number" ? draft.current_index : 0,
            savedAt: draft.saved_at ?? null,
          }
        : null,
    },
  });
}
