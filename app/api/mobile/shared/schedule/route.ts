import { NextRequest, NextResponse } from "next/server";

import { resolveMobileRouteContext } from "@/lib/mobile-api-server";

// NOTE: No schedule/timetable table exists in schema.prisma as of 2026-06-21.
// The models checked were: schedule, timetable, class_schedule, ClassSchedule,
// time_slot, TimeSlot, lesson, Lesson, period, Period — none found.
// This endpoint returns an empty list until a schedule table is added to the schema.
// When the table is ready, replace the empty return with actual Supabase queries
// scoped by role:
//   student → query by student's class_id / class_name
//   teacher → query by teacher_id

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

export async function GET(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const { role, account } = context.value;

    // Validate that the caller is a student or teacher
    if (role !== "student" && role !== "teacher") {
      return NextResponse.json(
        { ok: false, error: "هذا المسار متاح للطلاب والمعلمين فقط." },
        { status: 403 },
      );
    }

    // -----------------------------------------------------------------
    // Student path: would filter schedule by student's class
    // -----------------------------------------------------------------
    if (role === "student") {
      const student = account.student;
      if (!student) {
        return NextResponse.json({ ok: false, error: "لم يتم ربط حساب الطالب." }, { status: 403 });
      }

      // TODO: replace with real query once schedule table is migrated, e.g.:
      // const { data, error } = await serviceSupabase
      //   .from("class_schedules")
      //   .select("id, day, start_time, end_time, subject_name, class_name, teacher_name, room")
      //   .eq("school_id", schoolId)
      //   .eq("class_name", student.class_name)
      //   .order("day")
      //   .order("start_time");

      const items: ScheduleItem[] = [];
      return NextResponse.json({ ok: true, items });
    }

    // -----------------------------------------------------------------
    // Teacher path: would filter schedule by teacher_id
    // -----------------------------------------------------------------
    if (role === "teacher") {
      const teacher = account.teacher;
      if (!teacher) {
        return NextResponse.json({ ok: false, error: "لم يتم ربط حساب المعلم." }, { status: 403 });
      }

      // TODO: replace with real query once schedule table is migrated, e.g.:
      // const { data, error } = await serviceSupabase
      //   .from("class_schedules")
      //   .select("id, day, start_time, end_time, subject_name, class_name, teacher_name, room")
      //   .eq("school_id", schoolId)
      //   .eq("teacher_id", teacher.id)
      //   .order("day")
      //   .order("start_time");

      const items: ScheduleItem[] = [];
      return NextResponse.json({ ok: true, items });
    }

    return NextResponse.json({ ok: true, items: [] });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
