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
    const { data, error } = await actorSupabase
      .from("weekly_schedule")
      .select("*")
      .eq("school_id", targetSchoolId)
      .eq("teacher_id", teacherId)
      .order("day")
      .order("period");

    if (error) {
      logRouteError("teachers-schedule", error, { teacherId, schoolId: targetSchoolId });
      return jsonError("تعذر تحميل الجدول الدراسي.", 500);
    }

    const schedule = (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id,
      day: row.day,
      period: row.period,
      subject: row.subject ?? null,
      class: row.grade ?? null,
      section: row.section ?? null,
      room: null,
    }));
    return NextResponse.json({ ok: true, schedule });
  } catch (error) {
    logRouteError("teachers-schedule", error, { teacherId, schoolId: targetSchoolId });
    return jsonError("تعذر تحميل الجدول الدراسي.", 500);
  }
}
