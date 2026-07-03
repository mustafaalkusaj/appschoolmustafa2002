import { NextRequest, NextResponse } from "next/server";

import {
  AVAILABLE_GATE,
  featureGateFromError,
  resolveMobileRouteContextAny,
} from "@/lib/mobile-api-admin";

/**
 * GET /api/mobile/parent/exams
 *
 * Returns exam attempts (score/status) for every child linked to the
 * authenticated parent, with the exam metadata embedded. Shape matches the
 * mobile `ParentExamsData` contract in lib/parent-data.ts.
 */
export async function GET(req: NextRequest) {
  const context = await resolveMobileRouteContextAny(req, "parent");
  if (!context.ok) return context.response;

  const { serviceSupabase, schoolId, authUserId } = context.value;

  const { data: links, error: linkError } = await serviceSupabase
    .from("parent_student_links")
    .select("student_id")
    .eq("parent_id", authUserId);

  if (linkError) {
    return NextResponse.json({
      ok: true,
      gate: featureGateFromError(linkError, "parent_student_links"),
      exams: [],
    });
  }

  const studentIds = (links ?? [])
    .map((l) => l.student_id)
    .filter(Boolean) as string[];

  if (!studentIds.length) {
    return NextResponse.json({ ok: true, gate: AVAILABLE_GATE, exams: [] });
  }

  const { data: attempts, error: attemptsError } = await serviceSupabase
    .from("exam_attempts")
    .select("id, exam_id, student_id, score, submitted_at, status")
    .eq("school_id", schoolId)
    .in("student_id", studentIds)
    .order("submitted_at", { ascending: false, nullsFirst: false });

  if (attemptsError) {
    return NextResponse.json({
      ok: true,
      gate: featureGateFromError(attemptsError, "exam_attempts"),
      exams: [],
    });
  }

  const examIds = Array.from(
    new Set((attempts ?? []).map((a) => a.exam_id).filter(Boolean)),
  ) as string[];

  const examsById = new Map<
    string,
    {
      id: string;
      title: string | null;
      subject: string | null;
      total_marks: number | null;
      starts_at: string | null;
    }
  >();

  if (examIds.length) {
    const { data: exams } = await serviceSupabase
      .from("exams")
      .select("id, title, subject, total_marks, starts_at")
      .eq("school_id", schoolId)
      .in("id", examIds);

    for (const exam of exams ?? []) {
      examsById.set(exam.id, {
        id: exam.id,
        title: exam.title ?? null,
        subject: exam.subject ?? null,
        total_marks: exam.total_marks ?? null,
        starts_at: exam.starts_at ?? null,
      });
    }
  }

  const result = (attempts ?? []).map((a) => ({
    id: a.id,
    student_id: a.student_id,
    score: a.score ?? null,
    submitted_at: a.submitted_at ?? null,
    status: a.status ?? null,
    exams: a.exam_id ? examsById.get(a.exam_id) ?? null : null,
  }));

  return NextResponse.json({
    ok: true,
    gate: AVAILABLE_GATE,
    exams: result,
  });
}
