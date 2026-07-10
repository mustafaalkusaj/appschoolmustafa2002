import { NextRequest, NextResponse } from "next/server";

import { resolveMobileRouteContext } from "@/lib/mobile-api-server";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req, "student");
    if (context.ok === false) {
      return context.response;
    }

    const { schoolId, serviceSupabase } = context.value;

    // Fetch all students in the school (cap at 500 for safety)
    const { data: students, error: studentsError } = await serviceSupabase
      .from("students")
      .select("id, full_name, class_name, section")
      .eq("school_id", schoolId)
      .limit(500);

    if (studentsError) {
      return NextResponse.json(
        { ok: false, error: "students_fetch_failed" },
        { status: 500 },
      );
    }

    // Fetch all behavior_log points for the school
    const { data: logs, error: logsError } = await serviceSupabase
      .from("behavior_logs")
      .select("student_id, points")
      .eq("school_id", schoolId);

    if (logsError) {
      return NextResponse.json(
        { ok: false, error: "logs_fetch_failed" },
        { status: 500 },
      );
    }

    // Aggregate points per student in JS
    const pointsMap = new Map<string, number>();
    for (const log of logs ?? []) {
      if (!log.student_id) continue;
      const current = pointsMap.get(log.student_id) ?? 0;
      pointsMap.set(log.student_id, current + (log.points ?? 0));
    }

    // Build ranked list — only include students with at least one log entry
    const ranked = (students ?? [])
      .filter((s) => pointsMap.has(s.id))
      .map((s) => ({
        student_id: s.id as string,
        full_name: (s.full_name as string) ?? "",
        class_name: (s.class_name as string) ?? "",
        section: (s.section as string) ?? "",
        total_points: pointsMap.get(s.id) ?? 0,
      }))
      .sort((a, b) => b.total_points - a.total_points)
      .slice(0, 50)
      .map((entry, index) => ({ rank: index + 1, ...entry }));

    return NextResponse.json({ ok: true, items: ranked });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
