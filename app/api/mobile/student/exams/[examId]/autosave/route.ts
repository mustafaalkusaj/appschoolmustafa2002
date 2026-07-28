import { NextRequest, NextResponse } from "next/server";

import { resolveMobileRouteContext } from "@/lib/mobile-api-server";

/**
 * Partial (non-final) answer persistence for an in-progress exam attempt.
 *
 * The draft is stored in `exam_attempts.answers_json` — an existing nullable
 * jsonb column already used by the web submit route. Nothing here touches
 * `student_answers`, `score`, `submitted_at` or `status`, so an autosave can
 * never finalize an attempt; only /submit does that.
 *
 * POST  -> upsert the draft for an in_progress attempt
 * GET   -> read the draft back (used on resume so server state can win over
 *          the client's AsyncStorage copy)
 */

const MAX_ANSWERS = 500;

type MobileRouteContext = Awaited<ReturnType<typeof resolveMobileRouteContext>>;
type ServiceSupabase = Extract<
  MobileRouteContext,
  { ok: true }
>["value"]["serviceSupabase"];

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

/**
 * Loads the attempt and asserts it belongs to this student + exam + school and
 * is still in progress. Mirrors the guards in the submit route.
 */
async function loadInProgressAttempt(
  supabase: ServiceSupabase,
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
  // Verify the exam belongs to the student's school (mirror the submit guard).
  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select("id")
    .eq("id", examId)
    .eq("school_id", schoolId)
    .single();

  if (examError || !exam) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: { message: "الامتحان غير موجود." } },
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
    .single();

  if (attemptError || !attempt) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: { message: "المحاولة غير موجودة." } },
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
        { ok: false, error: { message: "تم تسليم هذه المحاولة مسبقاً." } },
        { status: 400 },
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
    if (!attemptId || !Array.isArray(body?.answers)) {
      return NextResponse.json(
        { ok: false, error: { message: "attempt_id و answers[] مطلوبان." } },
        { status: 400 },
      );
    }

    if (body.answers.length > MAX_ANSWERS) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: `يتجاوز عدد الإجابات الحد الأقصى (${MAX_ANSWERS}).`,
          },
        },
        { status: 400 },
      );
    }

    // A draft is intentionally permissive about the answer VALUE (a half-typed
    // essay, or a question the student has not answered yet, must still save).
    // Only the identifying shape is enforced.
    const draftAnswers: DraftAnswer[] = [];
    for (let i = 0; i < body.answers.length; i++) {
      const ans = body.answers[i];
      if (typeof ans !== "object" || ans === null) {
        return NextResponse.json(
          {
            ok: false,
            error: { message: `answers[${i}]: يجب أن يكون كائناً صالحاً.` },
          },
          { status: 400 },
        );
      }
      const record = ans as Record<string, unknown>;
      const questionId = record.question_id ?? record.questionId;
      if (typeof questionId !== "string" || questionId.trim() === "") {
        return NextResponse.json(
          {
            ok: false,
            error: {
              message: `answers[${i}]: الحقل question_id مطلوب وينبغي أن يكون نصاً.`,
            },
          },
          { status: 400 },
        );
      }
      const rawTime = record.time_spent_seconds ?? record.timeSpentSeconds;
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
    if (guard.ok === false) {
      return guard.response;
    }

    const rawFlags = body.flags;
    const flags: Record<string, boolean> = {};
    if (rawFlags && typeof rawFlags === "object" && !Array.isArray(rawFlags)) {
      for (const [key, value] of Object.entries(
        rawFlags as Record<string, unknown>,
      )) {
        if (value === true) flags[key] = true;
      }
    }

    const rawIndex = body.current_index ?? body.currentIndex;
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
    // attempt. The status filter is repeated here so a submit that lands
    // between the guard read and this write is not overwritten.
    const { error: updateError } = await supabase
      .from("exam_attempts")
      // `answer` is genuinely unknown JSON, so the generated Json type cannot
      // describe it — same cast the web submit route uses for this column.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ answers_json: draft as any })
      .eq("id", attemptId)
      .eq("exam_id", examId)
      .eq("student_id", studentId)
      .eq("school_id", schoolId)
      .eq("status", "in_progress");

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: { message: "تعذر حفظ الإجابات الآن." } },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      attempt_id: attemptId,
      attemptId,
      saved_at: draft.saved_at,
      saved_count: draftAnswers.length,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}

export async function GET(
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

    const attemptId = req.nextUrl.searchParams.get("attempt_id");
    if (!attemptId) {
      return NextResponse.json(
        { ok: false, error: { message: "attempt_id مطلوب." } },
        { status: 400 },
      );
    }

    const guard = await loadInProgressAttempt(supabase, {
      examId,
      attemptId,
      schoolId,
      studentId,
    });
    if (guard.ok === false) {
      return guard.response;
    }

    const stored = guard.attempt.answers_json;
    // Older/other writers put a bare answer array in this column; only the
    // object shape written by POST above counts as a resumable draft.
    const draft =
      stored && typeof stored === "object" && !Array.isArray(stored)
        ? (stored as Partial<Draft>)
        : null;

    return NextResponse.json({
      ok: true,
      attempt_id: attemptId,
      attemptId,
      draft: draft
        ? {
            answers: Array.isArray(draft.answers) ? draft.answers : [],
            flags:
              draft.flags && typeof draft.flags === "object" ? draft.flags : {},
            current_index:
              typeof draft.current_index === "number" ? draft.current_index : 0,
            saved_at: draft.saved_at ?? null,
          }
        : null,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
