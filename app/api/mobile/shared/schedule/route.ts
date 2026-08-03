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

      // class_schedules.teacher_id has no FK to teachers, so the PostgREST
      // embed `teachers(full_name)` failed with PGRST200 ("Could not find a
      // relationship between 'class_schedules' and 'teachers'") and this route
      // returned 500 for every student. Resolve the names with one batched
      // lookup instead — the same approach app/api/mobile/student/schedule
      // already uses and documents.
      const { data, error } = await serviceSupabase
        .from("class_schedules")
        .select(
          "id, day_of_week, start_time, end_time, subject_name, class_name, room, teacher_id",
        )
        .eq("school_id", schoolId)
        .eq("class_name", student.class_name)
        .order("day_of_week")
        .order("start_time");

      if (error) throw error;

      const scheduleRows = data ?? [];
      const teacherIds = Array.from(
        new Set(
          scheduleRows
            .map((row) => row.teacher_id as string | null)
            .filter((id): id is string => Boolean(id)),
        ),
      );

      const teacherNames = new Map<string, string | null>();
      if (teacherIds.length > 0) {
        const { data: teacherRows } = await serviceSupabase
          .from("teachers")
          .select("id, full_name")
          .eq("school_id", schoolId)
          .in("id", teacherIds);
        for (const teacherRow of teacherRows ?? []) {
          teacherNames.set(
            teacherRow.id as string,
            (teacherRow.full_name as string | null) ?? null,
          );
        }
      }

      const items: ScheduleItem[] = scheduleRows.map((row) => {
        const teacherId = row.teacher_id as string | null;
        return {
          id: row.id as string,
          day: DAY_NAMES[row.day_of_week as number] ?? String(row.day_of_week),
          start_time: row.start_time as string,
          end_time: row.end_time as string,
          subject_name: row.subject_name as string,
          class_name: (row.class_name as string | null) ?? null,
          teacher_name: teacherId
            ? (teacherNames.get(teacherId) ?? null)
            : null,
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
