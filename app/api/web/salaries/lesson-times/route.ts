import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError } from "@/lib/route-utils";
import { routeUserHasPermission } from "@/lib/route-permissions";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id.trim() : "";
  const updates = Array.isArray(body?.updates) ? body.updates : [];

  if (!schoolId) {
    return jsonError("معرف المدرسة مطلوب.", 400);
  }
  if (updates.length === 0) {
    return jsonError("لا توجد توقيتات للتحديث.", 400);
  }

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    { allowedRoles: ["super_admin", "admin"], roleDeniedMessage: "إدارة توقيتات الدروس متاحة للإدارة فقط." },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const rateLimited = await enforceRateLimit(req, {
    namespace: "salaries-lesson-times-write",
    windowMs: 60_000,
    maxHits: 30,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const canManage = await routeUserHasPermission(actorSupabase, actorUserId, "manage_salaries");
  if (!canManage) return jsonError("ليس لديك صلاحية إدارة توقيتات الدروس.", 403);

  const sanitizedUpdates = (updates as unknown[])
    .filter((u): u is Record<string, unknown> => u !== null && typeof u === "object")
    .filter((u) => typeof u.id === "string" && UUID_REGEX.test(u.id));

  for (const update of sanitizedUpdates) {
    const startTime = typeof update.start_time === "string" && update.start_time.trim() ? update.start_time.trim() : null;
    const endTime = typeof update.end_time === "string" && update.end_time.trim() ? update.end_time.trim() : null;
    const { error } = await actorSupabase
      .from("lesson_times")
      .update({ start_time: startTime, end_time: endTime })
      .eq("id", update.id as string)
      .eq("school_id", targetSchoolId);
    if (error) {
      return jsonError(error.message || "تعذر تحديث التوقيتات.", 500);
    }
  }

  return NextResponse.json({ ok: true, updated: sanitizedUpdates.length });
}
