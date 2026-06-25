import { NextRequest, NextResponse } from "next/server";
import { resolveMobileRouteContext } from "@/lib/mobile-api-server";

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

    console.error("[schedule-debug:entry]", JSON.stringify({ authUserId, schoolId, hasAccountStudent: !!account.student, className, section }));

    if (!className) {
      return NextResponse.json({ ok: true, items: [], serverNow: clockNow() });
    }

    const dayOfWeek = new Date().getDay(); // 0=Sun … 6=Sat

    let query = serviceSupabase
      .from("class_schedules")
      .select("id, subject_name, teacher_name, start_time, end_time, room, section")
      .eq("school_id", schoolId)
      .eq("class_name", className)
      .eq("day_of_week", dayOfWeek)
      .order("start_time", { ascending: true });

    // Match the student's section, or section-less (whole-class) rows.
    if (section) {
      query = query.or(`section.eq.${section},section.is.null`);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[schedule-debug:queryError]", JSON.stringify({ message: error.message, details: error.details }));
      return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
    }

    // TEMP DEBUG — remove after verification.
    console.error(
      "[schedule-debug]",
      JSON.stringify({ authUserId, schoolId, className, section, dayOfWeek, count: data?.length ?? 0 }),
    );

    return NextResponse.json({ ok: true, items: data ?? [], serverNow: clockNow() });
  } catch (e) {
    console.error("[schedule-debug:catch]", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

/** Current wall-clock as HH:MM:SS to compare against schedule times. */
function clockNow(): string {
  return new Date().toTimeString().slice(0, 8);
}
