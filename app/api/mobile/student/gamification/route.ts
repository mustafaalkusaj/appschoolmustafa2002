import { NextRequest, NextResponse } from "next/server";

import { resolveMobileRouteContext } from "@/lib/mobile-api-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req, "student");
    if (context.ok === false) {
      return context.response;
    }

    const { account, schoolId } = context.value;
    const studentId = account.student?.id;

    if (!studentId) {
      return NextResponse.json({ ok: false, error: "student_not_linked" }, { status: 403 });
    }

    const supabase = createServiceSupabaseClient();

    // Run XP and leaderboard in parallel; streak needs attendance records
    const [xpResult, leaderboardResult, attendanceResult] = await Promise.all([
      // XP: sum of positive behavior_logs.points for this student
      supabase
        .from("behavior_logs")
        .select("points")
        .eq("school_id", schoolId)
        .eq("student_id", studentId)
        .gt("points", 0),

      // Leaderboard: top 50 students by total positive points in the school
      supabase
        .from("behavior_logs")
        .select("student_id, points")
        .eq("school_id", schoolId)
        .gt("points", 0),

      // Attendance: last 60 days for streak calculation
      supabase
        .from("attendance_records")
        .select("attendance_date, status")
        .eq("student_id", studentId)
        .gte("attendance_date", getDateDaysAgo(60))
        .order("attendance_date", { ascending: false }),
    ]);

    // Compute XP
    const xpRows = (xpResult.data ?? []) as Array<{ points: number }>;
    const xp = xpRows.reduce((sum, row) => sum + (Number(row.points) || 0), 0);

    // Compute Level: floor(xp / 100) + 1, max 20
    const level = Math.min(Math.floor(xp / 100) + 1, 20);

    // Compute streak from attendance records
    const streak = computeStreak(
      (attendanceResult.data ?? []) as Array<{ attendance_date: string; status: string }>,
    );

    // Compute rank: aggregate leaderboard by student_id, find this student's position
    const allRows = (leaderboardResult.data ?? []) as Array<{ student_id: string; points: number }>;
    const totalsMap = new Map<string, number>();
    for (const row of allRows) {
      const id = row.student_id;
      if (id) {
        totalsMap.set(id, (totalsMap.get(id) ?? 0) + (Number(row.points) || 0));
      }
    }

    // Sort descending by total points, take top 50
    const sorted = Array.from(totalsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50);

    const rankIndex = sorted.findIndex(([id]) => id === studentId);
    const rank = rankIndex >= 0 ? rankIndex + 1 : null;

    return NextResponse.json({ ok: true, xp, streak, level, rank });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

/** Returns an ISO date string N days ago (YYYY-MM-DD). */
function getDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * Counts consecutive school days (Mon–Fri) going backwards from today
 * where attendance status is 'present', 'late', or 'excused'.
 * Stops when an 'absent' record is found. Days with no record are skipped
 * (treated as non-school days or unrecorded). Only strictly 'absent'
 * breaks the streak.
 */
function computeStreak(
  rows: Array<{ attendance_date: string; status: string }>,
): number {
  // Build a map: date string → status
  const byDate = new Map<string, string>();
  for (const row of rows) {
    if (row.attendance_date) {
      byDate.set(row.attendance_date, row.status);
    }
  }

  let streak = 0;
  const today = new Date();
  // Walk backwards day by day (up to 60 days)
  for (let i = 0; i < 60; i++) {
    const candidate = new Date(today);
    candidate.setDate(today.getDate() - i);
    const dow = candidate.getDay(); // 0=Sun, 6=Sat

    // Skip weekends
    if (dow === 0 || dow === 6) continue;

    const dateStr = candidate.toISOString().slice(0, 10);
    const status = byDate.get(dateStr);

    if (status === "absent") {
      // Streak broken
      break;
    }

    if (status === "present" || status === "late" || status === "excused") {
      streak++;
    }
    // No record on a weekday: skip (don't break, don't increment)
  }

  return streak;
}
