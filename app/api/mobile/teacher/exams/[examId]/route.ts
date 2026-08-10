import { NextRequest, NextResponse } from "next/server";

import { resolveMobileRouteContext } from "@/lib/mobile-api-server";

/**
 * One exam, as the authoring teacher sees it: the exam row, its questions
 * (through exam_questions) and a summary of student attempts.
 *
 * The mobile exams list had no detail target at all — tapping an exam card
 * only fired a haptic — so a teacher could create an exam and then never look
 * at it again, let alone see whether anyone had sat it.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ examId: string }> },
) {
  try {
    const resolved = await resolveMobileRouteContext(req, "teacher");
    if (resolved.ok === false) {
      return resolved.response;
    }

    const { examId } = await context.params;
    const { serviceSupabase, schoolId, authUserId } = resolved.value;

    const { data: exam, error: examError } = await serviceSupabase
      .from("exams")
      .select(
        "id, school_id, title, type, subject, class_name, total_marks, starts_at, ends_at, created_by, created_at",
      )
      .eq("id", examId)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (examError) {
      return NextResponse.json(
        { ok: false, error: "internal_error" },
        { status: 500 },
      );
    }

    if (!exam) {
      return NextResponse.json(
        { ok: false, error: "الامتحان غير موجود." },
        { status: 404 },
      );
    }

    // This detail payload includes the question answer key. Restrict it to the
    // authoring teacher — school scope alone would let any teacher read another
    // teacher's exam answers (same gate DELETE already enforces).
    if (exam.created_by !== authUserId) {
      return NextResponse.json(
        { ok: false, error: "لا يمكنك عرض امتحان أنشأه معلم آخر." },
        { status: 403 },
      );
    }

    const [questionsResult, attemptsResult, settingsResult] = await Promise.all([
      serviceSupabase
        .from("exam_questions")
        .select(
          "id, sort_order, marks, questions(id, prompt, type, difficulty, options, answer)",
        )
        .eq("exam_id", examId)
        .order("sort_order", { ascending: true }),
      serviceSupabase
        .from("exam_attempts")
        .select("id, student_id, score, status, submitted_at")
        .eq("exam_id", examId)
        .eq("school_id", schoolId),
      serviceSupabase
        .from("exam_settings")
        .select(
          "duration_minutes, max_attempts, passing_marks, show_results_immediately, instructions",
        )
        .eq("exam_id", examId)
        .maybeSingle(),
    ]);

    const attempts = (attemptsResult.data ?? []) as {
      score: number | null;
      status: string | null;
      submitted_at: string | null;
    }[];
    const submitted = attempts.filter((attempt) => attempt.submitted_at != null);
    const scored = submitted.filter((attempt) => attempt.score != null);
    const averageScore = scored.length
      ? scored.reduce((sum, attempt) => sum + Number(attempt.score ?? 0), 0) /
        scored.length
      : null;

    return NextResponse.json({
      ok: true,
      exam,
      settings: settingsResult.data ?? null,
      questions: questionsResult.data ?? [],
      attempts: {
        total: attempts.length,
        submitted: submitted.length,
        in_progress: attempts.length - submitted.length,
        average_score: averageScore,
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
 * Delete an exam the teacher authored. Refused once a student has started it,
 * because dropping the exam would orphan their attempt and any marks already
 * recorded against it.
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ examId: string }> },
) {
  try {
    const resolved = await resolveMobileRouteContext(req, "teacher");
    if (resolved.ok === false) {
      return resolved.response;
    }

    const { examId } = await context.params;
    const { serviceSupabase, schoolId, authUserId } = resolved.value;

    const { data: exam, error: loadError } = await serviceSupabase
      .from("exams")
      .select("id, created_by")
      .eq("id", examId)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (loadError) {
      return NextResponse.json(
        { ok: false, error: "internal_error" },
        { status: 500 },
      );
    }

    if (!exam) {
      return NextResponse.json(
        { ok: false, error: "الامتحان غير موجود." },
        { status: 404 },
      );
    }

    if (exam.created_by !== authUserId) {
      return NextResponse.json(
        { ok: false, error: "لا يمكنك حذف امتحان أنشأه معلم آخر." },
        { status: 403 },
      );
    }

    const { count, error: attemptsError } = await serviceSupabase
      .from("exam_attempts")
      .select("id", { count: "exact", head: true })
      .eq("exam_id", examId);

    if (attemptsError) {
      return NextResponse.json(
        { ok: false, error: "internal_error" },
        { status: 500 },
      );
    }

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { ok: false, error: "لا يمكن حذف امتحان بدأه الطلاب بالفعل." },
        { status: 409 },
      );
    }

    const { error: deleteError } = await serviceSupabase
      .from("exams")
      .delete()
      .eq("id", examId)
      .eq("school_id", schoolId);

    if (deleteError) {
      return NextResponse.json(
        { ok: false, error: "internal_error" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, message: "تم حذف الامتحان." });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
