import { NextRequest, NextResponse } from "next/server";
import { resolveStudentContext, unauthorized } from "@/lib/student-api";

const DAY_MAP: Record<number, string> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

export async function GET(req: NextRequest) {
  const ctx = await resolveStudentContext(req);
  if (!ctx) return unauthorized();

  const { supabase, schoolId, className } = ctx;

  if (!className) {
    return NextResponse.json({ ok: true, data: { slots: [] } });
  }

  const { data, error } = await supabase
    .from("class_schedules")
    .select(
      "id, day_of_week, start_time, end_time, subject_name, room, teacher_id, teachers(full_name)",
    )
    .eq("school_id", schoolId)
    .eq("class_name", className);

  if (error) {
    return NextResponse.json(
      { ok: false, error: "fetch_failed" },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;

  const slots = rows.map((row) => {
    const dayNum = Number(row.day_of_week) ?? 0;
    const teacher = row.teachers as { full_name: string | null } | null;

    return {
      id: row.id as string,
      day_of_week: DAY_MAP[dayNum] ?? "sunday",
      start_time: (row.start_time as string) ?? "",
      end_time: (row.end_time as string) ?? "",
      subject_name: (row.subject_name as string) ?? "—",
      teacher_name: teacher?.full_name ?? null,
      room: (row.room as string) ?? null,
    };
  });

  return NextResponse.json({ ok: true, data: { slots } });
}
