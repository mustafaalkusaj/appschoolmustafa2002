import { NextRequest, NextResponse } from "next/server";
import { resolveTeacherContext, unauthorized } from "@/lib/teacher-api";
import {
  assignmentsTable,
  assignmentSubmissionsTable,
} from "@/lib/assignment-grading-tables";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveTeacherContext(req);
  if (!ctx) return unauthorized();

  const { id: assignmentId } = await params;
  const { supabase, teacherId, schoolId } = ctx;

  const { data: assignment, error: assignmentError } = await assignmentsTable(
    supabase,
  )
    .select("id, teacher_id, max_grade")
    .eq("id", assignmentId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (assignmentError) {
    return NextResponse.json(
      { ok: false, error: "fetch_failed" },
      { status: 500 },
    );
  }

  const assignmentRow = assignment as Record<string, unknown> | null;
  if (!assignmentRow || assignmentRow.teacher_id !== teacherId) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  const { data: submissions, error } = await assignmentSubmissionsTable(
    supabase,
  )
    .select(
      "id, student_id, notes, file_url, file_name, submitted_at, is_late, grade, feedback, status, graded_at",
    )
    .eq("assignment_id", assignmentId)
    .eq("school_id", schoolId)
    .order("submitted_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { ok: false, error: "fetch_failed" },
      { status: 500 },
    );
  }

  const rows = (submissions ?? []) as Array<Record<string, unknown>>;
  const studentIds = Array.from(
    new Set(rows.map((r) => r.student_id as string).filter(Boolean)),
  );

  const nameById = new Map<string, string>();
  if (studentIds.length > 0) {
    const { data: studentRows } = await supabase
      .from("students")
      .select("id, full_name")
      .in("id", studentIds);

    for (const s of (studentRows ?? []) as Array<Record<string, unknown>>) {
      nameById.set(s.id as string, (s.full_name as string) ?? "");
    }
  }

  const data = rows.map((r) => ({
    id: r.id as string,
    student_id: r.student_id as string,
    student_name: nameById.get(r.student_id as string) ?? "—",
    notes: (r.notes as string) ?? null,
    file_url: (r.file_url as string) ?? null,
    file_name: (r.file_name as string) ?? null,
    submitted_at: (r.submitted_at as string) ?? null,
    is_late: Boolean(r.is_late),
    grade: (r.grade as number | null) ?? null,
    feedback: (r.feedback as string) ?? null,
    status: (r.status as string) ?? "submitted",
    graded_at: (r.graded_at as string) ?? null,
  }));

  return NextResponse.json({
    ok: true,
    data: {
      submissions: data,
      max_grade: (assignmentRow.max_grade as number) ?? 100,
    },
  });
}
