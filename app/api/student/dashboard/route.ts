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

  const { supabase, studentId, schoolId, className } = ctx;

  const todayDow = new Date().getDay();

  const [
    studentRes,
    attendanceRes,
    examsRes,
    behaviorRes,
    paymentsRes,
    scheduleRes,
    gradesRes,
    recentBehaviorRes,
  ] = await Promise.all([
    supabase
      .from("students")
      .select("full_name, total_fee, paid_fee, discount_value")
      .eq("id", studentId)
      .eq("school_id", schoolId)
      .maybeSingle(),

    supabase
      .from("attendance_records")
      .select("status")
      .eq("student_id", studentId)
      .eq("school_id", schoolId),

    supabase
      .from("exams")
      .select("id, title, subject, starts_at, type")
      .eq("school_id", schoolId)
      .eq("class_name", className ?? "")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(5),

    supabase
      .from("behavior_logs")
      .select("points")
      .eq("student_id", studentId)
      .eq("school_id", schoolId),

    supabase
      .from("payments")
      .select("amount")
      .eq("student_id", studentId)
      .eq("school_id", schoolId)
      .is("deleted_at", null),

    className
      ? supabase
          .from("class_schedules")
          .select(
            "id, start_time, end_time, subject_name, room, teacher_id, teachers(full_name)",
          )
          .eq("school_id", schoolId)
          .eq("class_name", className)
          .eq("day_of_week", todayDow)
          .order("start_time", { ascending: true })
      : Promise.resolve({ data: [], error: null }),

    supabase
      .from("grades")
      .select("id, score, max_score, exam_type, created_at, subjects(name)")
      .eq("student_id", studentId)
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("behavior_logs")
      .select("id, behavior_type, points, note, created_at")
      .eq("student_id", studentId)
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const student = studentRes.data as Record<string, unknown> | null;

  const attendanceRows = (attendanceRes.data ?? []) as Array<{
    status: string;
  }>;
  const totalDays = attendanceRows.length;
  const presentDays = attendanceRows.filter(
    (r) => r.status === "present" || r.status === "late",
  ).length;
  const absentDays = attendanceRows.filter(
    (r) => r.status === "absent",
  ).length;
  const attendanceRate =
    totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : null;

  const behaviorRows = (behaviorRes.data ?? []) as Array<{ points: number }>;
  const behaviorPoints = behaviorRows.reduce(
    (sum, r) => sum + (r.points ?? 0),
    0,
  );

  const totalFee = Number(student?.total_fee) || 0;
  const discount = Number(student?.discount_value) || 0;
  const paidPayments = (paymentsRes.data ?? []) as Array<{ amount: number }>;
  const totalPaid = paidPayments.reduce(
    (sum, r) => sum + (Number(r.amount) || 0),
    0,
  );
  const remaining = Math.max(0, totalFee - discount - totalPaid);

  const scheduleRows = (scheduleRes.data ?? []) as Array<
    Record<string, unknown>
  >;
  const todaySchedule = scheduleRows.map((row) => {
    const teacher = row.teachers as { full_name: string | null } | null;
    return {
      id: row.id as string,
      start_time: (row.start_time as string) ?? "",
      end_time: (row.end_time as string) ?? "",
      subject_name: (row.subject_name as string) ?? "—",
      teacher_name: teacher?.full_name ?? null,
      room: (row.room as string) ?? null,
    };
  });

  const gradeRows = (gradesRes.data ?? []) as Array<Record<string, unknown>>;
  const recentGrades = gradeRows.map((g) => {
    const subj = g.subjects as { name: string } | null;
    const score = Number(g.score) || 0;
    const maxScore = Number(g.max_score) || 0;
    return {
      id: g.id as string,
      subject_name: subj?.name ?? "—",
      exam_type: (g.exam_type as string) ?? null,
      score,
      max_score: maxScore,
      percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
      date: ((g.created_at as string) ?? "").slice(0, 10),
    };
  });

  const recentBehaviorRows = (recentBehaviorRes.data ?? []) as Array<
    Record<string, unknown>
  >;
  const recentBehavior = recentBehaviorRows.map((r) => {
    const pts = Number(r.points) || 0;
    return {
      id: r.id as string,
      type: pts >= 0 ? ("positive" as const) : ("negative" as const),
      points: Math.abs(pts),
      reason: (r.note as string) ?? null,
      date: ((r.created_at as string) ?? "").slice(0, 10),
    };
  });

  const upcomingExams = (examsRes.data ?? []) as Array<
    Record<string, unknown>
  >;

  return NextResponse.json({
    ok: true,
    data: {
      student_name: (student?.full_name as string) ?? null,
      class_name: className,
      attendance_rate: attendanceRate,
      attendance_total: totalDays,
      attendance_present: presentDays,
      attendance_absent: absentDays,
      upcoming_exams_count: upcomingExams.length,
      upcoming_exams: upcomingExams.map((e) => ({
        id: e.id as string,
        subject_name: (e.subject as string) ?? (e.title as string) ?? "—",
        exam_date: ((e.starts_at as string) ?? "").slice(0, 10),
        exam_type: (e.type as string) ?? null,
      })),
      behavior_points: behaviorPoints,
      total_fee: totalFee - discount,
      total_paid: totalPaid,
      remaining_balance: remaining,
      today_schedule: todaySchedule,
      recent_grades: recentGrades,
      recent_behavior: recentBehavior,
    },
  });
}
