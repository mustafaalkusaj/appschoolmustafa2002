import { NextRequest, NextResponse } from "next/server";

import { timetableCreateSchema, timetableDeleteSchema, timetableListQuerySchema } from "@/lib/api-schemas";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError, jsonValidationError, logRouteError } from "@/lib/route-utils";

export async function GET(req: NextRequest) {
  const parsed = timetableListQuerySchema.safeParse({
    schoolId: req.nextUrl.searchParams.get("schoolId"),
    classFilter: req.nextUrl.searchParams.get("classFilter"),
  });

  if (!parsed.success) {
    return jsonValidationError(parsed.error, "معايير تحميل الجدول غير صالحة.");
  }

  const context = await resolveSchoolScopedActorContext(
    parsed.data.schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "لا تملك صلاحية عرض الجدول الدراسي.",
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
    namespace: "timetable-list",
    windowMs: 60_000,
    maxHits: 120,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  try {
    let query = actorSupabase
      .from("class_schedules")
      .select("id, class_name, section, day_of_week, period_number, subject, teacher_name, start_time, end_time, created_at")
      .eq("school_id", targetSchoolId)
      .order("class_name")
      .order("day_of_week")
      .order("period_number");

    if (parsed.data.classFilter) {
      query = query.eq("class_name", parsed.data.classFilter);
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    // Also fetch distinct class names from class_schedules + students table
    const { data: scheduleClasses } = await actorSupabase
      .from("class_schedules")
      .select("class_name")
      .eq("school_id", targetSchoolId);

    const { data: studentClasses } = await actorSupabase
      .from("students")
      .select("class_name")
      .eq("school_id", targetSchoolId)
      .not("class_name", "is", null);

    const allClassNames = new Set<string>();
    for (const r of scheduleClasses ?? []) {
      if (r.class_name) allClassNames.add(r.class_name);
    }
    for (const r of studentClasses ?? []) {
      if (r.class_name) allClassNames.add(r.class_name);
    }

    return NextResponse.json(
      {
        ok: true,
        rows: rows ?? [],
        classNames: Array.from(allClassNames).sort(),
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    logRouteError("timetable-list", error, { actorUserId, schoolId: targetSchoolId });
    return jsonError("تعذر تحميل الجدول الدراسي. حاول مرة أخرى بعد قليل.", 500);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = timetableCreateSchema.safeParse(body);

  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  const context = await resolveSchoolScopedActorContext(
    parsed.data.schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "إضافة حصص الجدول الدراسي متاحة للإدارة فقط.",
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
    namespace: "timetable-create",
    windowMs: 60_000,
    maxHits: 40,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  try {
    const { data: created, error } = await actorSupabase
      .from("class_schedules")
      .insert({
        school_id: targetSchoolId,
        class_name: parsed.data.class_name,
        section: parsed.data.section,
        day_of_week: parsed.data.day_of_week,
        period_number: parsed.data.period_number,
        subject: parsed.data.subject,
        teacher_name: parsed.data.teacher_name,
        start_time: parsed.data.start_time,
        end_time: parsed.data.end_time,
      })
      .select("id, class_name, section, day_of_week, period_number, subject, teacher_name, start_time, end_time, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return jsonError("توجد حصة مسجلة في هذا اليوم والحصة لهذا الصف مسبقاً.", 409);
      }
      throw error;
    }

    return NextResponse.json({ ok: true, row: created });
  } catch (error) {
    logRouteError("timetable-create", error, { actorUserId, schoolId: targetSchoolId });
    return jsonError("تعذر إضافة الحصة. حاول مرة أخرى بعد قليل.", 500);
  }
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = timetableDeleteSchema.safeParse(body);

  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  const context = await resolveSchoolScopedActorContext(
    parsed.data.schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "حذف حصص الجدول الدراسي متاح للإدارة فقط.",
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
    namespace: "timetable-delete",
    windowMs: 60_000,
    maxHits: 40,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  try {
    const { error } = await actorSupabase
      .from("class_schedules")
      .delete()
      .eq("id", parsed.data.id)
      .eq("school_id", targetSchoolId);

    if (error) throw error;

    return NextResponse.json({ ok: true, deletedId: parsed.data.id });
  } catch (error) {
    logRouteError("timetable-delete", error, { actorUserId, schoolId: targetSchoolId });
    return jsonError("تعذر حذف الحصة. حاول مرة أخرى بعد قليل.", 500);
  }
}
