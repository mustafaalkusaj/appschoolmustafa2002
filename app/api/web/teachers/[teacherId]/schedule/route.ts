import { NextRequest, NextResponse } from "next/server";
import { resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { jsonError, logRouteError } from "@/lib/route-utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> },
) {
  const { teacherId } = await params;
  const schoolId = req.nextUrl.searchParams.get("schoolId");

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "إدارة الأساتذة متاحة ضمن نطاق المدرسة الحالية فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const branchScope = resolveBranchScope(context.value, null);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const [rateLimited, canViewTeachers] = await Promise.all([
    enforceRateLimit(req, {
      namespace: "teachers-schedule",
      windowMs: 60_000,
      maxHits: 120,
      identifier: actorUserId,
    }),
    routeUserHasPermission(actorSupabase, actorUserId, "view_teachers"),
  ]);

  if (rateLimited) return rateLimited;
  if (!canViewTeachers) {
    return jsonError("ليس لديك صلاحية عرض الأساتذة.", 403);
  }

  try {
    // Resolve teacher name from teachers table
    const { data: teacher, error: teacherErr } = await actorSupabase
      .from("teachers")
      .select("full_name")
      .eq("id", teacherId)
      .eq("school_id", targetSchoolId)
      .single();

    if (teacherErr || !teacher) {
      logRouteError("teachers-schedule", teacherErr ?? "teacher not found", { teacherId, schoolId: targetSchoolId });
      return jsonError("تعذر العثور على المعلم.", 404);
    }

    // Query class_schedules by teacher_name (same table used by main schedule page)
    const DAY_ORDER = ["sunday", "monday", "tuesday", "wednesday", "thursday", "saturday"];
    const { data, error } = await actorSupabase
      .from("class_schedules")
      .select("id, day_of_week, period_number, subject, teacher_name, class_name, section")
      .eq("school_id", targetSchoolId)
      .ilike("teacher_name", teacher.full_name);

    if (error) {
      logRouteError("teachers-schedule", error, { teacherId, schoolId: targetSchoolId });
      return jsonError("تعذر تحميل الجدول الدراسي.", 500);
    }

    const DAY_KEY_MAP: Record<string, string> = {
      sunday: "Sunday",
      monday: "Monday",
      tuesday: "Tuesday",
      wednesday: "Wednesday",
      thursday: "Thursday",
      saturday: "Saturday",
    };

    const schedule = (data ?? [])
      .sort((a, b) => {
        const dayDiff = DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week);
        return dayDiff !== 0 ? dayDiff : (a.period_number - b.period_number);
      })
      .map((row) => ({
        id: row.id,
        day: DAY_KEY_MAP[row.day_of_week] ?? row.day_of_week,
        period: row.period_number,
        subject: row.subject ?? null,
        class: row.class_name ?? null,
        section: row.section ?? null,
        room: null,
      }));
    return NextResponse.json({ ok: true, schedule });
  } catch (error) {
    logRouteError("teachers-schedule", error, { teacherId, schoolId: targetSchoolId });
    return jsonError("تعذر تحميل الجدول الدراسي.", 500);
  }
}
