import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";

export const dynamic = "force-dynamic";

const MANAGE_ROLES = ["admin", "super_admin", "employee"] as const;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.examId) {
    return NextResponse.json({ ok: false, error: "examId is required" }, { status: 400 });
  }

  const context = await resolveSchoolScopedActorContext(
    body.schoolId ?? null,
    { allowedRoles: [...MANAGE_ROLES], roleDeniedMessage: "ليس لديك صلاحية إدارة الامتحانات." },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorSupabase, targetSchoolId } = context.value;

  // Verify exam belongs to school
  const { data: exam, error: examError } = await actorSupabase
    .from("exams")
    .select("id, school_id, total_marks")
    .eq("id", body.examId)
    .eq("school_id", targetSchoolId)
    .single();

  if (examError || !exam) {
    return NextResponse.json({ ok: false, error: "exam not found" }, { status: 404 });
  }

  // Auto-generate mode: select random questions from available questions
  if (body.subject && body.totalQuestions) {
    const difficultyDist: Record<string, number> = body.difficulty_distribution ?? { easy: 0, medium: 0, hard: 0 };
    const difficulties = Object.entries(difficultyDist).filter(([, count]) => count > 0);

    const selectedQuestionIds: string[] = [];

    for (const [difficulty, count] of difficulties) {
      const { data: questions } = await actorSupabase
        .from("questions")
        .select("id")
        .eq("school_id", targetSchoolId)
        .eq("subject", body.subject)
        .eq("difficulty", difficulty)
        .limit(count as number);

      if (questions) {
        selectedQuestionIds.push(...questions.map((q: { id: string }) => q.id));
      }
    }

    // Fill remaining with any difficulty if not enough
    const remaining = (body.totalQuestions as number) - selectedQuestionIds.length;
    if (remaining > 0) {
      const { data: extraQuestions } = await actorSupabase
        .from("questions")
        .select("id")
        .eq("school_id", targetSchoolId)
        .eq("subject", body.subject)
        .not("id", "in", `(${selectedQuestionIds.join(",") || "00000000-0000-0000-0000-000000000000"})`)
        .limit(remaining);

      if (extraQuestions) {
        selectedQuestionIds.push(...extraQuestions.map((q: { id: string }) => q.id));
      }
    }

    if (selectedQuestionIds.length === 0) {
      return NextResponse.json({ ok: false, error: "no matching questions found in available questions" }, { status: 400 });
    }

    // Link questions to exam
    const examQuestions = selectedQuestionIds.map((questionId, index) => ({
      exam_id: body.examId,
      question_id: questionId,
      sort_order: index,
      marks: body.marksPerQuestion ?? 1,
    }));

    const { error: insertError } = await actorSupabase
      .from("exam_questions")
      .upsert(examQuestions, { onConflict: "exam_id,question_id" });

    if (insertError) {
      return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
    }

    // Create default exam settings
    await actorSupabase
      .from("exam_settings")
      .upsert({ exam_id: body.examId }, { onConflict: "exam_id" });

    // Update total marks
    const totalMarks = selectedQuestionIds.length * (body.marksPerQuestion ?? 1);
    await actorSupabase
      .from("exams")
      .update({ total_marks: totalMarks })
      .eq("id", body.examId);

    return NextResponse.json({
      ok: true,
      linked: selectedQuestionIds.length,
      totalMarks,
    }, { status: 201 });
  }

  // Manual mode: link specific questions
  const questionIds: string[] = body.questionIds;
  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    return NextResponse.json({ ok: false, error: "questionIds[] is required" }, { status: 400 });
  }

  const examQuestions = questionIds.map((questionId, index) => ({
    exam_id: body.examId,
    question_id: questionId,
    sort_order: index,
    marks: body.marksPerQuestion ?? 1,
  }));

  const { error: insertError } = await actorSupabase
    .from("exam_questions")
    .upsert(examQuestions, { onConflict: "exam_id,question_id" });

  if (insertError) {
    return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
  }

  // Create default exam settings if not exists
  await actorSupabase
    .from("exam_settings")
    .upsert({ exam_id: body.examId }, { onConflict: "exam_id" });

  // Update total marks
  const totalMarks = questionIds.length * (body.marksPerQuestion ?? 1);
  await actorSupabase
    .from("exams")
    .update({ total_marks: totalMarks })
    .eq("id", body.examId);

  return NextResponse.json({
    ok: true,
    linked: questionIds.length,
    totalMarks,
  }, { status: 201 });
}
