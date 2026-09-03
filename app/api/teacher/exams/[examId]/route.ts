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

  /* Compute duration_minutes from starts_at / ends_at */
  const row = data as Record<string, unknown>;
  const startsAt = row.starts_at as string | null;
  const endsAt = row.ends_at as string | null;
  let durationMinutes: number | null = null;
  if (startsAt && endsAt) {
    const diffMs = new Date(endsAt).getTime() - new Date(startsAt).getTime();
    if (Number.isFinite(diffMs) && diffMs > 0) {
      durationMinutes = Math.round(diffMs / 60000);
    }
  }

  /* Fetch exam_questions (junction rows) */
  const { data: eqRows } = await supabase
    .from("exam_questions")
    .select("id, question_id, marks, sort_order")
    .eq("exam_id", examId)
    .order("sort_order", { ascending: true });

  /* Batch-fetch the actual question content from the questions table */
  const eqList = (eqRows ?? []) as Array<Record<string, unknown>>;
  const questionIds = eqList
    .map((eq) => eq.question_id as string)
    .filter(Boolean);

  let questionsMap: Record<string, Record<string, unknown>> = {};
  if (questionIds.length > 0) {
    const { data: qRows } = await supabase
      .from("questions")
      .select("id, prompt, type")
      .in("id", questionIds);
    for (const q of (qRows ?? []) as Array<Record<string, unknown>>) {
      questionsMap[q.id as string] = q;
    }
  }

  /* Map to the shape the page expects:
     prompt → question_text, type → question_type,
     marks → points, sort_order → order */
  const mappedQuestions = eqList.map((eq) => {
    const q = questionsMap[eq.question_id as string] ?? {};
    return {
      id: eq.id,
      question_text: (q.prompt as string) ?? "",
      question_type: (q.type as string) ?? null,
      points: (eq.marks as number) ?? null,
      order: (eq.sort_order as number) ?? null,
    };
  });

  return NextResponse.json({
    ok: true,
    data: {
      ...row,
      duration_minutes: durationMinutes,
      questions: mappedQuestions,
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
