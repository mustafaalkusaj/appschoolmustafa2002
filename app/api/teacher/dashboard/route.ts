import { NextRequest, NextResponse } from "next/server";
import { resolveTeacherContext, unauthorized } from "@/lib/teacher-api";

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
  const ctx = await resolveTeacherContext(req);
  if (!ctx) return unauthorized();

  const { supabase, schoolId, teacherId, userId } = ctx;

  const todayDay = DAY_MAP[new Date().getDay()] ?? "sunday";

  const [scheduleRes, examsRes, assignmentsRes, announcementsRes, profileRes] =
    await Promise.all([
      supabase
        .from("class_schedules")
        .select(
          "id, day_of_week, start_time, end_time, subject_name, class_name, room",
        )
        .eq("school_id", schoolId)
        .eq("teacher_id", teacherId),

      supabase
        .from("exams")
        .select("id, title, starts_at, subject, class_name")
        .eq("school_id", schoolId)
        .eq("created_by", userId)
        .gte("starts_at", new Date().toISOString().slice(0, 10))
        .order("starts_at", { ascending: true })
        .limit(5),

      supabase
        .from("assignments")
        .select("id, title, due_at, class_name, subject, created_at")
        .eq("school_id", schoolId)
        .eq("teacher_id", teacherId)
        .order("created_at", { ascending: false })
        .limit(5),

      supabase
        .from("announcements")
        .select("id, title, body, created_at")
        .eq("school_id", schoolId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(3),

      supabase
        .from("user_profiles")
        .select("full_name")
        .eq("id", userId)
        .single(),
    ]);

  if (scheduleRes.error) {
    return NextResponse.json(
      { ok: false, error: "fetch_failed" },
      { status: 500 },
    );
  }

  const allSlots = (scheduleRes.data ?? []) as Array<Record<string, unknown>>;
  const todaySchedule = allSlots
    .filter((s) => s.day_of_week === todayDay)
    .map((s) => ({
      id: s.id as string,
      start_time: (s.start_time as string) ?? "",
      end_time: (s.end_time as string) ?? "",
      subject_name: (s.subject_name as string) ?? "—",
      class_name: (s.class_name as string) ?? "",
      room: (s.room as string) ?? null,
    }));

  const uniqueClasses = new Set(
    allSlots.map((s) => s.class_name as string).filter(Boolean),
  );

  const exams = (examsRes.data ?? []) as Array<Record<string, unknown>>;
  const assignments = (assignmentsRes.data ?? []) as Array<
    Record<string, unknown>
  >;
  const announcements = (announcementsRes.data ?? []) as Array<
    Record<string, unknown>
  >;

  const teacherName =
    (profileRes.data as Record<string, unknown> | null)?.full_name as string | null;

  const classArr = Array.from(uniqueClasses);
  const countResults = await Promise.all(
    classArr.map((cn) =>
      supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .eq("class_name", cn),
    ),
  );
  const studentsCount = countResults.reduce(
    (sum, r) => sum + (r.count ?? 0),
    0,
  );

  return NextResponse.json({
    ok: true,
    data: {
      teacher_name: teacherName ?? null,
      classes_count: uniqueClasses.size,
      students_count: studentsCount,
      upcoming_exams_count: exams.length,
      today_schedule: todaySchedule,
      upcoming_exams: exams.map((e) => ({
        id: e.id as string,
        subject_name: (e.subject as string) ?? "",
        exam_date: (e.starts_at as string) ?? "",
        class_name: (e.class_name as string) ?? null,
      })),
      recent_assignments: assignments.map((a) => ({
        id: a.id as string,
        title: (a.title as string) ?? "",
        due_at: (a.due_at as string) ?? null,
        class_name: (a.class_name as string) ?? "",
        subject: (a.subject as string) ?? null,
      })),
      announcements: announcements.map((a) => ({
        id: a.id as string,
        title: (a.title as string) ?? "",
        body: (a.body as string) ?? "",
        created_at: (a.created_at as string) ?? null,
      })),
    },
  });
}
