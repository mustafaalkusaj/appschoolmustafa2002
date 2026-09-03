import { NextRequest, NextResponse } from "next/server";
import { resolveTeacherContext, unauthorized } from "@/lib/teacher-api";

export async function GET(req: NextRequest) {
  const ctx = await resolveTeacherContext(req);
  if (!ctx) return unauthorized();

  const { supabase, userId, schoolId } = ctx;

  const { data, error } = await supabase
    .from("exams")
    .select(
      "id, title, subject, class_name, starts_at, ends_at, total_marks, type",
    )
    .eq("school_id", schoolId)
    .eq("created_by", userId)
    .order("starts_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { ok: false, error: "fetch_failed" },
      { status: 500 },
    );
  }

  /* Page expects duration_minutes (computed from starts_at / ends_at) */
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const withDuration = rows.map((row) => {
    const s = row.starts_at as string | null;
    const e = row.ends_at as string | null;
    let duration_minutes: number | null = null;
    if (s && e) {
      const diffMs = new Date(e).getTime() - new Date(s).getTime();
      if (Number.isFinite(diffMs) && diffMs > 0) {
        duration_minutes = Math.round(diffMs / 60000);
      }
    }
    return { ...row, duration_minutes, status: null };
  });

  return NextResponse.json({
    ok: true,
    data: withDuration,
  });
}

export async function POST(req: NextRequest) {
  const ctx = await resolveTeacherContext(req);
  if (!ctx) return unauthorized();

  const { supabase, userId, schoolId } = ctx;

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
  const subject = body.subject as string | undefined;
  const className = body.class_name as string | undefined;
  const startsAt = body.starts_at as string | undefined;
  const endsAt = body.ends_at as string | undefined;
  const totalMarks = body.total_marks as number | undefined;
  const type = body.type as string | undefined;

  if (!title || !subject || !className) {
    return NextResponse.json(
      { ok: false, error: "missing_required_fields" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("exams")
    .insert({
      title,
      subject,
      class_name: className,
      starts_at: startsAt ?? null,
      ends_at: endsAt ?? null,
      total_marks: totalMarks ?? null,
      type: type ?? null,
      created_by: userId,
      school_id: schoolId,
    })
    .select(
      "id, title, subject, class_name, starts_at, ends_at, total_marks, type",
    )
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
