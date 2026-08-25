import { NextRequest, NextResponse } from "next/server";
import { resolveStudentContext, unauthorized } from "@/lib/student-api";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveStudentContext(req);
  if (!ctx) return unauthorized();

  const { id } = await params;
  const { supabase, schoolId, studentId, className } = ctx;

  /* ── fetch exam ── */
  const { data: exam, error: eErr } = await supabase
    .from("exams")
    .select(
      "id, title, type, subject, class_name, total_marks, starts_at, ends_at, description, is_randomized",
    )
    .eq("id", id)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (eErr) {
    return NextResponse.json(
      { ok: false, error: eErr.message },
      { status: 500 },
    );
  }

  if (!exam) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  const row = exam as unknown as Record<string, unknown>;

  if (row.class_name !== className) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  /* ── check for existing attempt ── */
  const { data: attempt } = await supabase
    .from("exam_attempts")
    .select("id, status, score, submitted_at")
    .eq("exam_id", id)
    .eq("student_id", studentId)
    .eq("school_id", schoolId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const att = attempt as Record<string, unknown> | null;

  return NextResponse.json({
    ok: true,
    data: {
      exam: {
        id: row.id as string,
        title: (row.title as string) ?? "—",
        type: (row.type as string) ?? null,
        subject: (row.subject as string) ?? null,
        total_marks: row.total_marks != null ? Number(row.total_marks) : null,
        starts_at: (row.starts_at as string) ?? null,
        ends_at: (row.ends_at as string) ?? null,
        description: (row.description as string) ?? null,
      },
      hasAttempt: !!att,
      attemptStatus: att ? (att.status as string) : null,
      score: att?.score != null ? Number(att.score) : null,
    },
  });
}
