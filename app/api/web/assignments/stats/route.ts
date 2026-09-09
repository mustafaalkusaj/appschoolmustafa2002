import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { assignmentSubmissionsTable } from "@/lib/assignment-grading-tables";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

interface SubjectStat {
  subject: string;
  assignments_count: number;
  total_submissions: number;
  expected_submissions: number;
  submission_rate: number;
  average_grade: number | null;
  graded_count: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const context = await resolveSchoolScopedActorContext(
    searchParams.get("schoolId"),
    {
      allowedRoles: ["admin", "super_admin"],
      roleDeniedMessage: "ليس لديك صلاحية عرض إحصائيات الواجبات.",
    },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { targetSchoolId } = context.value;
  const svc = createServiceSupabaseClient();

  const { data: assignments, error: assignmentsError } = await svc
    .from("assignments")
    .select("id, subject, class_name")
    .eq("school_id", targetSchoolId);

  if (assignmentsError) {
    return jsonError(assignmentsError.message, 500);
  }

  const assignmentRows = (assignments ?? []) as Array<Record<string, unknown>>;
  if (assignmentRows.length === 0) {
    return NextResponse.json({ ok: true, data: [] as SubjectStat[] });
  }

  const assignmentIds = assignmentRows.map((a) => a.id as string);

  const classNames = Array.from(
    new Set(assignmentRows.map((a) => a.class_name as string).filter(Boolean)),
  );

  const [{ data: submissions }, { data: students }] = await Promise.all([
    assignmentSubmissionsTable(svc)
      .select("assignment_id, grade, status")
      .eq("school_id", targetSchoolId)
      .in("assignment_id", assignmentIds),
    classNames.length > 0
      ? svc
          .from("students")
          .select("id, class_name")
          .eq("school_id", targetSchoolId)
          .in("class_name", classNames)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
  ]);

  const studentCountByClass = new Map<string, number>();
  for (const s of (students ?? []) as Array<Record<string, unknown>>) {
    const cn = s.class_name as string;
    studentCountByClass.set(cn, (studentCountByClass.get(cn) ?? 0) + 1);
  }

  const submissionRows = (submissions ?? []) as Array<Record<string, unknown>>;
  const submissionsByAssignmentId = new Map<string, Array<Record<string, unknown>>>();
  for (const s of submissionRows) {
    const key = s.assignment_id as string;
    const arr = submissionsByAssignmentId.get(key) ?? [];
    arr.push(s);
    submissionsByAssignmentId.set(key, arr);
  }

  const bySubject = new Map<
    string,
    {
      assignmentIds: string[];
      expected: number;
    }
  >();

  for (const a of assignmentRows) {
    const subject = (a.subject as string) ?? "—";
    const className = a.class_name as string;
    const expected = studentCountByClass.get(className) ?? 0;
    const entry = bySubject.get(subject) ?? { assignmentIds: [], expected: 0 };
    entry.assignmentIds.push(a.id as string);
    entry.expected += expected;
    bySubject.set(subject, entry);
  }

  const stats: SubjectStat[] = Array.from(bySubject.entries()).map(
    ([subject, entry]) => {
      const subjectSubmissions = entry.assignmentIds.flatMap(
        (id) => submissionsByAssignmentId.get(id) ?? [],
      );
      const grades = subjectSubmissions
        .map((s) => s.grade as number | null)
        .filter((g): g is number => typeof g === "number");
      const gradedCount = subjectSubmissions.filter(
        (s) => s.status === "graded",
      ).length;

      return {
        subject,
        assignments_count: entry.assignmentIds.length,
        total_submissions: subjectSubmissions.length,
        expected_submissions: entry.expected,
        submission_rate:
          entry.expected > 0
            ? Math.round((subjectSubmissions.length / entry.expected) * 100)
            : 0,
        average_grade:
          grades.length > 0
            ? Math.round(
                (grades.reduce((sum, g) => sum + g, 0) / grades.length) * 10,
              ) / 10
            : null,
        graded_count: gradedCount,
      };
    },
  );

  return NextResponse.json({ ok: true, data: stats });
}
