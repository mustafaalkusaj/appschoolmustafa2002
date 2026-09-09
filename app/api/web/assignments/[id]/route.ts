import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import {
  assignmentsTable,
  assignmentSubmissionsTable,
} from "@/lib/assignment-grading-tables";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = request.nextUrl;
  const context = await resolveSchoolScopedActorContext(
    searchParams.get("schoolId"),
    {
      allowedRoles: ["admin", "super_admin"],
      roleDeniedMessage: "ليس لديك صلاحية عرض الواجبات.",
    },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { targetSchoolId } = context.value;
  const svc = createServiceSupabaseClient();

  const { data: assignment, error: assignmentError } = await assignmentsTable(
    svc,
  )
    .select(
      "id, title, description, class_name, subject, due_at, content_kind, max_grade, allow_late, status, teacher_id, created_at",
    )
    .eq("id", id)
    .eq("school_id", targetSchoolId)
    .maybeSingle();

  if (assignmentError) {
    return jsonError(assignmentError.message, 500);
  }
  if (!assignment) {
    return jsonError("الواجب غير موجود.", 404);
  }

  const assignmentRow = assignment as Record<string, unknown>;
  const className = assignmentRow.class_name as string | null;

  const [{ data: submissions, error: submissionsError }, { data: classStudents }] =
    await Promise.all([
      assignmentSubmissionsTable(svc)
        .select(
          "id, student_id, notes, submitted_at, is_late, grade, feedback, status",
        )
        .eq("assignment_id", id)
        .eq("school_id", targetSchoolId)
        .order("submitted_at", { ascending: false }),
      className
        ? svc
            .from("students")
            .select("id")
            .eq("school_id", targetSchoolId)
            .eq("class_name", className)
        : Promise.resolve({ data: [] as Array<{ id: string }> }),
    ]);

  if (submissionsError) {
    return jsonError(submissionsError.message, 500);
  }

  const submissionRows = (submissions ?? []) as Array<Record<string, unknown>>;
  const studentIds = Array.from(
    new Set(submissionRows.map((r) => r.student_id as string).filter(Boolean)),
  );

  const nameById = new Map<string, string>();
  if (studentIds.length > 0) {
    const { data: studentRows } = await svc
      .from("students")
      .select("id, full_name")
      .in("id", studentIds);
    for (const s of (studentRows ?? []) as Array<Record<string, unknown>>) {
      nameById.set(s.id as string, (s.full_name as string) ?? "");
    }
  }

  const submissionsData = submissionRows.map((r) => ({
    id: r.id as string,
    student_id: r.student_id as string,
    student_name: nameById.get(r.student_id as string) ?? "—",
    submitted_at: (r.submitted_at as string) ?? null,
    is_late: Boolean(r.is_late),
    grade: (r.grade as number | null) ?? null,
    feedback: (r.feedback as string) ?? null,
    status: (r.status as string) ?? "submitted",
  }));

  const gradedCount = submissionsData.filter((s) => s.status === "graded").length;

  return NextResponse.json({
    ok: true,
    data: {
      assignment: assignmentRow,
      submissions: submissionsData,
      counts: {
        total_students: (classStudents ?? []).length,
        total_submissions: submissionsData.length,
        graded: gradedCount,
      },
    },
  });
}
