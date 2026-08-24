import { NextRequest, NextResponse } from "next/server";
import { resolveStudentContext, unauthorized } from "@/lib/student-api";

export async function GET(req: NextRequest) {
  const ctx = await resolveStudentContext(req);
  if (!ctx) return unauthorized();

  const { supabase, studentId, schoolId } = ctx;

  const { data, error } = await supabase
    .from("behavior_logs")
    .select("id, behavior_type, points, note, created_at")
    .eq("student_id", studentId)
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json(
      { ok: false, error: "fetch_failed" },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;

  const totalPoints = rows.reduce(
    (sum, r) => sum + (Number(r.points) || 0),
    0,
  );

  return NextResponse.json({
    ok: true,
    data: {
      total_points: totalPoints,
      records: rows.map((r) => {
        const pts = Number(r.points) || 0;
        return {
          id: r.id as string,
          date: ((r.created_at as string) ?? "").slice(0, 10),
          type: pts >= 0 ? "positive" : "negative",
          points: Math.abs(pts),
          reason: (r.note as string) ?? null,
          teacher_name: null,
        };
      }),
    },
  });
}
