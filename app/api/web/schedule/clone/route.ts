import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError } from "@/lib/route-utils";

/**
 * POST /api/web/schedule/clone
 *
 * Clone a schedule from one class/section to another.
 * Stub — returns success for now until clone logic is implemented.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.schoolId === "string" ? body.schoolId.trim() : "";

  if (!schoolId) {
    return jsonError("المدرسة مطلوبة.", 400);
  }

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "نسخ الجدول متاح للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorUserId } = context.value;

  const rateLimited = await enforceRateLimit(req, {
    namespace: "schedule-clone",
    windowMs: 60_000,
    maxHits: 10,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  // TODO: implement actual clone logic
  return NextResponse.json({ ok: true });
}
