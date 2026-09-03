import { NextRequest, NextResponse } from "next/server";
import { resolveTeacherContext, unauthorized } from "@/lib/teacher-api";

export async function GET(req: NextRequest) {
  const ctx = await resolveTeacherContext(req);
  if (!ctx) return unauthorized();

  const { supabase, schoolId } = ctx;

  const url = new URL(req.url);
  const className = url.searchParams.get("class_name");
  const date =
    url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  if (!className) {
    return NextResponse.json(
      { ok: false, error: "class_name_required" },
      { status: 400 },
    );
  }

  const { data: students, error: studentsErr } = await supabase
    .from("students")
    .select("id, full_name")
    .eq("school_id", schoolId)
    .eq("class_name", className)
    .order("full_name", { ascending: true });

  if (studentsErr) {
    return NextResponse.json(
      { ok: false, error: "fetch_failed" },
      { status: 500 },
    );
  }

  const studentRows = (students ?? []) as Array<Record<string, unknown>>;
  const studentIds = studentRows.map((s) => s.id as string);

  let records: Array<Record<string, unknown>> = [];

  if (studentIds.length > 0) {
    const { data: attData, error: attErr } = await supabase
      .from("attendance_records")
      .select("id, student_id, status, note, attendance_date")
      .eq("school_id", schoolId)
      .eq("attendance_date", date)
      .in("student_id", studentIds);

    if (attErr) {
      return NextResponse.json(
        { ok: false, error: "fetch_failed" },
        { status: 500 },
      );
    }

    records = (attData ?? []) as Array<Record<string, unknown>>;
  }

  const recordMap = new Map<string, Record<string, unknown>>();
  for (const r of records) {
    recordMap.set(r.student_id as string, r);
  }

  const merged = studentRows.map((s) => {
    const rec = recordMap.get(s.id as string);
    return {
      student_id: s.id as string,
      full_name: (s.full_name as string) ?? "",
      status: rec ? ((rec.status as string) ?? null) : null,
      note: rec ? ((rec.note as string) ?? null) : null,
      record_id: rec ? ((rec.id as string) ?? null) : null,
    };
  });

  return NextResponse.json({
    ok: true,
    data: { date, class_name: className, attendance: merged },
  });
}

export async function POST(req: NextRequest) {
  const ctx = await resolveTeacherContext(req);
  if (!ctx) return unauthorized();

  const { supabase, schoolId, teacherId } = ctx;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_body" },
      { status: 400 },
    );
  }

  const recordsInput = body.records as
    | Array<{ student_id: string; status: string; note?: string }>
    | undefined;
  const className = body.class_name as string | undefined;
  const date =
    (body.date as string) ?? new Date().toISOString().slice(0, 10);

  if (!recordsInput || !Array.isArray(recordsInput) || !className) {
    return NextResponse.json(
      { ok: false, error: "records_and_class_name_required" },
      { status: 400 },
    );
  }

  const upsertRows = recordsInput.map((r) => ({
    student_id: r.student_id,
    school_id: schoolId,
    attendance_date: date,
    status: r.status,
    note: r.note ?? null,
    recorded_by: teacherId,
  }));

  const { error } = await supabase
    .from("attendance_records")
    .upsert(upsertRows, {
      onConflict: "student_id,attendance_date,school_id",
    });

  if (error) {
    return NextResponse.json(
      { ok: false, error: "upsert_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: { saved: upsertRows.length, date, class_name: className },
  });
}
