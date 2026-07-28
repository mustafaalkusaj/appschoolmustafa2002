import { NextRequest, NextResponse } from "next/server";
import { resolveMobileRouteContext } from "@/lib/mobile-api-server";
import { escapeFilterValue } from "@/lib/supabase-query-helpers";

/**
 * Today's class schedule for the signed-in student.
 * Returns the day's periods (sorted by start time) plus the server clock so the
 * client can highlight the current / next period. day_of_week is 0=Sunday,
 * matching JavaScript's Date.getDay().
 */
export async function GET(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req, "student");
    if (context.ok === false) {
      return context.response;
    }

    const { schoolId, serviceSupabase, account, authUserId } = context.value;

    // Prefer the managed-account student; fall back to a direct lookup for
    // legacy-linked students whose account.student is not populated.
    let className = account.student?.class_name ?? null;
    let section = account.student?.section ?? null;

    if (!className) {
      const { data: row } = await serviceSupabase
        .from("students")
        .select("class_name, section")
        .eq("auth_user_id", authUserId)
        .eq("school_id", schoolId)
        .maybeSingle();
      className = row?.class_name ?? null;
      section = row?.section ?? null;
    }

    if (!className) {
      return NextResponse.json({ ok: true, items: [], serverNow: clockNow() });
    }

    const dayOfWeek = new Date().getDay(); // 0=Sun … 6=Sat

    let query = serviceSupabase
      .from("class_schedules")
      .select(
        "id, subject_name, teacher_id, start_time, end_time, room, section",
      )
      .eq("school_id", schoolId)
      .eq("class_name", className)
      .eq("day_of_week", dayOfWeek)
      .order("start_time", { ascending: true });

    // Match the student's section, or section-less (whole-class) rows.
    if (section) {
      query = query.or(
        `section.eq."${escapeFilterValue(section)}",section.is.null`,
      );
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json(
        { ok: false, error: "internal_error" },
        { status: 500 },
      );
    }

    // class_schedules stores teacher_id with no FK to teachers, so PostgREST
    // cannot embed the name — resolve it in a single batched lookup.
    const rows = (data ?? []) as Array<{
      teacher_id: string | null;
      [key: string]: unknown;
    }>;
    const teacherIds = Array.from(
      new Set(rows.map((row) => row.teacher_id).filter(Boolean) as string[]),
    );

    const teacherNames = new Map<string, string>();
    if (teacherIds.length > 0) {
      const { data: teachers } = await serviceSupabase
        .from("teachers")
        .select("id, full_name")
        .eq("school_id", schoolId)
        .in("id", teacherIds);
      for (const teacher of (teachers ?? []) as Array<{
        id: string;
        full_name: string | null;
      }>) {
        if (teacher.full_name) teacherNames.set(teacher.id, teacher.full_name);
      }
    }

    return NextResponse.json({
      ok: true,
      items: rows.map(({ teacher_id, ...slot }) => ({
        ...slot,
        teacher_name: teacher_id ? (teacherNames.get(teacher_id) ?? null) : null,
      })),
      serverNow: clockNow(),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}

/** Current wall-clock as HH:MM:SS to compare against schedule times. */
function clockNow(): string {
  return new Date().toTimeString().slice(0, 8);
}
