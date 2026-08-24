import { NextRequest, NextResponse } from "next/server";
import { resolveStudentContext, unauthorized } from "@/lib/student-api";

export async function GET(req: NextRequest) {
  const ctx = await resolveStudentContext(req);
  if (!ctx) return unauthorized();

  const { supabase, studentId, schoolId } = ctx;

  const { data, error } = await supabase
    .from("attendance_records")
    .select("id, attendance_date, status, note")
    .eq("student_id", studentId)
    .eq("school_id", schoolId)
    .order("attendance_date", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json(
      { ok: false, error: "fetch_failed" },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as Array<{
    id: string;
    attendance_date: string;
    status: string;
    note: string | null;
  }>;

  const total = rows.length;
  const present = rows.filter((r) => r.status === "present").length;
  const absent = rows.filter((r) => r.status === "absent").length;
  const late = rows.filter((r) => r.status === "late").length;
  const excused = rows.filter((r) => r.status === "excused").length;
  const rate =
    total > 0 ? Math.round(((present + late) / total) * 100) : null;

  return NextResponse.json({
    ok: true,
    data: {
      summary: { total, present, absent, late, excused, rate },
      records: rows.map((r) => ({
        id: r.id,
        date: r.attendance_date,
        status: r.status,
        note: r.note,
      })),
    },
  });
}
