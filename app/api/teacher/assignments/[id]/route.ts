import { NextRequest, NextResponse } from "next/server";
import { resolveTeacherContext, unauthorized } from "@/lib/teacher-api";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveTeacherContext(req);
  if (!ctx) return unauthorized();

  const { id } = await params;
  const { supabase, teacherId, schoolId } = ctx;

  const { data, error } = await supabase
    .from("assignments")
    .select(
      "id, title, description, class_name, subject, due_at, content_kind, max_grade, allow_late, status, teacher_id, created_at",
    )
    .eq("id", id)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, error: "fetch_failed" },
      { status: 500 },
    );
  }

  const row = data as Record<string, unknown> | null;

  if (!row || row.teacher_id !== teacherId) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, data: row });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveTeacherContext(req);
  if (!ctx) return unauthorized();

  const { id } = await params;
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

  const { data: existing, error: fetchError } = await supabase
    .from("assignments")
    .select("id, teacher_id")
    .eq("id", id)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json(
      { ok: false, error: "fetch_failed" },
      { status: 500 },
    );
  }

  const existingRow = existing as Record<string, unknown> | null;
  if (!existingRow || existingRow.teacher_id !== teacherId) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.title === "string") updates.title = body.title;
  if (typeof body.description === "string" || body.description === null) {
    updates.description = body.description;
  }
  if (typeof body.due_at === "string" || body.due_at === null) {
    updates.due_at = body.due_at;
  }
  if (typeof body.max_grade === "number") updates.max_grade = body.max_grade;
  if (typeof body.allow_late === "boolean") updates.allow_late = body.allow_late;
  if (typeof body.status === "string") updates.status = body.status;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { ok: false, error: "no_updates_provided" },
      { status: 400 },
    );
  }

  const { data: updated, error } = await supabase
    .from("assignments")
    .update(updates)
    .eq("id", id)
    .eq("school_id", schoolId)
    .select(
      "id, title, description, class_name, subject, due_at, max_grade, allow_late, status, created_at",
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
    data: updated as unknown as Record<string, unknown>,
  });
}
