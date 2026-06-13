import { NextRequest, NextResponse } from "next/server";

import { parseMobileListParams, resolveMobileRouteContext } from "@/lib/mobile-api-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req, "student");
    if (context.ok === false) {
      return context.response;
    }

    const params = parseMobileListParams(req, { limit: 20, maxLimit: 100 });
    const student = context.value.account.student;
    const supabase = context.value.serviceSupabase;

    let query = supabase
      .from("exams")
      .select(
        "id, school_id, title, type, subject, class_name, total_marks, starts_at, ends_at, created_at",
      )
      .eq("school_id", context.value.schoolId)
      .order("starts_at", { ascending: true })
      .range(params.offset, params.offset + params.limit - 1);

    // Filter by student's class if available
    if (student?.class_name) {
      query = query.eq("class_name", student.class_name);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({
        ok: false,
        error: { message: error.message },
      }, { status: 500 });
    }

    // Enrich with attempt info for this student
    const exams = (data ?? []) as Array<Record<string, unknown>>;
    const examIds = exams.map((e) => e.id as string);

    let attemptMap = new Map<string, { count: number; bestScore: number | null; lastStatus: string | null }>();
    if (examIds.length > 0 && student?.id) {
      const { data: attempts } = await supabase
        .from("exam_attempts")
        .select("exam_id, score, status")
        .in("exam_id", examIds)
        .eq("student_id", student.id);

      for (const a of (attempts ?? []) as Array<{ exam_id: string; score: number | null; status: string | null }>) {
        const existing = attemptMap.get(a.exam_id);
        if (!existing) {
          attemptMap.set(a.exam_id, { count: 1, bestScore: a.score, lastStatus: a.status });
        } else {
          existing.count++;
          if (typeof a.score === "number" && (existing.bestScore === null || a.score > existing.bestScore)) {
            existing.bestScore = a.score;
          }
          existing.lastStatus = a.status;
        }
      }
    }

    const enriched = exams.map((exam) => {
      const info = attemptMap.get(exam.id as string);
      return {
        ...exam,
        attempt_count: info?.count ?? 0,
        best_score: info?.bestScore ?? null,
        last_status: info?.lastStatus ?? null,
      };
    });

    return NextResponse.json({
      ok: true,
      items: enriched,
      page: params.page,
      limit: params.limit,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
