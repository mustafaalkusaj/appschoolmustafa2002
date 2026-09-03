import { NextRequest, NextResponse } from "next/server";
import { resolveTeacherContext, unauthorized } from "@/lib/teacher-api";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) {
  const ctx = await resolveTeacherContext(req);
  if (!ctx) return unauthorized();

  const { examId } = await params;
  const { supabase, schoolId } = ctx;

  const { data, error } = await supabase
    .from("exams")
    .select("*")
    .eq("id", examId)
    .eq("school_id", schoolId)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  const { data: questions } = await supabase
    .from("exam_questions")
    .select("id, exam_id, question_id, marks, sort_order")
    .eq("exam_id", examId)
    .order("sort_order", { ascending: true });

  return NextResponse.json({
    ok: true,
    data: {
      ...(data as Record<string, unknown>),
      questions: (questions ?? []) as Record<string, unknown>[],
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) {
  const ctx = await resolveTeacherContext(req);
  if (!ctx) return unauthorized();

  const { examId } = await params;
  const { supabase, schoolId } = ctx;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const allowed = [
    "title",
    "subject",
    "class_name",
    "starts_at",
    "ends_at",
    "total_marks",
    "type",
  ];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      updates[key] = body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { ok: false, error: "no_fields_to_update" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("exams")
    .update(updates as Record<string, unknown>)
    .eq("id", examId)
    .eq("school_id", schoolId)
    .select(
      "id, title, subject, class_name, starts_at, ends_at, total_marks, type",
    )
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: "update_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: data as Record<string, unknown>,
  });
}
