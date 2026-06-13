import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["admin", "super_admin", "employee"] as const;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

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
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) {
  const { examId } = await params;
  const body = await request.json().catch(() => null);

  const context = await resolveSchoolScopedActorContext(
    body?.schoolId ?? null,
    { allowedRoles: [...ALLOWED_ROLES], roleDeniedMessage: "ليس لديك صلاحية بدء الامتحان." },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorSupabase, targetSchoolId, actorUserId } = context.value;
  const studentId = body?.studentId ?? actorUserId;

  // Verify exam exists and is active
  const { data: exam, error: examError } = await actorSupabase
    .from("exams")
    .select("id, school_id, title, status, starts_at, ends_at, total_marks")
    .eq("id", examId)
    .eq("school_id", targetSchoolId)
    .single();

  if (examError || !exam) {
    return NextResponse.json({ ok: false, error: "exam not found" }, { status: 404 });
  }

  if (exam.status && exam.status !== "active" && exam.status !== "scheduled") {
    return NextResponse.json({ ok: false, error: "exam is not active" }, { status: 400 });
  }

  const now = new Date();
  if (exam.starts_at && new Date(exam.starts_at) > now) {
    return NextResponse.json({ ok: false, error: "exam has not started yet" }, { status: 400 });
  }
  if (exam.ends_at && new Date(exam.ends_at) < now) {
    return NextResponse.json({ ok: false, error: "exam has ended" }, { status: 400 });
  }

  // Get settings
  const { data: settings } = await actorSupabase
    .from("exam_settings")
    .select("*")
    .eq("exam_id", examId)
    .maybeSingle();

  const maxAttempts = settings?.max_attempts ?? 1;

  // Check attempt count
  const { count: attemptCount } = await actorSupabase
    .from("exam_attempts")
    .select("id", { count: "exact", head: true })
    .eq("exam_id", examId)
    .eq("student_id", studentId);

  if ((attemptCount ?? 0) >= maxAttempts) {
    return NextResponse.json({ ok: false, error: "max attempts reached" }, { status: 400 });
  }

  // Check for in-progress attempt
  const { data: existingAttempt } = await actorSupabase
    .from("exam_attempts")
    .select("id, started_at")
    .eq("exam_id", examId)
    .eq("student_id", studentId)
    .eq("status", "in_progress")
    .maybeSingle();

  if (existingAttempt) {
    const { data: questions } = await actorSupabase
      .from("exam_questions")
      .select("question_id, sort_order, marks, questions!inner(id, prompt, options, type, difficulty)")
      .eq("exam_id", examId)
      .order("sort_order", { ascending: true });

    return NextResponse.json({
      ok: true,
      attemptId: existingAttempt.id,
      resumed: true,
      questions: questions ?? [],
      settings: settings ?? {},
    });
  }

  // Create new attempt
  const { data: attempt, error: attemptError } = await actorSupabase
    .from("exam_attempts")
    .insert({
      exam_id: examId,
      student_id: studentId,
      school_id: targetSchoolId,
      started_at: now.toISOString(),
      status: "in_progress",
    })
    .select("id, started_at")
    .single();

  if (attemptError) {
    return NextResponse.json({ ok: false, error: attemptError.message }, { status: 500 });
  }

  // Fetch questions
  const { data: rawQuestions } = await actorSupabase
    .from("exam_questions")
    .select("question_id, sort_order, marks, questions!inner(id, prompt, options, type, difficulty)")
    .eq("exam_id", examId)
    .order("sort_order", { ascending: true });

  let questions = rawQuestions ?? [];

  if (settings?.shuffle_questions) {
    questions = shuffleArray(questions, `${attempt.id}-questions`);
  }

  return NextResponse.json({
    ok: true,
    attemptId: attempt.id,
    resumed: false,
    questions,
    settings: {
      duration_minutes: settings?.duration_minutes ?? null,
      auto_submit: settings?.auto_submit ?? true,
      lock_browser: settings?.lock_browser ?? false,
      shuffle_options: settings?.shuffle_options ?? false,
      allow_review: settings?.allow_review ?? true,
      instructions: settings?.instructions ?? null,
    },
  });
}
