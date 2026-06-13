import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { jsonError } from "@/lib/route-utils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await resolveSchoolScopedActorContext(
    null,
    { allowedRoles: ["admin", "super_admin"], roleDeniedMessage: "غير مصرح" },
    req.headers.get("authorization"),
  );
  if (!context.ok)
    return jsonError("message" in context ? context.message : "غير مصرح", "status" in context ? context.status : 403);

  const service = createServiceSupabaseClient();

  const { data: activity } = await service
    .from("teacher_activities")
    .select("id, target_count, viewed_count, homework_submitted_count, activity_type")
    .eq("id", id)
    .single();

  const { data: views } = await service
    .from("activity_views")
    .select(
      `
      id, viewed_at, view_count, homework_status, submitted_at, grade,
      student_id,
      students(id, full_name, class_name, section)
    `,
    )
    .eq("activity_id", id)
    .order("viewed_at");

  return NextResponse.json({
    ok: true,
    activity,
    views: views ?? [],
    summary: {
      total_targeted: activity?.target_count ?? 0,
      viewed: views?.length ?? 0,
      submitted: views?.filter((v) => v.homework_status !== "not_submitted").length ?? 0,
      not_viewed: (activity?.target_count ?? 0) - (views?.length ?? 0),
    },
  });
}
