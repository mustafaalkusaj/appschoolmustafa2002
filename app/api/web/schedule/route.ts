import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError } from "@/lib/route-utils";

/**
 * GET /api/web/schedule
 *
 * Supports multiple query modes:
 *  - ?schoolId=...&teacherName=...   → teacher schedule
 *  - ?schoolId=...&mode=overview&day=... → overview for a day
 *  - ?schoolId=...&className=...&section=... → class schedule
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const schoolId = searchParams.get("schoolId");
  const teacherName = searchParams.get("teacherName")?.trim() || "";
  const mode = searchParams.get("mode") || "";
  const day = searchParams.get("day")?.trim() || "";
  const className = searchParams.get("className")?.trim() || "";
  const section = searchParams.get("section")?.trim() || "";

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "ليس لديك صلاحية عرض الجدول.",
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
    namespace: "schedule-read",
    windowMs: 60_000,
    maxHits: 120,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  // Teacher mode
  if (teacherName) {
    const { data, error } = await actorSupabase
      .from("weekly_schedule")
      .select("day, period, session_type, teacher_id, grade, section")
      .eq("school_id", targetSchoolId);

    if (error) return jsonError(error.message || "تعذر تحميل الجدول.", 500);

    // Map rows into the ScheduleEntry shape expected by the frontend
    const schedule = (data ?? []).map((row: Record<string, unknown>) => ({
      day_of_week: row.day as string,
      time_slot_id: null,
      period_number: Number(row.period),
      subject: "",
      teacher_name: teacherName,
      class_name: (row.grade as string) ?? "",
      section: (row.section as string) ?? null,
      is_locked: false,
    }));

    return NextResponse.json({ ok: true, schedule });
  }

  // Overview mode
  if (mode === "overview" && day) {
    const { data, error } = await actorSupabase
      .from("weekly_schedule")
      .select("day, period, session_type, teacher_id, grade, section")
      .eq("school_id", targetSchoolId)
      .eq("day", day);

    if (error) return jsonError(error.message || "تعذر تحميل الجدول.", 500);

    const schedule = (data ?? []).map((row: Record<string, unknown>) => ({
      day_of_week: row.day as string,
      time_slot_id: null,
      period_number: Number(row.period),
      subject: "",
      teacher_name: null,
      class_name: (row.grade as string) ?? "",
      section: (row.section as string) ?? null,
      is_locked: false,
    }));

    return NextResponse.json({ ok: true, schedule });
  }

  // Class mode fallback
  if (className) {
    let query = actorSupabase
      .from("weekly_schedule")
      .select("day, period, session_type, teacher_id, grade, section")
      .eq("school_id", targetSchoolId)
      .eq("grade", className);
    if (section) query = query.eq("section", section);

    const { data, error } = await query;
    if (error) return jsonError(error.message || "تعذر تحميل الجدول.", 500);

    return NextResponse.json({ ok: true, schedule: data ?? [] });
  }

  return NextResponse.json({ ok: true, schedule: [] });
}

export async function PUT(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id.trim() : "";

  if (!schoolId) {
    return jsonError("المدرسة مطلوبة.", 400);
  }

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "إدارة الجداول متاحة للإدارة فقط.",
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
    namespace: "schedule-write",
    windowMs: 60_000,
    maxHits: 30,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  // Delegate to the existing salaries/schedule PUT logic or return stub
  return NextResponse.json({ ok: true });
}
