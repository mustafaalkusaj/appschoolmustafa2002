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
  const sp = url.searchParams;

  const teacherId = sp.get("teacher_id");
  const activityType = sp.get("type");
  const reviewStatus = sp.get("review_status");
  const classId = sp.get("class_id");
  const dateFrom = sp.get("date_from");
  const dateTo = sp.get("date_to");
  const q = sp.get("q");
  const page = parseInt(sp.get("page") ?? "1", 10);
  const limit = Math.min(parseInt(sp.get("limit") ?? "20", 10), 50);
  const offset = (page - 1) * limit;

  const service = createServiceSupabaseClient();

  let query = service
    .from("teacher_activities")
    .select(
      `
      id, activity_type, title, body, subject,
      target_type, target_count, viewed_count, delivered_count,
      homework_due_date, homework_submitted_count, homework_graded,
      review_status, rejection_reason, flag_reason,
      is_published, is_deleted, published_at, created_at, updated_at,
      teacher_id,
      teachers!inner(id, full_name, subject),
      activity_attachments(id, file_type, file_name, file_path, file_size, thumbnail_path, external_url, url_title, duration_seconds)
    `,
      { count: "exact" },
    )
    .eq("school_id", targetSchoolId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (teacherId) query = query.eq("teacher_id", teacherId);
  if (activityType) query = query.eq("activity_type", activityType);
  if (reviewStatus) query = query.eq("review_status", reviewStatus);
  if (classId) query = query.eq("target_class_id", classId);
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", dateTo + "T23:59:59Z");
  if (q) query = query.ilike("title", `%${q}%`);

  const { data, error, count } = await query;
  if (error) return jsonError("تعذر تحميل النشاطات", 500);

  return NextResponse.json({
    ok: true,
    activities: data ?? [],
    total: count ?? 0,
    page,
    limit,
    pages: Math.ceil((count ?? 0) / limit),
  });
}
