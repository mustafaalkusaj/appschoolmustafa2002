import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["admin", "super_admin", "employee"] as const;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const examId = searchParams.get("examId");
  if (!examId) {
    return NextResponse.json({ ok: false, error: "examId is required" }, { status: 400 });
  }

  const context = await resolveSchoolScopedActorContext(
    searchParams.get("schoolId"),
    { allowedRoles: [...ALLOWED_ROLES], roleDeniedMessage: "ليس لديك صلاحية عرض محاولات الامتحان." },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorSupabase, targetSchoolId } = context.value;

  const { data: exam, error: examError } = await actorSupabase
    .from("exams")
    .select("id, school_id, title, total_marks")
    .eq("id", examId)
    .eq("school_id", targetSchoolId)
    .single();

  if (examError || !exam) {
    return NextResponse.json({ ok: false, error: "exam not found" }, { status: 404 });
  }

  const { data: attempts, error } = await actorSupabase
    .from("exam_attempts")
    .select("id, exam_id, student_id, score, submitted_at")
    .eq("exam_id", examId)
    .order("submitted_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const studentIds = Array.from(
    new Set((attempts ?? []).map((a) => a.student_id).filter((v): v is string => Boolean(v))),
  );
  const nameMap = new Map<string, string>();
  if (studentIds.length > 0) {
    const { data: students } = await actorSupabase
      .from("students")
      .select("id, full_name")
      .eq("school_id", targetSchoolId)
      .in("id", studentIds);
    for (const s of students ?? []) nameMap.set(s.id, s.full_name);
  }

  const items = (attempts ?? []).map((a) => ({
    ...a,
    student_name: a.student_id ? (nameMap.get(a.student_id) ?? null) : null,
  }));

  return NextResponse.json({ ok: true, exam, items, total: items.length });
}
