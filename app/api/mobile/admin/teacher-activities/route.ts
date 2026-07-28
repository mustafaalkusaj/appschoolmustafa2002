import { NextRequest, NextResponse } from "next/server";

import { resolveAdminMobileRouteContext } from "@/lib/mobile-admin-server";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveAdminMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const { schoolId, serviceSupabase } = context.value;
    const url = new URL(req.url);

    const period = url.searchParams.get("period") ?? "week";
    const now = new Date();
    let fromDate: string;

    if (period === "today") {
      fromDate = now.toISOString().slice(0, 10);
    } else if (period === "month") {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      fromDate = d.toISOString().slice(0, 10);
    } else {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      fromDate = d.toISOString().slice(0, 10);
    }

    const [activitiesResult, teachersResult] = await Promise.all([
      serviceSupabase
        .from("teacher_activities")
        .select(
          "id, teacher_id, activity_type, review_status, created_at, teachers(id, full_name, subject)",
        )
        .eq("school_id", schoolId)
        .gte("created_at", `${fromDate}T00:00:00.000Z`)
        .eq("is_deleted", false),
      serviceSupabase
        .from("teachers")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId),
    ]);

    if (activitiesResult.error) throw activitiesResult.error;

    const activities = activitiesResult.data ?? [];
    const totalTeachers = teachersResult.count ?? 0;

    const byType: Record<string, number> = {};
    let pendingReview = 0;
    const teacherActivityCount = new Map<
      string,
      { name: string; count: number }
    >();

    for (const act of activities) {
      const type = (act.activity_type as string) ?? "other";
      byType[type] = (byType[type] ?? 0) + 1;

      if (act.review_status === "pending") pendingReview += 1;

      const tid = act.teacher_id as string;
      const info = act.teachers as { id?: string; full_name?: string } | null;
      if (!teacherActivityCount.has(tid)) {
        teacherActivityCount.set(tid, {
          name: info?.full_name ?? "—",
          count: 0,
        });
      }
      teacherActivityCount.get(tid)!.count += 1;
    }

    const activeTeachers = teacherActivityCount.size;

    const topTeachers = Array.from(teacherActivityCount.entries())
      .map(([teacher_id, val]) => ({
        teacher_id,
        teacher_name: val.name,
        count: val.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return NextResponse.json({
      ok: true,
      total: activities.length,
      by_type: byType,
      active_teachers: activeTeachers,
      total_teachers: totalTeachers,
      pending_review: pendingReview,
      top_teachers: topTeachers,
      period,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
