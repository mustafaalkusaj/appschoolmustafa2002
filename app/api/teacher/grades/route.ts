import { NextRequest, NextResponse } from "next/server";
import { resolveTeacherContext, unauthorized } from "@/lib/teacher-api";

export async function GET(req: NextRequest) {
  const ctx = await resolveTeacherContext(req);
  if (!ctx) return unauthorized();

  const { supabase, schoolId } = ctx;

  const url = new URL(req.url);
  const className = url.searchParams.get("class_name");
  const subject = url.searchParams.get("subject");

  if (!className) {
    return NextResponse.json(
      { ok: false, error: "class_name_required" },
      { status: 400 },
    );
  }

  const { data: students, error: studentsErr } = await supabase
    .from("students")
    .select("id, full_name")
    .eq("school_id", schoolId)
    .eq("class_name", className)
    .order("full_name", { ascending: true });

  if (studentsErr) {
    return NextResponse.json(
      { ok: false, error: "fetch_failed" },
      { status: 500 },
    );
  }

  const studentRows = (students ?? []) as Array<Record<string, unknown>>;
  const studentIds = studentRows.map((s) => s.id as string);

  let grades: Array<Record<string, unknown>> = [];

  if (studentIds.length > 0) {
    let query = supabase
      .from("grades")
      .select(
        "id, student_id, score, max_score, exam_type, subject_id, created_at, subjects(name)",
      )
      .eq("school_id", schoolId)
      .in("student_id", studentIds)
      .order("created_at", { ascending: false });

    if (subject) {
      query = query.eq("subject_id", subject);
    }

    const { data: gradesData, error: gradesErr } = await query;

    if (gradesErr) {
      return NextResponse.json(
        { ok: false, error: "fetch_failed" },
        { status: 500 },
      );
    }

    grades = (gradesData ?? []) as Array<Record<string, unknown>>;
  }

  const studentMap = new Map<string, string>();
  for (const s of studentRows) {
    studentMap.set(s.id as string, (s.full_name as string) ?? "");
  }

  return NextResponse.json({
    ok: true,
    data: {
      grades: grades.map((g) => {
        const subj = g.subjects as { name: string } | null;
        const score = Number(g.score) || 0;
        const maxScore = Number(g.max_score) || 0;
        return {
          id: g.id as string,
          student_id: g.student_id as string,
          student_name: studentMap.get(g.student_id as string) ?? "",
          subject_name: subj?.name ?? "—",
          exam_type: (g.exam_type as string) ?? null,
          score,
          max_score: maxScore,
          percentage:
            maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
          date: (g.created_at as string) ?? null,
        };
      }),
    },
  });
}

export async function POST(req: NextRequest) {
  const ctx = await resolveTeacherContext(req);
  if (!ctx) return unauthorized();

  const { supabase, schoolId, teacherId } = ctx;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_body" },
      { status: 400 },
    );
  }

  const gradesInput = body.grades as
    | Array<{
        student_id: string;
        score: number;
        max_score: number;
        exam_type?: string;
        subject_id?: string;
      }>
    | undefined;

  if (!gradesInput || !Array.isArray(gradesInput) || gradesInput.length === 0) {
    return NextResponse.json(
      { ok: false, error: "grades_required" },
      { status: 400 },
    );
  }

  const insertRows = gradesInput.map((g) => ({
    student_id: g.student_id,
    school_id: schoolId,
    score: g.score,
    max_score: g.max_score,
    exam_type: g.exam_type ?? null,
    subject_id: g.subject_id ?? null,
    teacher_id: teacherId,
  }));

  const { error } = await supabase.from("grades").insert(insertRows);

  if (error) {
    return NextResponse.json(
      { ok: false, error: "insert_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: { inserted: insertRows.length },
  });
}
