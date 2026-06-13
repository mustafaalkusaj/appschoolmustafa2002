import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { jsonError } from "@/lib/route-utils";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  const action = body.action as "approve" | "reject" | "flag";
  if (!["approve", "reject", "flag"].includes(action)) return jsonError("إجراء غير صحيح", 400);

  const service = createServiceSupabaseClient();
  const update: Record<string, unknown> = {
    reviewed_by: actorUserId,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (action === "approve") {
    update.review_status = "approved";
    update.is_published = true;
  } else if (action === "reject") {
    update.review_status = "rejected";
    update.is_published = false;
    update.rejection_reason = body.reason ?? null;
  } else {
    update.review_status = "flagged";
    update.flag_reason = body.reason ?? null;
    update.flagged_by = actorUserId;
  }

  const { error } = await service
    .from("teacher_activities")
    .update(update)
    .eq("id", id)
    .eq("school_id", targetSchoolId);

  if (error) return jsonError("تعذر تحديث المراجعة", 500);
  return NextResponse.json({ ok: true });
}
