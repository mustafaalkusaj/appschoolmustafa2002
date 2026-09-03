import { NextRequest, NextResponse } from "next/server";
import { resolveTeacherContext, unauthorized } from "@/lib/teacher-api";

export async function GET(req: NextRequest) {
  const ctx = await resolveTeacherContext(req);
  if (!ctx) return unauthorized();

  const { supabase, schoolId, teacherId } = ctx;

  const { data: scheduleData } = await supabase
    .from("class_schedules")
    .select("class_name, subject_name")
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId);

  const schedRows = (scheduleData ?? []) as Array<Record<string, unknown>>;
  const classNames = Array.from(
    new Set(schedRows.map((r) => r.class_name as string).filter(Boolean)),
  );

  if (classNames.length === 0) {
    return NextResponse.json({
      ok: true,
      data: { attendance_summary: [], grades_summary: [], class_names: [] },
    });
  }

  const url = new URL(req.url);
  const dateFrom =
    url.searchParams.get("date_from") ??
    new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const dateTo =
    url.searchParams.get("date_to") ??
    new Date().toISOString().slice(0, 10);

  const studentsByClass = new Map<string, string[]>();
  for (const cn of classNames) {
    const { data: students } = await supabase
      .from("students")
      .select("id")
      .eq("school_id", schoolId)
      .eq("class_name", cn);
    studentsByClass.set(
      cn,
      ((students ?? []) as Array<Record<string, unknown>>).map(
        (s) => s.id as string,
      ),
    );
  }

  const attendanceSummary: Array<{
    class_name: string;
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    rate: number;
  }> = [];

  for (const cn of classNames) {
    const ids = studentsByClass.get(cn) ?? [];
    if (ids.length === 0) {
      attendanceSummary.push({
        class_name: cn,
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        rate: 0,
      });
      continue;
    }

    const { data: records } = await supabase
      .from("attendance_records")
      .select("status")
      .eq("school_id", schoolId)
      .in("student_id", ids)
      .gte("attendance_date", dateFrom)
      .lte("attendance_date", dateTo);

    const rows = (records ?? []) as Array<Record<string, unknown>>;
    const total = rows.length;
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;
    for (const r of rows) {
      const s = r.status as string;
      if (s === "present") present++;
      else if (s === "absent") absent++;
      else if (s === "late") late++;
      else if (s === "excused") excused++;
    }

    attendanceSummary.push({
      class_name: cn,
      total,
      present,
      absent,
      late,
      excused,
      rate: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
    });
  }

  const gradesSummary: Array<{
    class_name: string;
    subject: string;
    avg_score: number;
    max_score: number;
    students_count: number;
  }> = [];

  const subjectsByClass = new Map<string, Set<string>>();
  for (const r of schedRows) {
    const cn = r.class_name as string;
    const sn = r.subject_name as string;
    if (!cn || !sn) continue;
    if (!subjectsByClass.has(cn)) subjectsByClass.set(cn, new Set());
    subjectsByClass.get(cn)!.add(sn);
  }

  for (const cn of classNames) {
    const ids = studentsByClass.get(cn) ?? [];
    if (ids.length === 0) continue;

    const { data: gradesData } = await supabase
      .from("grades")
      .select("score, max_score, subject_id")
      .eq("school_id", schoolId)
      .in("student_id", ids);

    const grades = (gradesData ?? []) as Array<Record<string, unknown>>;

    const bySubject = new Map<
      string,
      { totalScore: number; totalMax: number; count: number }
    >();

    for (const g of grades) {
      const subId = (g.subject_id as string) ?? "general";
      const score = Number(g.score) || 0;
      const max = Number(g.max_score) || 100;
      if (!bySubject.has(subId)) {
        bySubject.set(subId, { totalScore: 0, totalMax: 0, count: 0 });
      }
      const entry = bySubject.get(subId)!;
      entry.totalScore += score;
      entry.totalMax += max;
      entry.count += 1;
    }

    const subjects = Array.from(subjectsByClass.get(cn) ?? []);
    if (bySubject.size === 0 && subjects.length > 0) {
      for (const sn of subjects) {
        gradesSummary.push({
          class_name: cn,
          subject: sn,
          avg_score: 0,
          max_score: 100,
          students_count: 0,
        });
      }
    } else {
      for (const [subId, agg] of Array.from(bySubject)) {
        gradesSummary.push({
          class_name: cn,
          subject: subId,
          avg_score:
            agg.count > 0 ? Math.round(agg.totalScore / agg.count) : 0,
          max_score:
            agg.count > 0 ? Math.round(agg.totalMax / agg.count) : 100,
          students_count: agg.count,
        });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    data: {
      attendance_summary: attendanceSummary,
      grades_summary: gradesSummary,
      class_names: classNames,
      date_from: dateFrom,
      date_to: dateTo,
    },
  });
}
