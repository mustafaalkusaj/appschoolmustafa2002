import { NextRequest, NextResponse } from "next/server";

import { resolveAdminMobileRouteContext } from "@/lib/mobile-admin-server";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveAdminMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const { schoolId, serviceSupabase } = context.value;
    const url = new URL(req.url);

    const now = new Date();
    const year = Number(url.searchParams.get("year") || now.getFullYear());
    const month = Number(url.searchParams.get("month") || now.getMonth() + 1);

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10);

    const { data, error } = await serviceSupabase
      .from("teacher_attendance")
      .select("teacher_id, status, teachers(id, full_name, subject)")
      .eq("school_id", schoolId)
      .gte("attendance_date", startDate)
      .lte("attendance_date", endDate);

    if (error) throw error;

    const teacherMap = new Map<
      string,
      {
        teacher_id: string;
        name: string;
        subject: string | null;
        present: number;
        absent: number;
        late: number;
        excused: number;
        holiday: number;
        total_days: number;
      }
    >();

    for (const row of data ?? []) {
      const teacherInfo = row.teachers as {
        id?: string;
        full_name?: string;
        subject?: string;
      } | null;
      const tid = row.teacher_id as string;

      if (!teacherMap.has(tid)) {
        teacherMap.set(tid, {
          teacher_id: tid,
          name: teacherInfo?.full_name ?? "—",
          subject: teacherInfo?.subject ?? null,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          holiday: 0,
          total_days: 0,
        });
      }

      const entry = teacherMap.get(tid)!;
      entry.total_days += 1;

      switch (row.status) {
        case "present":
          entry.present += 1;
          break;
        case "absent":
          entry.absent += 1;
          break;
        case "late":
          entry.late += 1;
          break;
        case "excused":
          entry.excused += 1;
          break;
        case "holiday":
          entry.holiday += 1;
          break;
      }
    }

    const teachers = Array.from(teacherMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "ar"),
    );

    return NextResponse.json({ ok: true, teachers, year, month });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
