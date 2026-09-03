import { NextRequest, NextResponse } from "next/server";
import { resolveTeacherContext, unauthorized } from "@/lib/teacher-api";

export async function GET(req: NextRequest) {
  const ctx = await resolveTeacherContext(req);
  if (!ctx) return unauthorized();

  const { supabase, schoolId } = ctx;

  const url = new URL(req.url);
  const className = url.searchParams.get("class_name");
  const subject = url.searchParams.get("subject");

  const { data: scheduleData } = await supabase
    .from("class_schedules")
    .select("class_name, subject_name")
    .eq("school_id", schoolId)
    .eq("teacher_id", ctx.teacherId);

  const schedRows = (scheduleData ?? []) as Array<Record<string, unknown>>;
  const classNamesSet = new Set<string>();
  const subjectsSet = new Set<string>();
  for (const r of schedRows) {
    if (r.class_name) classNamesSet.add(r.class_name as string);
    if (r.subject_name) subjectsSet.add(r.subject_name as string);
  }

  if (!className) {
    return NextResponse.json({
      ok: true,
      data: {
        students: [],
        class_names: Array.from(classNamesSet),
        subjects: Array.from(subjectsSet),
      },
    });
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
      .select("id, student_id, score, max_score")
      .eq("school_id", schoolId)
      .in("student_id", studentIds)
      .order("created_at", { ascending: false });

    if (subject) {
      query = query.eq("subject_id", subject);
    }

    const { data: gradesData } = await query;
    grades = (gradesData ?? []) as Array<Record<string, unknown>>;
  }

  const gradeMap = new Map<string, Record<string, unknown>>();
  for (const g of grades) {
    const sid = g.student_id as string;
    if (!gradeMap.has(sid)) {
      gradeMap.set(sid, g);
    }
  }

  const mapped = studentRows.map((s) => {
    const g = gradeMap.get(s.id as string);
    return {
      student_id: s.id as string,
      full_name: (s.full_name as string) ?? "",
      score: g ? (Number(g.score) || null) : null,
      max_score: g ? (Number(g.max_score) || 100) : 100,
    };
  });

  return NextResponse.json({
    ok: true,
    data: {
      students: mapped,
      class_names: Array.from(classNamesSet),
      subjects: Array.from(subjectsSet),
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
