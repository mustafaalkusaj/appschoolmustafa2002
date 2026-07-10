import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["admin", "super_admin", "employee"] as const;
const MANAGE_ROLES = ["admin", "super_admin", "employee"] as const;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(request: NextRequest) {
  const examId = request.nextUrl.searchParams.get("examId");
  if (!examId) {
    return NextResponse.json({ ok: false, error: "examId is required" }, { status: 400 });
  }

  const context = await resolveSchoolScopedActorContext(
    request.nextUrl.searchParams.get("schoolId"),
    { allowedRoles: [...ALLOWED_ROLES], roleDeniedMessage: "ليس لديك صلاحية عرض إعدادات الامتحانات." },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorSupabase, targetSchoolId } = context.value;

  const { data: exam, error: examError } = await actorSupabase
    .from("exams")
    .select("id, school_id")
    .eq("id", examId)
    .eq("school_id", targetSchoolId)
    .single();

  if (examError || !exam) {
    return NextResponse.json({ ok: false, error: "exam not found" }, { status: 404 });
  }

  const { data, error } = await actorSupabase
    .from("exam_settings")
    .select("*")
    .eq("exam_id", examId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data });
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.examId) {
    return NextResponse.json({ ok: false, error: "examId is required" }, { status: 400 });
  }

  const context = await resolveSchoolScopedActorContext(
    body.schoolId ?? null,
    { allowedRoles: [...MANAGE_ROLES], roleDeniedMessage: "ليس لديك صلاحية تعديل إعدادات الامتحانات." },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorSupabase, targetSchoolId } = context.value;

  const { data: exam, error: examError } = await actorSupabase
    .from("exams")
    .select("id, school_id")
    .eq("id", body.examId)
    .eq("school_id", targetSchoolId)
    .single();

  if (examError || !exam) {
    return NextResponse.json({ ok: false, error: "exam not found" }, { status: 404 });
  }

  const settingsPayload: Record<string, unknown> = { exam_id: body.examId };
  const fields = [
    "duration_minutes", "shuffle_questions", "shuffle_options", "auto_submit",
    "show_results_immediately", "allow_review", "lock_browser", "max_attempts",
    "passing_marks", "instructions",
  ] as const;

  for (const field of fields) {
    if (body[field] !== undefined) {
      settingsPayload[field] = body[field];
    }
  }

  const { data, error } = await actorSupabase
    .from("exam_settings")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert(settingsPayload as any, { onConflict: "exam_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data });
}
