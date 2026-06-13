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
      namespace: "teachers-leaves",
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
      .from("teacher_leaves")
      .select("*")
      .eq("teacher_id", teacherId)
      .eq("school_id", targetSchoolId)
      .order("created_at", { ascending: false });

    if (error) {
      logRouteError("teachers-leaves-get", error, { teacherId, schoolId: targetSchoolId });
      return jsonError("تعذر تحميل سجل الإجازات.", 500);
    }

    return NextResponse.json({ ok: true, leaves: data ?? [] });
  } catch (error) {
    logRouteError("teachers-leaves-get", error, { teacherId, schoolId: targetSchoolId });
    return jsonError("تعذر تحميل سجل الإجازات.", 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> },
) {
  const { teacherId } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id : null;

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "إدارة إجازات الأساتذة متاحة للإدارة فقط.",
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

  const [rateLimited, canManageTeachers] = await Promise.all([
    enforceRateLimit(req, {
      namespace: "teachers-leaves-create",
      windowMs: 60_000,
      maxHits: 40,
      identifier: actorUserId,
    }),
    routeUserHasPermission(actorSupabase, actorUserId, "manage_teachers"),
  ]);

  if (rateLimited) return rateLimited;
  if (!canManageTeachers) {
    return jsonError("ليس لديك صلاحية إدارة الأساتذة.", 403);
  }

  // Branch isolation: verify teacher belongs to this school and branch
  const { data: teacherCheckPost } = await applyBranchScopeToQuery(
    actorSupabase.from("teachers").select("id")
      .eq("id", teacherId).eq("school_id", targetSchoolId),
    branchScope.value,
  ).maybeSingle();
  if (!teacherCheckPost) {
    return jsonError("المعلم غير موجود ضمن المدرسة الحالية.", 404);
  }

  try {
    const leaveType = typeof body?.leave_type === "string" ? body.leave_type : "annual";
    const startDate = typeof body?.start_date === "string" ? body.start_date : null;
    const endDate = typeof body?.end_date === "string" ? body.end_date : null;
    const daysCount = typeof body?.days_count === "number" ? body.days_count : 1;
    const reason = typeof body?.reason === "string" && body.reason.trim() ? body.reason.trim() : null;

    if (!startDate || !endDate) {
      return jsonError("تاريخ بداية ونهاية الإجازة مطلوبان.", 400);
    }

    const { data, error } = await actorSupabase
      .from("teacher_leaves")
      .insert({
        teacher_id: teacherId,
        school_id: targetSchoolId,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        days_count: daysCount,
        reason,
        status: "pending",
        ...(branchScope.value.branchId ? { branch_id: branchScope.value.branchId } : {}),
      })
      .select("*")
      .single();

    if (error || !data) {
      logRouteError("teachers-leaves-create", error, { teacherId, actorUserId, schoolId: targetSchoolId });
      return jsonError(error?.message || "تعذر إضافة الإجازة.", 500);
    }

    return NextResponse.json({ ok: true, leave: data }, { status: 201 });
  } catch (error) {
    logRouteError("teachers-leaves-create", error, { teacherId, actorUserId, schoolId: targetSchoolId });
    return jsonError("تعذر إضافة الإجازة.", 500);
  }
}
