import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError } from "@/lib/route-utils";

/**
 * GET /api/web/schedule/time-slots?schoolId=...
 *
 * Returns the configured time slots for a school.
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
    namespace: "schedule-timeslots-read",
    windowMs: 60_000,
    maxHits: 60,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const { data, error } = await actorSupabase
    .from("schedule_time_slots")
    .select("*")
    .eq("school_id", targetSchoolId)
    .order("slot_order", { ascending: true });

  if (error) return jsonError(error.message || "تعذر تحميل الفترات الزمنية.", 500);

  return NextResponse.json({ ok: true, slots: data ?? [] });
}

/**
 * PUT /api/web/schedule/time-slots
 *
 * Update time slots configuration for a school.
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
    namespace: "schedule-timeslots-write",
    windowMs: 60_000,
    maxHits: 20,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const slots = Array.isArray(body?.slots) ? body.slots : [];

  // Delete existing slots and re-insert
  const { error: deleteError } = await actorSupabase
    .from("schedule_time_slots")
    .delete()
    .eq("school_id", targetSchoolId);

  if (deleteError) return jsonError(deleteError.message || "تعذر حذف الفترات القديمة.", 500);

  if (slots.length > 0) {
    const sanitized = (slots as Record<string, unknown>[]).map((s, idx) => ({
      school_id: targetSchoolId,
      id: typeof s.id === "string" ? s.id : undefined,
      name_ar: typeof s.name_ar === "string" ? s.name_ar : `الحصة ${idx + 1}`,
      start_time: typeof s.start_time === "string" ? s.start_time : "08:00",
      end_time: typeof s.end_time === "string" ? s.end_time : "08:45",
      slot_type: s.slot_type === "break" ? "break" : "period",
      slot_order: typeof s.slot_order === "number" ? s.slot_order : idx,
      is_active: typeof s.is_active === "boolean" ? s.is_active : true,
    }));

    const { error: insertError } = await actorSupabase
      .from("schedule_time_slots")
      .insert(sanitized);

    if (insertError) return jsonError(insertError.message || "تعذر حفظ الفترات الزمنية.", 500);
  }

  return NextResponse.json({ ok: true });
}
