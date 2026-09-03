import { NextRequest, NextResponse } from "next/server";
import { resolveTeacherContext, unauthorized } from "@/lib/teacher-api";

export async function GET(req: NextRequest) {
  const ctx = await resolveTeacherContext(req);
  if (!ctx) return unauthorized();

  const { supabase, schoolId, teacherId } = ctx;

  const { data: scheduleData, error: scheduleErr } = await supabase
    .from("class_schedules")
    .select("class_name, subject_name")
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId);

  if (scheduleErr) {
    return NextResponse.json(
      { ok: false, error: "fetch_failed" },
      { status: 500 },
    );
  }

  const rows = (scheduleData ?? []) as Array<Record<string, unknown>>;

  const classMap = new Map<string, Set<string>>();
  for (const row of rows) {
    const className = (row.class_name as string) ?? "";
    const subject = (row.subject_name as string) ?? "";
    if (!className) continue;
    if (!classMap.has(className)) {
      classMap.set(className, new Set());
    }
    if (subject) {
      classMap.get(className)!.add(subject);
    }
  }

  const classNames = Array.from(classMap.keys());

  const countPromises = classNames.map((cn) =>
    supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("class_name", cn),
  );

  const countResults = await Promise.all(countPromises);

  const classes = classNames.map((cn, i) => ({
    class_name: cn,
    student_count: countResults[i].count ?? 0,
    subjects: Array.from(classMap.get(cn) ?? []),
  }));

  return NextResponse.json({ ok: true, data: { classes } });
}
