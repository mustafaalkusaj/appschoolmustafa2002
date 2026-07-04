import { NextRequest, NextResponse } from "next/server";

import {
  AVAILABLE_GATE,
  featureGateFromError,
  resolveMobileRouteContextAny,
} from "@/lib/mobile-api-admin";

const LEADERBOARD_LIMIT = 50;

interface LeaderboardItem {
  rank: number;
  student_id: string;
  full_name: string;
  class_name: string;
  section: string;
  total_points: number;
}

/**
 * GET /api/mobile/shared/leaderboard
 *
 * Ranked list of students by accumulated gamification points, scoped to the
 * caller's school. Points are sourced from `behavior_logs.points` (the live
 * behavior/points ledger). Shaped to the mobile LeaderboardItem contract.
 */
export async function GET(req: NextRequest) {
  const context = await resolveMobileRouteContextAny(req);
  if (!context.ok) return context.response;

  const { serviceSupabase, schoolId } = context.value;

  // Pull all point-bearing behavior rows for the school and aggregate per
  // student in-memory (the table is small and points can be negative).
  const { data, error } = await serviceSupabase
    .from("behavior_logs")
    .select("student_id, points")
    .eq("school_id", schoolId);

  if (error) {
    return NextResponse.json({
      ok: true,
      gate: featureGateFromError(error, "behavior_logs"),
      items: [],
    });
  }

  const pointsByStudent = new Map<string, number>();
  for (const row of (data ?? []) as Array<{ student_id: unknown; points: unknown }>) {
    const studentId = typeof row.student_id === "string" ? row.student_id : null;
    if (!studentId) continue;
    const points = typeof row.points === "number" && Number.isFinite(row.points) ? row.points : 0;
    pointsByStudent.set(studentId, (pointsByStudent.get(studentId) ?? 0) + points);
  }

  const ranked = Array.from(pointsByStudent.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, LEADERBOARD_LIMIT);

  if (ranked.length === 0) {
    return NextResponse.json({ ok: true, gate: AVAILABLE_GATE, items: [] });
  }

  const studentIds = ranked.map(([id]) => id);

  const { data: studentsData, error: studentsError } = await serviceSupabase
    .from("students")
    .select("id, full_name, class_name, section")
    .eq("school_id", schoolId)
    .in("id", studentIds);

  if (studentsError) {
    return NextResponse.json({
      ok: true,
      gate: featureGateFromError(studentsError, "students"),
      items: [],
    });
  }

  const studentInfo = new Map<
    string,
    { full_name: string; class_name: string; section: string }
  >();
  for (const row of (studentsData ?? []) as Array<Record<string, unknown>>) {
    const id = typeof row.id === "string" ? row.id : null;
    if (!id) continue;
    studentInfo.set(id, {
      full_name: typeof row.full_name === "string" ? row.full_name : "",
      class_name: typeof row.class_name === "string" ? row.class_name : "",
      section: typeof row.section === "string" ? row.section : "",
    });
  }

  // Only surface students that still exist / belong to this school, keeping the
  // aggregated ordering and assigning contiguous ranks.
  const items: LeaderboardItem[] = [];
  let rank = 0;
  for (const [studentId, totalPoints] of ranked) {
    const info = studentInfo.get(studentId);
    if (!info) continue;
    rank += 1;
    items.push({
      rank,
      student_id: studentId,
      full_name: info.full_name,
      class_name: info.class_name,
      section: info.section,
      total_points: totalPoints,
    });
  }

  return NextResponse.json({ ok: true, gate: AVAILABLE_GATE, items });
}
