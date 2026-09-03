import { NextRequest, NextResponse } from "next/server";
import { resolveTeacherContext, unauthorized } from "@/lib/teacher-api";

export async function GET(req: NextRequest) {
  const ctx = await resolveTeacherContext(req);
  if (!ctx) return unauthorized();

  const { supabase, schoolId, teacherId } = ctx;

  const { data, error } = await supabase
    .from("class_schedules")
    .select(
      "id, day_of_week, start_time, end_time, subject_name, class_name, room",
    )
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId)
    .order("start_time", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, error: "fetch_failed" },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;

  const slots = rows.map((row) => ({
    id: row.id as string,
    day_of_week: (row.day_of_week as string) ?? "sunday",
    start_time: (row.start_time as string) ?? "",
    end_time: (row.end_time as string) ?? "",
    subject_name: (row.subject_name as string) ?? "—",
    class_name: (row.class_name as string) ?? "",
    room: (row.room as string) ?? null,
  }));

  return NextResponse.json({ ok: true, data: { slots } });
}
