import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";

export const dynamic = "force-dynamic";

const MANAGE_ROLES = ["admin", "super_admin", "employee"] as const;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) {
  const { searchParams } = request.nextUrl;
  const context = await resolveSchoolScopedActorContext(
    searchParams.get("schoolId"),
    { allowedRoles: [...MANAGE_ROLES], roleDeniedMessage: "ليس لديك صلاحية عرض إجابات الامتحان." },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { examId } = await params;
  const attemptId = searchParams.get("attemptId");
  const { actorSupabase, targetSchoolId } = context.value;

  // Verify exam belongs to school
  const { data: exam, error: examError } = await actorSupabase
    .from("exams")
    .select("id, school_id, title")
    .eq("id", examId)
    .eq("school_id", targetSchoolId)
    .single();

  if (examError || !exam) {
    return NextResponse.json({ ok: false, error: "exam not found" }, { status: 404 });
  }

  let answersQuery = actorSupabase
    .from("student_answers")
    .select("id, attempt_id, question_id, student_answer, is_correct, marks_awarded, time_spent_seconds, flagged, created_at")
    .order("created_at", { ascending: true });

  if (attemptId) {
    answersQuery = answersQuery.eq("attempt_id", attemptId);
  } else {
    const { data: attempts } = await actorSupabase
      .from("exam_attempts")
      .select("id")
      .eq("exam_id", examId)
      .eq("school_id", targetSchoolId);

    const attemptIds = (attempts ?? []).map((a: { id: string }) => a.id);
    if (attemptIds.length === 0) {
      return NextResponse.json({ ok: true, items: [], total: 0 });
    }
    answersQuery = answersQuery.in("attempt_id", attemptIds);
  }

  const { data, error } = await answersQuery;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, items: data ?? [], total: (data ?? []).length });
}
