import { NextRequest, NextResponse } from "next/server";

import { resolveMobileRouteContext } from "@/lib/mobile-api-server";

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

    // Get attempt(s) for this student (mobile passes snake_case if anything).
    const search = new URL(req.url).searchParams;
    const attemptId = search.get("attempt_id") ?? search.get("attemptId");
    let attemptsQuery = supabase
      .from("exam_attempts")
      .select("id, exam_id, student_id, score, status, started_at, submitted_at, time_spent_seconds")
      .eq("exam_id", examId)
      .eq("student_id", studentId)
      .order("submitted_at", { ascending: false });

    if (attemptId) {
      attemptsQuery = attemptsQuery.eq("id", attemptId);
    }

    const { data: attempts, error: attemptsError } = await attemptsQuery;

    if (attemptsError) {
      return NextResponse.json(
        { ok: false, error: { message: attemptsError.message } },
        { status: 500 },
      );
    }

    if (!attempts || attempts.length === 0) {
      return NextResponse.json(
        { ok: false, error: { message: "لا توجد محاولات لهذا الامتحان." } },
        { status: 404 },
      );
    }

    const attemptRows = attempts as Array<{
      id: string; exam_id: string; score: number | null; status: string;
      started_at: string | null; submitted_at: string | null; time_spent_seconds: number | null;
    }>;

    // Check visibility: results shown if graded OR show_results_immediately
    const { data: settings } = await supabase
      .from("exam_settings")
      .select("show_results_immediately")
      .eq("exam_id", examId)
      .maybeSingle();

    const showImmediately = (settings as { show_results_immediately?: boolean } | null)?.show_results_immediately ?? false;

    // Get exam info
    const { data: exam } = await supabase
      .from("exams")
      .select("id, title, total_marks, subject, class_name")
      .eq("id", examId)
      .eq("school_id", schoolId)
      .single();

    const examRow = exam as { id: string; title: string; total_marks: number | null; subject: string | null; class_name: string | null } | null;

    // Per-question marks (for the breakdown display).
    const { data: examQuestions } = await supabase
      .from("exam_questions")
      .select("question_id, marks")
      .eq("exam_id", examId);
    const marksMap = new Map<string, number>();
    for (const row of (examQuestions ?? []) as Array<{ question_id: string; marks: number | null }>) {
      marksMap.set(row.question_id, Number(row.marks) || 0);
    }
    const totalMarks =
      examRow?.total_marks ?? Array.from(marksMap.values()).reduce((sum, v) => sum + v, 0);

    // Build the per-attempt breakdown in the flat snake_case shape the mobile
    // results screen reads (id, prompt, type, student_answer, correct_answer,
    // marks, marks_awarded, is_correct).
    const results = await Promise.all(
      attemptRows.map(async (attempt) => {
        const canSeeDetails = attempt.status === "graded" || showImmediately;

        let breakdown: Array<Record<string, unknown>> = [];
        if (canSeeDetails) {
          const { data: answers } = await supabase
            .from("student_answers")
            .select("question_id, student_answer, is_correct, marks_awarded, time_spent_seconds, questions!inner(id, prompt, type, options, answer)")
            .eq("attempt_id", attempt.id);

          breakdown = ((answers ?? []) as Array<Record<string, unknown>>).map((a) => {
            const q = (a.questions as Record<string, unknown> | null) ?? {};
            return {
              id: q.id ?? a.question_id ?? null,
              prompt: q.prompt ?? null,
              type: q.type ?? null,
              options: q.options ?? null,
              student_answer: a.student_answer,
              correct_answer: q.answer ?? null,
              marks: marksMap.get(a.question_id as string) ?? 0,
              marks_awarded: a.marks_awarded,
              is_correct: a.is_correct,
              time_spent_seconds: a.time_spent_seconds,
            };
          });
        }

        return {
          attempt_id: attempt.id,
          attemptId: attempt.id,
          score: attempt.score,
          status: attempt.status,
          started_at: attempt.started_at,
          submitted_at: attempt.submitted_at,
          time_spent_seconds: attempt.time_spent_seconds,
          can_see_details: canSeeDetails,
          questions_breakdown: breakdown,
        };
      }),
    );

    // Flat top-level summary for the latest attempt (what the mobile results
    // screen renders directly).
    const latest = results[0];
    const latestScore = Number(latest?.score ?? 0);
    const passed = totalMarks > 0 ? latestScore / totalMarks >= 0.5 : false;

    return NextResponse.json({
      ok: true,
      exam: examRow
        ? { id: examRow.id, title: examRow.title, total_marks: examRow.total_marks, subject: examRow.subject }
        : null,
      attempt: latest
        ? {
            score: latestScore,
            total: totalMarks,
            passed,
            time_taken_seconds: latest.time_spent_seconds,
            status: latest.status,
          }
        : null,
      questions_breakdown: latest?.questions_breakdown ?? [],
      results,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
