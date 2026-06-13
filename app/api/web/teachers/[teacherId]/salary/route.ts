import { NextRequest, NextResponse } from "next/server";
import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
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
      namespace: "teachers-salary",
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

  // Branch isolation: verify teacher belongs to this school and branch
  const { data: teacherCheck } = await applyBranchScopeToQuery(
    actorSupabase.from("teachers").select("id")
      .eq("id", teacherId).eq("school_id", targetSchoolId),
    branchScope.value,
  ).maybeSingle();
  if (!teacherCheck) {
    return jsonError("المعلم غير موجود ضمن المدرسة الحالية.", 404);
  }

  try {
    const { data, error } = await actorSupabase
      .from("salaries")
      .select("*")
      .eq("teacher_id", teacherId)
      .eq("school_id", targetSchoolId)
      .order("month", { ascending: false })
      .limit(24);

    if (error) {
      logRouteError("teachers-salary", error, { teacherId, schoolId: targetSchoolId });
      return jsonError("تعذر تحميل سجل الرواتب.", 500);
    }

    return NextResponse.json({ ok: true, salaries: data ?? [] });
  } catch (error) {
    logRouteError("teachers-salary", error, { teacherId, schoolId: targetSchoolId });
    return jsonError("تعذر تحميل سجل الرواتب.", 500);
  }
}
