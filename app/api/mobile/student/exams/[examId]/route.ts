import { NextRequest, NextResponse } from "next/server";

import {
  normalizeClassKey,
  resolveMobileRouteContext,
} from "@/lib/mobile-api-server";

/** Terminal attempt status written by the submit and teacher-grade routes. */
const ATTEMPT_STATUS_GRADED = "graded";

/**
 * Single-exam detail for the mobile student detail screen.
 *
 * The list route (`../route.ts`) is paginated, so the app previously refetched
 * the whole list and `.find()`-ed the record client-side — anything past the
 * first page was unopenable. This route returns exactly one exam plus the two
 * per-exam blocks the detail screen renders but the list never returns:
 * `settings` (duration / attempts / review flags / instructions) and the
 * requesting student's own `attempts` history.
 *
 * Entitlement mirrors the start route: the exam must belong to the caller's
 * school and, when it targets a class, the student must be in that class. A
 * class-less student is DENIED for a class-targeted exam (fail closed).
 */
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
    const student = account.student;

    if (!student?.id) {
      return NextResponse.json(
        { ok: false, error: { message: "لم يتم العثور على بيانات الطالب." } },
        { status: 400 },
      );
    }

    // NOTE: the `exams` table has no `status` column — selecting it makes
    // PostgREST error and the route would 404 for every exam.
    const { data: exam, error: examError } = await supabase
      .from("exams")
      .select(
        "id, school_id, title, type, subject, class_name, total_marks, starts_at, ends_at, created_at",
      )
      .eq("id", examId)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (examError) {
      return NextResponse.json(
        { ok: false, error: { message: "internal_error" } },
        { status: 500 },
      );
    }

    if (!exam) {
      return NextResponse.json(
        { ok: false, error: { message: "الامتحان غير موجود." } },
        { status: 404 },
      );
    }

    const examRow = exam as {
      id: string;
      school_id: string;
      title: string;
      type: string | null;
      subject: string | null;
      class_name: string | null;
      total_marks: number | null;
      starts_at: string | null;
      ends_at: string | null;
      created_at: string | null;
    };

    // Class entitlement. Teacher screens store class_name as free text with no
    // shared picker against student.class_name, so compare on the normalized
    // key (same as the list route) — but a missing student class is a DENY,
    // otherwise a class-less student could open any class's exam.
    if (examRow.class_name) {
      const studentClassKey = student.class_name
        ? normalizeClassKey(student.class_name)
        : null;
      if (
        !studentClassKey ||
        studentClassKey !== normalizeClassKey(examRow.class_name)
      ) {
        return NextResponse.json(
          { ok: false, error: { message: "هذا الامتحان غير مخصص لصفك." } },
          { status: 403 },
        );
      }
    }

    const [settingsResult, attemptsResult] = await Promise.all([
      supabase
        .from("exam_settings")
        .select(
          "exam_id, max_attempts, shuffle_questions, duration_minutes, auto_submit, lock_browser, shuffle_options, allow_review, instructions",
        )
        .eq("exam_id", examId)
        .maybeSingle(),
      supabase
        .from("exam_attempts")
        .select(
          "id, exam_id, student_id, score, status, started_at, submitted_at, time_spent_seconds",
        )
        .eq("exam_id", examId)
        .eq("student_id", student.id)
        .order("started_at", { ascending: true }),
    ]);

    if (attemptsResult.error) {
      return NextResponse.json(
        { ok: false, error: { message: "internal_error" } },
        { status: 500 },
      );
    }

    const attemptRows = (attemptsResult.data ?? []) as Array<{
      id: string;
      score: number | null;
      status: string | null;
      started_at: string | null;
      submitted_at: string | null;
      time_spent_seconds: number | null;
    }>;

    // Scores stay hidden until the attempt is genuinely graded — same rule the
    // results route applies. `exam_attempts` has no results-release column, so
    // the lifecycle status is the source of truth: in_progress -> submitted
    // (awaiting manual grading) -> graded.
    const attempts = attemptRows.map((attempt) => {
      const graded = attempt.status === ATTEMPT_STATUS_GRADED;
      return {
        id: attempt.id,
        score: graded ? attempt.score : null,
        total: examRow.total_marks,
        status: attempt.status,
        started_at: attempt.started_at,
        submitted_at: attempt.submitted_at,
        time_spent_seconds: attempt.time_spent_seconds,
        can_see_details: graded,
      };
    });

    const releasedScores = attempts
      .map((attempt) => attempt.score)
      .filter((score): score is number => typeof score === "number");
    const bestScore =
      releasedScores.length > 0 ? Math.max(...releasedScores) : null;

    return NextResponse.json({
      ok: true,
      exam: {
        ...examRow,
        // The detail screen reads `attempts_count`; the list route emits
        // `attempt_count`. Emit both so either shape keeps working.
        attempts_count: attempts.length,
        attempt_count: attempts.length,
        best_score: bestScore,
        last_status: attempts.length
          ? (attempts[attempts.length - 1].status ?? null)
          : null,
        settings: sanitizeSettingsForStudent(
          (settingsResult.data ?? null) as Record<string, unknown> | null,
        ),
        attempts,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}

/**
 * Only the settings a student is allowed to see. Nothing here reveals answers
 * or grading configuration; the row id and exam_id are dropped as noise.
 */
function sanitizeSettingsForStudent(settings: Record<string, unknown> | null) {
  if (!settings) return null;
  return {
    duration_minutes:
      (settings as { duration_minutes?: number }).duration_minutes ?? null,
    max_attempts: (settings as { max_attempts?: number }).max_attempts ?? null,
    auto_submit: (settings as { auto_submit?: boolean }).auto_submit ?? true,
    lock_browser: (settings as { lock_browser?: boolean }).lock_browser ?? false,
    shuffle_questions:
      (settings as { shuffle_questions?: boolean }).shuffle_questions ?? false,
    shuffle_options:
      (settings as { shuffle_options?: boolean }).shuffle_options ?? false,
    allow_review: (settings as { allow_review?: boolean }).allow_review ?? true,
    instructions: (settings as { instructions?: string }).instructions ?? null,
  };
}
