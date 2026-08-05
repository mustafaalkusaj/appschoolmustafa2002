import { NextRequest, NextResponse } from "next/server";

import {
  normalizeClassKey,
  parseMobileListParams,
  resolveMobileRouteContext,
} from "@/lib/mobile-api-server";
import { createServiceSupabaseClient as _createServiceSupabaseClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req, "student");
    if (context.ok === false) {
      return context.response;
    }

    const params = parseMobileListParams(req, { limit: 20, maxLimit: 100 });
    const student = context.value.account.student;
    const supabase = context.value.serviceSupabase;

    // Teacher screens store class_name as free text with no shared picker
    // against the student's own class_name, so an exact DB-level .eq() drops
    // exams on formatting differences alone (dashes, extra spaces). Fetch by
    // school_id and compare via a normalized key in JS instead; the exams
    // table is small per school so this is not a pagination concern.
    const query = supabase
      .from("exams")
      .select(
        "id, school_id, title, type, subject, class_name, total_marks, starts_at, ends_at, created_at",
      )
      .eq("school_id", context.value.schoolId)
      .order("starts_at", { ascending: true });

    const { data: allData, error } = await query;

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: { message: "internal_error" },
        },
        { status: 500 },
      );
    }

    // Filter by student's class using a normalized key, then paginate in JS.
    const studentClassKey = student?.class_name
      ? normalizeClassKey(student.class_name)
      : null;
    const matched = ((allData ?? []) as Array<Record<string, unknown>>).filter(
      (exam) => {
        if (!studentClassKey) return true;
        return normalizeClassKey(exam.class_name) === studentClassKey;
      },
    );
    const exams = matched.slice(params.offset, params.offset + params.limit);
    const examIds = exams.map((e) => e.id as string);

    const attemptMap = new Map<
      string,
      { count: number; bestScore: number | null; lastStatus: string | null }
    >();
    if (examIds.length > 0 && student?.id) {
      const { data: attempts } = await supabase
        .from("exam_attempts")
        .select("exam_id, score, status")
        .in("exam_id", examIds)
        .eq("student_id", student.id);

      for (const a of (attempts ?? []) as Array<{
        exam_id: string;
        score: number | null;
        status: string | null;
      }>) {
        const existing = attemptMap.get(a.exam_id);
        if (!existing) {
          attemptMap.set(a.exam_id, {
            count: 1,
            bestScore: a.score,
            lastStatus: a.status,
          });
        } else {
          existing.count++;
          if (
            typeof a.score === "number" &&
            (existing.bestScore === null || a.score > existing.bestScore)
          ) {
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
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
