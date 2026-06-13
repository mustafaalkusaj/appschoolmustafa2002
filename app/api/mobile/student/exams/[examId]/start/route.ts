import { NextRequest, NextResponse } from "next/server";

import { resolveMobileRouteContext } from "@/lib/mobile-api-server";

function shuffleArray<T>(array: T[], seed?: string): T[] {
  const result = [...array];
  let seedNum = 0;
  if (seed) {
    for (let i = 0; i < seed.length; i++) {
      seedNum = ((seedNum << 5) - seedNum + seed.charCodeAt(i)) | 0;
    }
  }
  for (let i = result.length - 1; i > 0; i--) {
    seedNum = (seedNum * 1103515245 + 12345) & 0x7fffffff;
    const j = seedNum % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
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

    // Verify exam exists and belongs to school. NOTE: the `exams` table has no
    // `status` column — selecting it makes PostgREST error and the route 404s
    // with "exam not found" for every start. Only select real columns.
    const { data: exam, error: examError } = await supabase
      .from("exams")
      .select("id, school_id, title, starts_at, ends_at, total_marks, class_name")
      .eq("id", examId)
      .eq("school_id", schoolId)
      .single();

    if (examError || !exam) {
      return NextResponse.json(
        { ok: false, error: { message: "الامتحان غير موجود." } },
        { status: 404 },
      );
    }

    const examRow = exam as {
      id: string; starts_at: string | null;
      ends_at: string | null; class_name: string | null;
    };

    // Check class match
    if (examRow.class_name && account.student?.class_name && examRow.class_name !== account.student.class_name) {
      return NextResponse.json(
        { ok: false, error: { message: "هذا الامتحان غير مخصص لصفك." } },
        { status: 403 },
      );
    }

    // Check time window
    const now = new Date();
    if (examRow.starts_at && new Date(examRow.starts_at) > now) {
      return NextResponse.json(
        { ok: false, error: { message: "لم يبدأ الامتحان بعد." } },
        { status: 400 },
      );
    }
    if (examRow.ends_at && new Date(examRow.ends_at) < now) {
      return NextResponse.json(
        { ok: false, error: { message: "انتهى وقت الامتحان." } },
        { status: 400 },
      );
    }

    // Get settings
    const { data: settings } = await supabase
      .from("exam_settings")
      .select("*")
      .eq("exam_id", examId)
      .maybeSingle();

    const maxAttempts = (settings as { max_attempts?: number } | null)?.max_attempts ?? 1;

    // Check attempt count
    const { count: attemptCount } = await supabase
      .from("exam_attempts")
      .select("id", { count: "exact", head: true })
      .eq("exam_id", examId)
      .eq("student_id", studentId);

    if ((attemptCount ?? 0) >= maxAttempts) {
      return NextResponse.json(
        { ok: false, error: { message: "لقد استنفدت جميع المحاولات المتاحة." } },
        { status: 400 },
      );
    }

    // Check for in-progress attempt (resume)
    const { data: existingAttempt } = await supabase
      .from("exam_attempts")
      .select("id, started_at")
      .eq("exam_id", examId)
      .eq("student_id", studentId)
      .eq("status", "in_progress")
      .maybeSingle();

    if (existingAttempt) {
      const existing = existingAttempt as { id: string; started_at: string | null };
      const { data: questions } = await supabase
        .from("exam_questions")
        .select("question_id, sort_order, marks, questions!inner(id, prompt, options, type, difficulty)")
        .eq("exam_id", examId)
        .order("sort_order", { ascending: true });

      return NextResponse.json({
        ok: true,
        attempt_id: existing.id,
        attemptId: existing.id,
        resumed: true,
        questions: (questions ?? []).map(toStudentQuestion),
        remaining_seconds: computeRemainingSeconds(settings, existing.started_at),
        settings: sanitizeSettingsForStudent(settings),
      });
    }

    // Create new attempt
    const { data: attempt, error: attemptError } = await supabase
      .from("exam_attempts")
      .insert({
        exam_id: examId,
        student_id: studentId,
        school_id: schoolId,
        started_at: now.toISOString(),
        status: "in_progress",
      })
      .select("id, started_at")
      .single();

    if (attemptError) {
      return NextResponse.json(
        { ok: false, error: { message: attemptError.message } },
        { status: 500 },
      );
    }

    const attemptRow = attempt as { id: string; started_at: string | null };

    // Fetch questions
    const { data: rawQuestions } = await supabase
      .from("exam_questions")
      .select("question_id, sort_order, marks, questions!inner(id, prompt, options, type, difficulty)")
      .eq("exam_id", examId)
      .order("sort_order", { ascending: true });

    let questions = rawQuestions ?? [];

    if ((settings as { shuffle_questions?: boolean } | null)?.shuffle_questions) {
      questions = shuffleArray(questions, `${attemptRow.id}-questions`);
    }

    return NextResponse.json({
      ok: true,
      attempt_id: attemptRow.id,
      attemptId: attemptRow.id,
      resumed: false,
      questions: questions.map(toStudentQuestion),
      remaining_seconds: computeRemainingSeconds(settings, attemptRow.started_at),
      settings: sanitizeSettingsForStudent(settings),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

/**
 * Flatten an exam_questions row (which nests the question under `questions`)
 * into the flat snake_case shape the mobile client expects:
 * { id, prompt, type, options, sort_order, marks }. The correct answer is
 * stripped so it never reaches the student.
 */
function toStudentQuestion(eq: Record<string, unknown>): Record<string, unknown> {
  const q = (eq.questions as Record<string, unknown> | undefined) ?? {};
  return {
    id: q.id ?? eq.question_id ?? null,
    prompt: q.prompt ?? null,
    type: q.type ?? null,
    options: q.options ?? null,
    difficulty: q.difficulty ?? null,
    sort_order: eq.sort_order ?? null,
    marks: eq.marks ?? null,
  };
}

function computeRemainingSeconds(
  settings: Record<string, unknown> | null,
  startedAt: string | null,
): number {
  const durationMinutes = (settings as { duration_minutes?: number } | null)?.duration_minutes ?? 60;
  const totalSeconds = durationMinutes * 60;
  if (!startedAt) return totalSeconds;
  const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  return Math.max(0, totalSeconds - Math.max(0, elapsed));
}

function sanitizeSettingsForStudent(settings: Record<string, unknown> | null): Record<string, unknown> {
  if (!settings) return {};
  return {
    duration_minutes: (settings as { duration_minutes?: number }).duration_minutes ?? null,
    auto_submit: (settings as { auto_submit?: boolean }).auto_submit ?? true,
    lock_browser: (settings as { lock_browser?: boolean }).lock_browser ?? false,
    shuffle_options: (settings as { shuffle_options?: boolean }).shuffle_options ?? false,
    allow_review: (settings as { allow_review?: boolean }).allow_review ?? true,
    instructions: (settings as { instructions?: string }).instructions ?? null,
  };
}
