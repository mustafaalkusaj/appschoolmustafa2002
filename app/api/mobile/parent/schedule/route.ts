import { NextRequest, NextResponse } from "next/server";
import {
  createRouteSupabaseClient,
  createServiceSupabaseClient,
  getRouteAuthenticatedUser,
} from "@/lib/supabase-server";

const DAY_NAMES: Record<number, string> = {
  0: "الأحد",
  1: "الاثنين",
  2: "الثلاثاء",
  3: "الأربعاء",
  4: "الخميس",
  5: "الجمعة",
  6: "السبت",
};

export interface ParentScheduleStudent {
  id: string;
  full_name: string | null;
  class_name: string | null;
  section: string | null;
}

export interface ParentScheduleItem {
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
    const routeSupabase = await createRouteSupabaseClient();
    const authResult = await getRouteAuthenticatedUser(
      routeSupabase,
      req.headers.get("authorization"),
    );

    if (authResult.error || !authResult.data.user?.id) {
      return NextResponse.json({ ok: false, error: "يجب تسجيل الدخول أولاً." }, { status: 401 });
    }

    const serviceSupabase = createServiceSupabaseClient();

    const { data: links, error: linksError } = await serviceSupabase
      .from("parent_student_links")
      .select("student_id, school_id")
      .eq("parent_user_id", authResult.data.user.id);

    if (linksError) {
      return NextResponse.json({ ok: false, error: "خطأ في جلب بيانات الطلاب." }, { status: 500 });
    }

    if (!links || links.length === 0) {
      return NextResponse.json({ ok: true, students: [], items: [] });
    }

    const schoolId = (links[0] as { school_id: string }).school_id;
    const studentIds = (links as Array<{ student_id: string }>).map((l) => l.student_id);

    const { data: studentsData, error: studentsError } = await serviceSupabase
      .from("students")
      .select("id, full_name, class_name, section")
      .in("id", studentIds)
      .eq("school_id", schoolId);

    if (studentsError) {
      return NextResponse.json({ ok: false, error: "خطأ في جلب بيانات الطلاب." }, { status: 500 });
    }

    const students = (studentsData ?? []) as Array<{
      id: string;
      full_name: string | null;
      class_name: string | null;
      section: string | null;
    }>;

    const classNames = Array.from(new Set(students.map((s) => s.class_name).filter(Boolean))) as string[];

    if (classNames.length === 0) {
      return NextResponse.json({ ok: true, students, items: [] });
    }

    const { data, error } = await serviceSupabase
      .from("class_schedules")
      .select(
        "id, day_of_week, start_time, end_time, subject_name, class_name, room, teachers(full_name)",
      )
      .eq("school_id", schoolId)
      .in("class_name", classNames)
      .order("day_of_week")
      .order("start_time");

    if (error) throw error;

    const items: ParentScheduleItem[] = (data ?? []).map((row) => {
      const teacher = Array.isArray(row.teachers) ? row.teachers[0] : row.teachers;
      return {
        id: row.id as string,
        day: DAY_NAMES[row.day_of_week as number] ?? String(row.day_of_week),
        start_time: row.start_time as string,
        end_time: row.end_time as string,
        subject_name: row.subject_name as string,
        class_name: (row.class_name as string | null) ?? null,
        teacher_name: (teacher as { full_name: string | null } | null)?.full_name ?? null,
        room: (row.room as string | null) ?? null,
      };
    });

    return NextResponse.json({ ok: true, students, items });
  } catch {
    return NextResponse.json({ ok: false, error: "خطأ داخلي في الخادم." }, { status: 500 });
  }
}
