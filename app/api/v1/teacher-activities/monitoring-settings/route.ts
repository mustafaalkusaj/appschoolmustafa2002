import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { jsonError } from "@/lib/route-utils";

const DEFAULT_SETTINGS = {
  review_mode: "post_review",
  require_approval_for_links: true,
  require_approval_for_videos: false,
  require_approval_for_files: false,
  max_image_size_mb: 10,
  max_video_size_mb: 100,
  max_file_size_mb: 20,
  max_attachments_per_activity: 10,
  max_daily_notifications: 10,
  max_daily_homework: 5,
  alert_inactive_days: 7,
  alert_low_view_percentage: 50,
  weekly_summary_enabled: true,
  weekly_summary_day: "thursday",
  total_storage_limit_gb: 50,
  teacher_storage_limit_mb: 500,
};

export async function GET(req: NextRequest) {
  const context = await resolveSchoolScopedActorContext(
    null,
    { allowedRoles: ["admin", "super_admin"], roleDeniedMessage: "غير مصرح" },
    req.headers.get("authorization"),
  );
  if (!context.ok)
    return jsonError("message" in context ? context.message : "غير مصرح", "status" in context ? context.status : 403);

  const { targetSchoolId } = context.value;
  const service = createServiceSupabaseClient();

  const { data } = await service
    .from("activity_monitoring_settings")
    .select("*")
    .eq("school_id", targetSchoolId)
    .maybeSingle();

  return NextResponse.json({ ok: true, settings: data ?? DEFAULT_SETTINGS });
}

export async function PUT(req: NextRequest) {
  const context = await resolveSchoolScopedActorContext(
    null,
    { allowedRoles: ["admin", "super_admin"], roleDeniedMessage: "غير مصرح" },
    req.headers.get("authorization"),
  );
  if (!context.ok)
    return jsonError("message" in context ? context.message : "غير مصرح", "status" in context ? context.status : 403);

  const { targetSchoolId } = context.value;

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("بيانات غير صحيحة", 400);

  const service = createServiceSupabaseClient();

  const { data: branch } = await service
    .from("branches")
    .select("id")
    .eq("school_id", targetSchoolId)
    .limit(1)
    .maybeSingle();

  const payload = {
    school_id: targetSchoolId,
    branch_id: branch?.id ?? null,
    review_mode: body.review_mode ?? "post_review",
    require_approval_for_links: body.require_approval_for_links ?? true,
    require_approval_for_videos: body.require_approval_for_videos ?? false,
    require_approval_for_files: body.require_approval_for_files ?? false,
    max_image_size_mb: body.max_image_size_mb ?? 10,
    max_video_size_mb: body.max_video_size_mb ?? 100,
    max_file_size_mb: body.max_file_size_mb ?? 20,
    max_attachments_per_activity: body.max_attachments_per_activity ?? 10,
    max_daily_notifications: body.max_daily_notifications ?? 10,
    max_daily_homework: body.max_daily_homework ?? 5,
    alert_inactive_days: body.alert_inactive_days ?? 7,
    alert_low_view_percentage: body.alert_low_view_percentage ?? 50,
    weekly_summary_enabled: body.weekly_summary_enabled ?? true,
    weekly_summary_day: body.weekly_summary_day ?? "thursday",
    total_storage_limit_gb: body.total_storage_limit_gb ?? 50,
    teacher_storage_limit_mb: body.teacher_storage_limit_mb ?? 500,
    updated_at: new Date().toISOString(),
  };

  const { error } = await service
    .from("activity_monitoring_settings")
    .upsert(payload, { onConflict: "school_id,branch_id" });

  if (error) return jsonError("تعذر حفظ الإعدادات", 500);
  return NextResponse.json({ ok: true });
}
