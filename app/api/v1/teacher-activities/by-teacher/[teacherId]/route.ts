import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { jsonError } from "@/lib/route-utils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ teacherId: string }> }) {
  const { teacherId } = await params;
  const context = await resolveSchoolScopedActorContext(
    null,
    { allowedRoles: ["admin", "super_admin"], roleDeniedMessage: "غير مصرح" },
    req.headers.get("authorization"),
  );
  if (!context.ok)
    return jsonError("message" in context ? context.message : "غير مصرح", "status" in context ? context.status : 403);

  const { targetSchoolId } = context.value;
  const service = createServiceSupabaseClient();

  const { data: activities } = await service
    .from("teacher_activities")
    .select(
      "id, activity_type, title, viewed_count, target_count, created_at, review_status, is_published, activity_attachments(id, file_type)",
    )
    .eq("teacher_id", teacherId)
    .eq("school_id", targetSchoolId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: teacher } = await service
    .from("teachers")
    .select("id, full_name, subject, status, school_id, app_status, photo, messaging_paused, notifications_require_approval")
    .eq("id", teacherId)
    .eq("school_id", targetSchoolId)
    .maybeSingle();

  // Cross-tenant guard: teacherId not belonging to the actor's school must not leak.
  if (!teacher) return jsonError("المعلّم غير موجود", 404);

  const counts: Record<string, number> = {};
  for (const a of activities ?? []) {
    counts[a.activity_type] = (counts[a.activity_type] ?? 0) + 1;
  }
  const total = Object.values(counts).reduce((s, c) => s + c, 0);
  const avgViewRate = activities?.length
    ? Math.round(
        (activities.filter((a) => a.target_count > 0).reduce((s, a) => s + a.viewed_count / a.target_count, 0) /
          activities.length) *
          100,
      )
    : 0;

  return NextResponse.json({
    ok: true,
    teacher,
    stats: { total, byType: counts, avgViewRate },
    activities: activities ?? [],
  });
}
