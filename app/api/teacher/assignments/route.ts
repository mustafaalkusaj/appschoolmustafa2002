import { NextRequest, NextResponse } from "next/server";
import { resolveTeacherContext, unauthorized } from "@/lib/teacher-api";

export async function GET(req: NextRequest) {
  const ctx = await resolveTeacherContext(req);
  if (!ctx) return unauthorized();

  const { supabase, teacherId, schoolId } = ctx;

  const { data, error } = await supabase
    .from("assignments")
    .select(
      "id, title, description, class_name, subject, due_at, created_at",
    )
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { ok: false, error: "fetch_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: (data ?? []) as Record<string, unknown>[],
  });
}

export async function POST(req: NextRequest) {
  const ctx = await resolveTeacherContext(req);
  if (!ctx) return unauthorized();

  const { supabase, teacherId, schoolId } = ctx;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const title = body.title as string | undefined;
  const description = body.description as string | undefined;
  const className = body.class_name as string | undefined;
  const subject = body.subject as string | undefined;
  const dueAt = body.due_at as string | undefined;

  if (!title || !className || !subject) {
    return NextResponse.json(
      { ok: false, error: "missing_required_fields" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("assignments")
    .insert({
      title,
      description: description ?? null,
      class_name: className,
      subject,
      due_at: dueAt ?? null,
      teacher_id: teacherId,
      school_id: schoolId,
    })
    .select("id, title, class_name, subject, due_at, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: "insert_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: data as Record<string, unknown>,
  });
}
