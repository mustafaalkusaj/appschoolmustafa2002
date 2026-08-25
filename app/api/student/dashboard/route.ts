import { NextRequest, NextResponse } from "next/server";
import { resolveStudentContext, unauthorized } from "@/lib/student-api";

export async function GET(req: NextRequest) {
  const ctx = await resolveStudentContext(req);
  if (!ctx) return unauthorized();

  const { supabase, studentId, schoolId, className } = ctx;

  const todayDow = new Date().getDay();
  const nowIso = new Date().toISOString();

  const [
    studentRes,
    attendanceRes,
    examsRes,
    behaviorRes,
    paymentsRes,
    scheduleRes,
    gradesRes,
    recentBehaviorRes,
    allGradesRes,
    assignmentsRes,
    announcementsRes,
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
      .gte("starts_at", nowIso)
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

    supabase
      .from("grades")
      .select("score, max_score")
      .eq("student_id", studentId)
      .eq("school_id", schoolId),

    supabase
      .from("assignments")
      .select("id, title, subject, due_at, content_kind, description")
      .eq("school_id", schoolId)
      .eq("class_name", className ?? "")
      .gte("due_at", nowIso)
      .order("due_at", { ascending: true })
      .limit(5),

    supabase
      .from("school_announcements")
      .select("id, title, body, created_at, media_url, media_type, is_pinned")
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

  const allGradeRows = (allGradesRes.data ?? []) as Array<{
    score: number;
    max_score: number;
  }>;
  let gradeAverage: number | null = null;
  if (allGradeRows.length > 0) {
    const totalScore = allGradeRows.reduce((s, g) => s + (Number(g.score) || 0), 0);
    const totalMax = allGradeRows.reduce((s, g) => s + (Number(g.max_score) || 0), 0);
    gradeAverage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : null;
  }

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

  const assignmentRows = (assignmentsRes.data ?? []) as Array<
    Record<string, unknown>
  >;
  const upcomingAssignments = assignmentRows.map((a) => ({
    id: a.id as string,
    title: (a.title as string) ?? "—",
    subject: (a.subject as string) ?? null,
    due_at: ((a.due_at as string) ?? "").slice(0, 10),
    content_kind: (a.content_kind as string) ?? "homework",
  }));

  const announcementRows = (announcementsRes.data ?? []) as Array<
    Record<string, unknown>
  >;
  const announcements = announcementRows.map((a) => ({
    id: a.id as string,
    title: (a.title as string) ?? "",
    body: (a.body as string) ?? "",
    created_at: ((a.created_at as string) ?? "").slice(0, 10),
    media_url: (a.media_url as string) ?? null,
  }));

  return NextResponse.json({
    ok: true,
    data: {
      student_name: (student?.full_name as string) ?? null,
      class_name: className,
      attendance_rate: attendanceRate,
      attendance_total: totalDays,
      attendance_present: presentDays,
      attendance_absent: absentDays,
      grade_average: gradeAverage,
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
      upcoming_assignments: upcomingAssignments,
      announcements,
    },
  });
}
