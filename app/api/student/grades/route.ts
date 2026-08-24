import { NextRequest, NextResponse } from "next/server";
import { resolveStudentContext, unauthorized } from "@/lib/student-api";

export async function GET(req: NextRequest) {
  const ctx = await resolveStudentContext(req);
  if (!ctx) return unauthorized();

  const { supabase, studentId, schoolId } = ctx;

  const { data, error } = await supabase
    .from("grades")
    .select(
      "id, subject_id, score, max_score, exam_type, created_at, subjects(name)",
    )
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

  return NextResponse.json({
    ok: true,
    data: {
      grades: rows.map((g) => {
        const subj = g.subjects as { name: string } | null;
        const score = Number(g.score) || 0;
        const maxScore = Number(g.max_score) || 0;
        return {
          id: g.id as string,
          subject_name: subj?.name ?? "—",
          exam_name: (g.exam_type as string) ?? null,
          score,
          max_score: maxScore,
          percentage:
            maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
          date: (g.created_at as string) ?? null,
        };
      }),
    },
  });
}
