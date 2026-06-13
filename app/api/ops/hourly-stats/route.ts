import { NextRequest, NextResponse } from "next/server";

import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { isOpsTokenAuthorized } from "@/lib/ops/security";

// ─── Handler ──────────────────────────────────────────────────────────────────

async function handle(request: NextRequest) {
  const tokenAuthorized = isOpsTokenAuthorized(request, [
    process.env.CRON_SECRET,
    process.env.OPS_ALERT_TOKEN,
  ]);

  if (!tokenAuthorized) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const supabase = createServiceSupabaseClient();

    const now = new Date();
    // Round down to current hour
    const hourStart = new Date(now);
    hourStart.setMinutes(0, 0, 0);
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
    const hourIso = hourStart.toISOString();

    const [gradesResult, attendanceResult, errorsResult] = await Promise.all([
      supabase
        .from("grades")
        .select("id", { head: true, count: "exact" })
        .gte("created_at", hourIso)
        .lt("created_at", hourEnd.toISOString()),
      supabase
        .from("attendance_records")
        .select("id", { head: true, count: "exact" })
        .gte("created_at", hourIso)
        .lt("created_at", hourEnd.toISOString()),
      supabase
        .from("error_logs")
        .select("id", { head: true, count: "exact" })
        .gte("created_at", hourIso)
        .lt("created_at", hourEnd.toISOString()),
    ]);

    const gradesEntered = gradesResult.count ?? 0;
    const attendanceRecorded = attendanceResult.count ?? 0;
    const errorsCount = errorsResult.count ?? 0;

    // Upsert hourly stats (unique on hour)
    const { error: upsertError } = await supabase
      .from("hourly_stats")
      .upsert(
        {
          hour: hourIso,
          grades_entered: gradesEntered,
          attendance_recorded: attendanceRecorded,
          errors_count: errorsCount,
          // active_users_web/mobile and api_requests require request tracking not yet implemented
          active_users_web: 0,
          active_users_mobile: 0,
          api_requests: 0,
          avg_response_ms: null,
        },
        { onConflict: "hour" },
      );

    if (upsertError) {
      console.error("[hourly-stats] failed to save:", upsertError.message);
    }

    return NextResponse.json(
      {
        ok: true,
        hour: hourIso,
        grades_entered: gradesEntered,
        attendance_recorded: attendanceRecorded,
        errors_count: errorsCount,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "hourly stats failed",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
