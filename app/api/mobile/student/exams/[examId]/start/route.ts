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

    // Inactive students may not start exams. A null/missing status is treated
    // as active to match the default-to-active convention used elsewhere.
    const studentStatus = account.student?.status;
    if (studentStatus && studentStatus !== "active") {
      return NextResponse.json(
        { ok: false, error: { message: "حساب الطالب غير نشط." } },
        { status: 403 },
      );
    }

    // Verify exam exists and belongs to school. NOTE: the `exams` table has no
    // `status` column — selecting it makes PostgREST error and the route 404s
    // with "exam not found" for every start. Only select real columns.
    const { data: exam, error: examError } = await supabase
      .from("exams")
      .select(
        "id, school_id, title, starts_at, ends_at, total_marks, class_name",
      )
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
      id: string;
      starts_at: string | null;
      ends_at: string | null;
      class_name: string | null;
    };

    // Check class match. When the exam targets a specific class, the student
    // MUST have a matching class_name. A missing/empty student class is treated
    // as DENY — otherwise a class-less student could start any class's exam.
    if (examRow.class_name) {
      const studentClass = account.student?.class_name?.trim();
      if (!studentClass || studentClass !== examRow.class_name) {
        return NextResponse.json(
          { ok: false, error: { message: "هذا الامتحان غير مخصص لصفك." } },
          { status: 403 },
        );
      }
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
      .select(
        "id, exam_id, max_attempts, shuffle_questions, duration_minutes, auto_submit, lock_browser, shuffle_options, allow_review, instructions",
      )
      .eq("exam_id", examId)
      .maybeSingle();

    // Attempt counting, resume detection and creation must be one database
    // transaction. The service-only RPC also serializes concurrent starts for
    // the same student/exam pair.
    const { data: attemptResult, error: attemptError } = await (
      supabase.rpc as unknown as (
        name: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>
    )("start_or_resume_exam_attempt", {
      p_school_id: schoolId,
      p_exam_id: examId,
      p_student_id: studentId,
    });

    if (attemptError) {
      const safeMessage = mapStartAttemptError(attemptError.message);
      return NextResponse.json(
        { ok: false, error: { message: safeMessage.message } },
        { status: safeMessage.status },
      );
    }

    const attemptRow = (
      Array.isArray(attemptResult) ? attemptResult[0] : attemptResult
    ) as {
      attempt_id: string;
      started_at: string | null;
      resumed: boolean;
    } | null;

    if (!attemptRow?.attempt_id) {
      return NextResponse.json(
        { ok: false, error: { message: "تعذر إنشاء محاولة الامتحان." } },
        { status: 500 },
      );
    }

    // Fetch questions
    const { data: rawQuestions } = await supabase
      .from("exam_questions")
      .select(
        "question_id, sort_order, marks, questions!inner(id, prompt, options, type, difficulty)",
      )
      .eq("exam_id", examId)
      .order("sort_order", { ascending: true });

    let questions = rawQuestions ?? [];

    if (
      (settings as { shuffle_questions?: boolean } | null)?.shuffle_questions
    ) {
      questions = shuffleArray(questions, `${attemptRow.attempt_id}-questions`);
    }

    return NextResponse.json({
      ok: true,
      attempt_id: attemptRow.attempt_id,
      attemptId: attemptRow.attempt_id,
      resumed: attemptRow.resumed,
      questions: questions.map(toStudentQuestion),
      remaining_seconds: computeRemainingSeconds(
        settings,
        attemptRow.started_at,
      ),
      settings: sanitizeSettingsForStudent(settings),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}

function mapStartAttemptError(message: string): {
  message: string;
  status: number;
} {
  if (message.includes("exam_attempt_limit_reached")) {
    return { message: "لقد استنفدت جميع المحاولات المتاحة.", status: 400 };
  }
  if (message.includes("exam_not_started")) {
    return { message: "لم يبدأ الامتحان بعد.", status: 400 };
  }
  if (message.includes("exam_ended")) {
    return { message: "انتهى وقت الامتحان.", status: 400 };
  }
  if (message.includes("exam_class_mismatch")) {
    return { message: "هذا الامتحان غير مخصص لصفك.", status: 403 };
  }
  if (message.includes("student_inactive")) {
    return { message: "حساب الطالب غير نشط.", status: 403 };
  }
  if (message.includes("exam_not_found") || message.includes("student_not_found")) {
    return { message: "الامتحان أو الطالب غير موجود.", status: 404 };
  }
  return { message: "تعذر بدء الامتحان الآن.", status: 500 };
}

/**
 * Flatten an exam_questions row (which nests the question under `questions`)
 * into the flat snake_case shape the mobile client expects:
 * { id, prompt, type, options, sort_order, marks }. The correct answer is
 * stripped so it never reaches the student.
 */
function toStudentQuestion(
  eq: Record<string, unknown>,
): Record<string, unknown> {
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
  const durationMinutes =
    (settings as { duration_minutes?: number } | null)?.duration_minutes ?? 60;
  const totalSeconds = durationMinutes * 60;
  if (!startedAt) return totalSeconds;
  const elapsed = Math.floor(
    (Date.now() - new Date(startedAt).getTime()) / 1000,
  );
  return Math.max(0, totalSeconds - Math.max(0, elapsed));
}

function sanitizeSettingsForStudent(
  settings: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!settings) return {};
  return {
    duration_minutes:
      (settings as { duration_minutes?: number }).duration_minutes ?? null,
    auto_submit: (settings as { auto_submit?: boolean }).auto_submit ?? true,
    lock_browser:
      (settings as { lock_browser?: boolean }).lock_browser ?? false,
    shuffle_options:
      (settings as { shuffle_options?: boolean }).shuffle_options ?? false,
    allow_review: (settings as { allow_review?: boolean }).allow_review ?? true,
    instructions: (settings as { instructions?: string }).instructions ?? null,
  };
}
