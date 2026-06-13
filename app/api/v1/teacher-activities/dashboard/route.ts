import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { jsonError } from "@/lib/route-utils";

export async function GET(req: NextRequest) {
  const context = await resolveSchoolScopedActorContext(
    null,
    { allowedRoles: ["admin", "super_admin"], roleDeniedMessage: "غير مصرح" },
    req.headers.get("authorization"),
  );
  if (!context.ok)
    return jsonError("message" in context ? context.message : "غير مصرح", "status" in context ? context.status : 403);

  const { targetSchoolId } = context.value;
  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? "week";

  const service = createServiceSupabaseClient();

  const now = new Date();
  let dateFrom: string;
  if (period === "today") {
    dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  } else if (period === "month") {
    dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  } else {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    dateFrom = d.toISOString();
  }

  const { data: typeCounts } = await service
    .from("teacher_activities")
    .select("activity_type, created_at")
    .eq("school_id", targetSchoolId)
    .eq("is_deleted", false)
    .gte("created_at", dateFrom);

  const { count: pendingCount } = await service
    .from("teacher_activities")
    .select("id", { count: "exact", head: true })
    .eq("school_id", targetSchoolId)
    .eq("review_status", "pending")
    .eq("is_deleted", false);

  const { count: reportsCount } = await service
    .from("activity_reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const { data: allTeachers } = await service
    .from("teachers")
    .select("id, full_name, subject")
    .eq("school_id", targetSchoolId)
    .eq("status", "active");

  const { data: teacherActivity } = await service
    .from("teacher_activities")
    .select("teacher_id, created_at")
    .eq("school_id", targetSchoolId)
    .eq("is_deleted", false)
    .gte("created_at", dateFrom)
    .order("created_at", { ascending: false });

  const teacherCounts: Record<string, { count: number; teacher_id: string }> = {};
  for (const a of teacherActivity ?? []) {
    if (!teacherCounts[a.teacher_id]) teacherCounts[a.teacher_id] = { count: 0, teacher_id: a.teacher_id };
    teacherCounts[a.teacher_id].count++;
  }

  const { data: lastActivities } = await service
    .from("teacher_activities")
    .select("teacher_id, created_at")
    .eq("school_id", targetSchoolId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  const lastActivityByTeacher: Record<string, string> = {};
  for (const a of lastActivities ?? []) {
    if (!lastActivityByTeacher[a.teacher_id]) lastActivityByTeacher[a.teacher_id] = a.created_at;
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const inactiveTeachers = (allTeachers ?? []).filter((t) => {
    const last = lastActivityByTeacher[t.id];
    if (!last) return true;
    return new Date(last) < sevenDaysAgo;
  });

  const counts: Record<string, number> = {};
  for (const a of typeCounts ?? []) {
    counts[a.activity_type] = (counts[a.activity_type] ?? 0) + 1;
  }
  const total = Object.values(counts).reduce((s, c) => s + c, 0);

  const topTeachers = Object.values(teacherCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((tc) => ({
      teacher_id: tc.teacher_id,
      count: tc.count,
      teacher: (allTeachers ?? []).find((t) => t.id === tc.teacher_id),
    }));

  const weeklyChart: Array<{ date: string; count: number; label: string }> = [];
  const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const count = (typeCounts ?? []).filter((a) => {
      const ad = new Date(a.created_at ?? "");
      return ad.toISOString().split("T")[0] === dateStr;
    }).length;
    weeklyChart.push({ date: dateStr, count, label: dayNames[d.getDay()] });
  }

  return NextResponse.json({
    ok: true,
    stats: {
      total,
      byType: counts,
      activeTeachers: (allTeachers ?? []).length - inactiveTeachers.length,
      totalTeachers: (allTeachers ?? []).length,
      inactiveTeachers: inactiveTeachers.map((t) => ({
        ...t,
        lastActivity: lastActivityByTeacher[t.id] ?? null,
      })),
      pendingReview: pendingCount ?? 0,
      pendingReports: reportsCount ?? 0,
    },
    topTeachers,
    weeklyChart,
  });
}
