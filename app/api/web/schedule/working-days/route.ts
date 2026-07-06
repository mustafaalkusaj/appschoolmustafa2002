import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError } from "@/lib/route-utils";

/**
 * GET /api/web/schedule/working-days?schoolId=...
 *
 * Returns the configured working days for a school.
 */
export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "ليس لديك صلاحية عرض إعدادات الجدول.",
    },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const rateLimited = await enforceRateLimit(req, {
    namespace: "schedule-workingdays-read",
    windowMs: 60_000,
    maxHits: 60,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const { data, error } = await actorSupabase
    .from("schedule_working_days")
    .select("*")
    .eq("school_id", targetSchoolId)
    .order("day_order", { ascending: true });

  if (error) return jsonError(error.message || "تعذر تحميل أيام العمل.", 500);

  return NextResponse.json({ ok: true, days: data ?? [] });
}

/**
 * PUT /api/web/schedule/working-days
 *
 * Update working days configuration for a school.
 */
export async function PUT(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.schoolId === "string" ? body.schoolId.trim() : "";

  if (!schoolId) {
    return jsonError("المدرسة مطلوبة.", 400);
  }

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "إدارة إعدادات الجدول متاحة للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const rateLimited = await enforceRateLimit(req, {
    namespace: "schedule-workingdays-write",
    windowMs: 60_000,
    maxHits: 20,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const days = Array.isArray(body?.days) ? body.days : [];

  // Delete existing and re-insert
  const { error: deleteError } = await actorSupabase
    .from("schedule_working_days")
    .delete()
    .eq("school_id", targetSchoolId);

  if (deleteError) return jsonError(deleteError.message || "تعذر حذف أيام العمل القديمة.", 500);

  if (days.length > 0) {
    const sanitized = (days as Record<string, unknown>[]).map((d, idx) => ({
      school_id: targetSchoolId,
      day_key: typeof d.day_key === "string" ? d.day_key : `day_${idx}`,
      name_ar: typeof d.name_ar === "string" ? d.name_ar : "",
      day_order: typeof d.day_order === "number" ? d.day_order : idx,
      is_active: typeof d.is_active === "boolean" ? d.is_active : true,
    }));

    const { error: insertError } = await actorSupabase
      .from("schedule_working_days")
      .insert(sanitized);

    if (insertError) return jsonError(insertError.message || "تعذر حفظ أيام العمل.", 500);
  }

  return NextResponse.json({ ok: true });
}
