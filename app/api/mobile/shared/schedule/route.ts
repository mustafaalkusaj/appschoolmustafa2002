import { NextRequest, NextResponse } from "next/server";

import { resolveMobileRouteContext } from "@/lib/mobile-api-server";

export interface ScheduleItem {
  id: string;
  day: string;
  start_time: string;
  end_time: string;
  subject_name: string;
  class_name: string | null;
  teacher_name: string | null;
  room: string | null;
}

const DAY_NAMES: Record<number, string> = {
  0: "الأحد",
  1: "الاثنين",
  2: "الثلاثاء",
  3: "الأربعاء",
  4: "الخميس",
  5: "الجمعة",
  6: "السبت",
};

export async function GET(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const { role, account, schoolId, serviceSupabase } = context.value;

    // Validate that the caller is a student or teacher
    if (role !== "student" && role !== "teacher") {
      return NextResponse.json(
        { ok: false, error: "هذا المسار متاح للطلاب والمعلمين فقط." },
        { status: 403 },
      );
    }

    // -----------------------------------------------------------------
    // Student path: filter schedule by student's class_name
    // -----------------------------------------------------------------
    if (role === "student") {
      const student = account.student;
      if (!student) {
        return NextResponse.json(
          { ok: false, error: "لم يتم ربط حساب الطالب." },
          { status: 403 },
        );
      }

      if (!student.class_name) {
        return NextResponse.json({ ok: true, items: [] });
      }

      const { data, error } = await serviceSupabase
        .from("class_schedules")
        .select(
          "id, day_of_week, start_time, end_time, subject_name, class_name, room, teachers(full_name)",
        )
        .eq("school_id", schoolId)
        .eq("class_name", student.class_name)
        .order("day_of_week")
        .order("start_time");

      if (error) throw error;

      const items: ScheduleItem[] = (data ?? []).map((row) => {
        const teacher = Array.isArray(row.teachers)
          ? row.teachers[0]
          : row.teachers;
        return {
          id: row.id as string,
          day: DAY_NAMES[row.day_of_week as number] ?? String(row.day_of_week),
          start_time: row.start_time as string,
          end_time: row.end_time as string,
          subject_name: row.subject_name as string,
          class_name: (row.class_name as string | null) ?? null,
          teacher_name:
            (teacher as { full_name: string | null } | null)?.full_name ?? null,
          room: (row.room as string | null) ?? null,
        };
      });

      return NextResponse.json({ ok: true, items });
    }

    // -----------------------------------------------------------------
    // Teacher path: filter schedule by teacher_id
    // -----------------------------------------------------------------
    if (role === "teacher") {
      const teacher = account.teacher;
      if (!teacher) {
        return NextResponse.json(
          { ok: false, error: "لم يتم ربط حساب المعلم." },
          { status: 403 },
        );
      }

      const { data, error } = await serviceSupabase
        .from("class_schedules")
        .select(
          "id, day_of_week, start_time, end_time, subject_name, class_name, section, room",
        )
        .eq("school_id", schoolId)
        .eq("teacher_id", teacher.id)
        .order("day_of_week")
        .order("start_time");

      if (error) throw error;

      const items: ScheduleItem[] = (data ?? []).map((row) => ({
        id: row.id as string,
        day: DAY_NAMES[row.day_of_week as number] ?? String(row.day_of_week),
        start_time: row.start_time as string,
        end_time: row.end_time as string,
        subject_name: row.subject_name as string,
        class_name: (row.class_name as string | null) ?? null,
        teacher_name: account.teacher?.full_name ?? null,
        room: (row.room as string | null) ?? null,
      }));

      return NextResponse.json({ ok: true, items });
    }

    return NextResponse.json({ ok: true, items: [] });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
