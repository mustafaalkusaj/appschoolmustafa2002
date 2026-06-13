import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";

export const dynamic = "force-dynamic";

const MANAGE_ROLES = ["admin", "super_admin", "employee"] as const;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

interface ScoreBucket {
  label: string;
  min: number;
  max: number;
  count: number;
}

function buildDistribution(scores: number[], maxMarks: number): ScoreBucket[] {
  const buckets: ScoreBucket[] = [
    { label: "0-20%", min: 0, max: maxMarks * 0.2, count: 0 },
    { label: "20-40%", min: maxMarks * 0.2, max: maxMarks * 0.4, count: 0 },
    { label: "40-60%", min: maxMarks * 0.4, max: maxMarks * 0.6, count: 0 },
    { label: "60-80%", min: maxMarks * 0.6, max: maxMarks * 0.8, count: 0 },
    { label: "80-100%", min: maxMarks * 0.8, max: maxMarks + 1, count: 0 },
  ];

  for (const score of scores) {
    for (const bucket of buckets) {
      if (score >= bucket.min && score < bucket.max) {
        bucket.count++;
        break;
      }
    }
  }

  return buckets;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const context = await resolveSchoolScopedActorContext(
    searchParams.get("schoolId"),
    { allowedRoles: [...MANAGE_ROLES], roleDeniedMessage: "ليس لديك صلاحية عرض تحليلات الامتحانات." },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorSupabase, targetSchoolId } = context.value;
  const examId = searchParams.get("examId");

  // ------- Per-exam stats -------
  let examsQuery = actorSupabase
    .from("exams")
    .select("id, title, subject, class_name, total_marks, starts_at")
    .eq("school_id", targetSchoolId)
    .order("created_at", { ascending: false });

  if (examId) {
    examsQuery = examsQuery.eq("id", examId);
  }

  const { data: exams, error: examsError } = await examsQuery;
  if (examsError) {
    return NextResponse.json({ ok: false, error: examsError.message }, { status: 500 });
  }

  const examIds = (exams ?? []).map((e) => (e as { id: string }).id);
  if (examIds.length === 0) {
    return NextResponse.json({
      ok: true,
      examStats: [],
      questionDifficulty: [],
      studentRanking: [],
      trend: [],
    });
  }

  const { data: rawAttempts } = await actorSupabase
    .from("exam_attempts")
    .select("id, exam_id, student_id, score, status, submitted_at")
    .in("exam_id", examIds)
    .in("status", ["graded", "submitted"]);

  const attempts = (rawAttempts ?? []) as Array<{
    id: string;
    exam_id: string;
    student_id: string;
    score: number | null;
    status: string;
    submitted_at: string | null;
  }>;

  const attemptsByExam = new Map<string, typeof attempts>();
  for (const a of attempts) {
    const list = attemptsByExam.get(a.exam_id) ?? [];
    list.push(a);
    attemptsByExam.set(a.exam_id, list);
  }

  const examStats = (exams ?? []).map((rawExam) => {
    const exam = rawExam as { id: string; title: string; subject: string | null; class_name: string | null; total_marks: number | null; starts_at: string | null };
    const examAttempts = attemptsByExam.get(exam.id) ?? [];
    const scores = examAttempts
      .map((a) => a.score)
      .filter((s): s is number => typeof s === "number");

    const totalMarks = exam.total_marks ?? 100;
    const passingMarks = totalMarks * 0.5;
    const passed = scores.filter((s) => s >= passingMarks).length;

    return {
      examId: exam.id,
      title: exam.title,
      subject: exam.subject,
      className: exam.class_name,
      totalMarks,
      totalAttempts: examAttempts.length,
      completionRate: examAttempts.length > 0 ? Math.round((scores.length / examAttempts.length) * 100) : 0,
      avgScore: scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0,
      passRate: scores.length > 0 ? Math.round((passed / scores.length) * 100) : 0,
      highest: scores.length > 0 ? Math.max(...scores) : 0,
      lowest: scores.length > 0 ? Math.min(...scores) : 0,
      distribution: buildDistribution(scores, totalMarks),
    };
  });

  // ------- Per-question difficulty -------
  let questionDifficulty: Array<{
    questionId: string;
    prompt: string;
    timesAnswered: number;
    percentCorrect: number;
    avgTimeSpent: number;
  }> = [];

  if (examId) {
    const { data: rawAnswers } = await actorSupabase
      .from("student_answers")
      .select("question_id, is_correct, time_spent_seconds, attempt_id")
      .in(
        "attempt_id",
        attempts.filter((a) => a.exam_id === examId).map((a) => a.id),
      );

    const answers = (rawAnswers ?? []) as Array<{
      question_id: string;
      is_correct: boolean | null;
      time_spent_seconds: number | null;
    }>;

    const byQuestion = new Map<string, { correct: number; total: number; timeSum: number; timeCount: number }>();
    for (const ans of answers) {
      const entry = byQuestion.get(ans.question_id) ?? { correct: 0, total: 0, timeSum: 0, timeCount: 0 };
      entry.total++;
      if (ans.is_correct === true) entry.correct++;
      if (typeof ans.time_spent_seconds === "number") {
        entry.timeSum += ans.time_spent_seconds;
        entry.timeCount++;
      }
      byQuestion.set(ans.question_id, entry);
    }

    const questionIds = Array.from(byQuestion.keys());
    if (questionIds.length > 0) {
      const { data: questions } = await actorSupabase
        .from("questions")
        .select("id, prompt")
        .in("id", questionIds);

      const promptMap = new Map<string, string>();
      for (const q of (questions ?? []) as Array<{ id: string; prompt: string }>) {
        promptMap.set(q.id, q.prompt);
      }

      questionDifficulty = questionIds.map((qid) => {
        const stats = byQuestion.get(qid)!;
        return {
          questionId: qid,
          prompt: promptMap.get(qid) ?? "",
          timesAnswered: stats.total,
          percentCorrect: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
          avgTimeSpent: stats.timeCount > 0 ? Math.round(stats.timeSum / stats.timeCount) : 0,
        };
      });
    }
  }

  // ------- Student ranking -------
  const studentScores = new Map<string, number>();
  for (const a of attempts) {
    if (typeof a.score === "number") {
      studentScores.set(a.student_id, (studentScores.get(a.student_id) ?? 0) + a.score);
    }
  }

  const studentIds = Array.from(studentScores.keys());
  const studentNameMap = new Map<string, string>();
  if (studentIds.length > 0) {
    const { data: students } = await actorSupabase
      .from("students")
      .select("id, full_name")
      .in("id", studentIds.slice(0, 200));

    for (const s of (students ?? []) as Array<{ id: string; full_name: string }>) {
      studentNameMap.set(s.id, s.full_name);
    }
  }

  const studentRanking = Array.from(studentScores.entries())
    .map(([studentId, totalScore]) => ({
      studentId,
      studentName: studentNameMap.get(studentId) ?? studentId,
      totalScore,
    }))
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 50);

  // ------- Trend over time -------
  const monthlyScores = new Map<string, { sum: number; count: number }>();
  for (const a of attempts) {
    if (typeof a.score === "number" && a.submitted_at) {
      const month = a.submitted_at.slice(0, 7);
      const entry = monthlyScores.get(month) ?? { sum: 0, count: 0 };
      entry.sum += a.score;
      entry.count++;
      monthlyScores.set(month, entry);
    }
  }

  const trend = Array.from(monthlyScores.entries())
    .map(([month, stats]) => ({
      month,
      avgScore: Math.round((stats.sum / stats.count) * 10) / 10,
      attemptCount: stats.count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return NextResponse.json({
    ok: true,
    examStats,
    questionDifficulty,
    studentRanking,
    trend,
  });
}
