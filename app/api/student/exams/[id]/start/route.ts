import { NextRequest, NextResponse } from "next/server";
import { resolveStudentContext, unauthorized } from "@/lib/student-api";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveStudentContext(req);
  if (!ctx) return unauthorized();

  const { id: examId } = await params;
  const { supabase, schoolId, studentId, className } = ctx;

  /* ── fetch exam ── */
  const { data: exam, error: eErr } = await supabase
    .from("exams")
    .select(
      "id, title, class_name, total_marks, starts_at, ends_at, is_randomized",
    )
    .eq("id", examId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (eErr || !exam) {
    return NextResponse.json(
      { ok: false, error: "exam_not_found" },
      { status: 404 },
    );
  }

  const e = exam as unknown as Record<string, unknown>;

  if (e.class_name !== className) {
    return NextResponse.json(
      { ok: false, error: "exam_not_found" },
      { status: 404 },
    );
  }

  /* ── check exam is active ── */
  if (e.status !== "published") {
    return NextResponse.json(
      { ok: false, error: "exam_not_active" },
      { status: 403 },
    );
  }

  const now = new Date();
  const startsAt = new Date(e.starts_at as string);
  const endsAt = new Date(e.ends_at as string);

  if (now < startsAt) {
    return NextResponse.json(
      { ok: false, error: "exam_not_started" },
      { status: 403 },
    );
  }

  if (now > endsAt) {
    return NextResponse.json(
      { ok: false, error: "exam_ended" },
      { status: 403 },
    );
  }

  /* ── check for existing attempt ── */
  const { data: existingAttempt } = await supabase
    .from("exam_attempts")
    .select("id, status")
    .eq("exam_id", examId)
    .eq("student_id", studentId)
    .eq("school_id", schoolId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const att = existingAttempt as Record<string, unknown> | null;

  if (att && att.status === "completed") {
    return NextResponse.json(
      { ok: false, error: "already_completed" },
      { status: 409 },
    );
  }

  let attemptId: string;

  if (att && att.status === "in_progress") {
    /* resume */
    attemptId = att.id as string;
  } else {
    /* create new attempt */
    const { data: newAttempt, error: cErr } = await supabase
      .from("exam_attempts")
      .insert({
        exam_id: examId,
        student_id: studentId,
        school_id: schoolId,
        status: "in_progress",
        started_at: now.toISOString(),
      })
      .select("id")
      .single();

    if (cErr || !newAttempt) {
      return NextResponse.json(
        { ok: false, error: cErr?.message ?? "create_failed" },
        { status: 500 },
      );
    }
    attemptId = (newAttempt as Record<string, unknown>).id as string;
  }

  /* ── fetch questions (do NOT return correct answers) ── */
  const orderCol = e.is_randomized ? "id" : "sort_order";
  const { data: eqRows, error: qErr } = await supabase
    .from("exam_questions")
    .select("question_id, sort_order, marks")
    .eq("exam_id", examId)
    .order(orderCol, { ascending: true });

  if (qErr) {
    return NextResponse.json(
      { ok: false, error: qErr.message },
      { status: 500 },
    );
  }

  const questionIds = (eqRows ?? []).map(
    (r) => (r as Record<string, unknown>).question_id as string,
  );

  if (questionIds.length === 0) {
    return NextResponse.json({
      ok: true,
      data: {
        attemptId,
        questions: [],
        startsAt: e.starts_at as string,
        endsAt: e.ends_at as string,
        timeLimit: Math.floor((endsAt.getTime() - startsAt.getTime()) / 1000),
      },
    });
  }

  const { data: qRows, error: q2Err } = await supabase
    .from("questions")
    .select("id, prompt, type, options, difficulty")
    .in("id", questionIds);

  if (q2Err) {
    return NextResponse.json(
      { ok: false, error: q2Err.message },
      { status: 500 },
    );
  }

  /* build a map for marks lookup */
  const marksMap = new Map<string, number>();
  for (const eq of eqRows ?? []) {
    const r = eq as Record<string, unknown>;
    marksMap.set(r.question_id as string, Number(r.marks ?? 1));
  }

  /* build a sort-order map */
  const sortMap = new Map<string, number>();
  for (let i = 0; i < questionIds.length; i++) {
    sortMap.set(questionIds[i], i);
  }

  const questionsMap = new Map<string, Record<string, unknown>>();
  for (const q of (qRows ?? []) as Array<Record<string, unknown>>) {
    questionsMap.set(q.id as string, q);
  }

  /* return in exam_questions sort order */
  const questions = questionIds
    .map((qid) => {
      const q = questionsMap.get(qid);
      if (!q) return null;
      return {
        id: q.id as string,
        prompt: (q.prompt as string) ?? "",
        type: (q.type as string) ?? "mcq",
        options: q.options ?? null,
        marks: marksMap.get(qid) ?? 1,
      };
    })
    .filter(Boolean);

  /* if randomized, shuffle */
  if (e.is_randomized) {
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
  }

  return NextResponse.json({
    ok: true,
    data: {
      attemptId,
      questions,
      startsAt: e.starts_at as string,
      endsAt: e.ends_at as string,
      timeLimit: Math.floor((endsAt.getTime() - startsAt.getTime()) / 1000),
    },
  });
}
