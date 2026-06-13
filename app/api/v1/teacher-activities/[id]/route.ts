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

  const { targetSchoolId } = context.value;
  const service = createServiceSupabaseClient();

  const { data, error } = await service
    .from("teacher_activities")
    .select(`*, teachers(id, full_name, subject, photo), activity_attachments(*)`)
    .eq("id", id)
    .eq("school_id", targetSchoolId)
    .single();

  if (error || !data) return jsonError("النشاط غير موجود", 404);
  return NextResponse.json({ ok: true, activity: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await resolveSchoolScopedActorContext(
    null,
    { allowedRoles: ["admin", "super_admin"], roleDeniedMessage: "غير مصرح" },
    req.headers.get("authorization"),
  );
  if (!context.ok)
    return jsonError("message" in context ? context.message : "غير مصرح", "status" in context ? context.status : 403);

  const { targetSchoolId, actorUserId } = context.value;
  const body = await req.json().catch(() => ({}));
  const service = createServiceSupabaseClient();

  const { error } = await service
    .from("teacher_activities")
    .update({
      is_deleted: true,
      deleted_by: actorUserId,
      deleted_reason: body.reason ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("school_id", targetSchoolId);

  if (error) return jsonError("تعذر حذف النشاط", 500);
  return NextResponse.json({ ok: true });
}
