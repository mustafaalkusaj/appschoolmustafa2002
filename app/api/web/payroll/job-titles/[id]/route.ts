import { NextRequest, NextResponse } from "next/server";

import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError, logRouteError } from "@/lib/route-utils";
import { routeUserHasPermission } from "@/lib/route-permissions";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const schoolId = req.nextUrl.searchParams.get("schoolId");

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "المسميات الوظيفية متاحة للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const requestedBranchId = req.nextUrl.searchParams.get("branchId") ?? req.nextUrl.searchParams.get("branch_id");
  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const rateLimited = await enforceRateLimit(req, {
    namespace: "payroll-job-titles",
    windowMs: 60_000,
    maxHits: 120,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const canManage = await routeUserHasPermission(actorSupabase, actorUserId, "manage_salaries");
  if (!canManage) {
    return jsonError("ليس لديك صلاحية الوصول إلى المسميات الوظيفية.", 403);
  }

  const { data, error } = await applyBranchScopeToQuery(
    actorSupabase
      .from("job_titles")
      .select(
        "id, school_id, branch_id, title_ar, title_en, category, base_salary, transport_allowance, housing_allowance, other_allowances, lecture_price, overtime_lecture_price, max_lectures_daily, max_lectures_weekly, grade_level, sort_order, is_active, description",
      )
      .eq("id", id)
      .eq("school_id", targetSchoolId),
    branchScope.value,
  ).maybeSingle();

  if (error) {
    return jsonError(error.message || "تعذر تحميل المسمى الوظيفي.", 500);
  }

  if (!data) {
    return jsonError("المسمى الوظيفي غير موجود.", 404);
  }

  return NextResponse.json({ ok: true, jobTitle: data });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) return jsonError("البيانات المرسلة غير صالحة.", 400);

  const schoolId = body.school_id as string | undefined;

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "تعديل المسميات الوظيفية متاح للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const requestedBranchId = req.nextUrl.searchParams.get("branchId") ?? req.nextUrl.searchParams.get("branch_id");
  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const rateLimited = await enforceRateLimit(req, {
    namespace: "payroll-job-titles-write",
    windowMs: 60_000,
    maxHits: 40,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const canManage = await routeUserHasPermission(actorSupabase, actorUserId, "manage_salaries");
  if (!canManage) {
    return jsonError("ليس لديك صلاحية تعديل المسميات الوظيفية.", 403);
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.title_ar === "string") updates.title_ar = body.title_ar.trim();
  if (typeof body.title_en === "string") updates.title_en = body.title_en.trim() || null;
  if (typeof body.category === "string") updates.category = body.category;
  if (body.base_salary !== undefined) updates.base_salary = Number(body.base_salary) || 0;
  if (body.transport_allowance !== undefined) updates.transport_allowance = Number(body.transport_allowance) || 0;
  if (body.housing_allowance !== undefined) updates.housing_allowance = Number(body.housing_allowance) || 0;
  if (body.other_allowances !== undefined) updates.other_allowances = Number(body.other_allowances) || 0;
  if (body.lecture_price !== undefined) updates.lecture_price = Number(body.lecture_price) || 0;
  if (body.overtime_lecture_price !== undefined) updates.overtime_lecture_price = Number(body.overtime_lecture_price) || 0;
  if (body.max_lectures_daily !== undefined) updates.max_lectures_daily = Number(body.max_lectures_daily) || 0;
  if (body.max_lectures_weekly !== undefined) updates.max_lectures_weekly = Number(body.max_lectures_weekly) || 0;
  if (typeof body.grade_level === "string") updates.grade_level = body.grade_level.trim() || null;
  if (body.sort_order !== undefined) updates.sort_order = Number(body.sort_order) || 0;
  if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active);
  if (typeof body.description === "string") updates.description = body.description.trim() || null;

  if (Object.keys(updates).length === 0) {
    return jsonError("لا توجد بيانات للتحديث.", 400);
  }

  const { data, error } = await applyBranchScopeToQuery(
    actorSupabase
      .from("job_titles")
      .update(updates)
      .eq("id", id)
      .eq("school_id", targetSchoolId),
    branchScope.value,
  )
    .select()
    .single();

  if (error) {
    logRouteError("payroll-job-titles-patch", error, { actorUserId, schoolId: targetSchoolId, id });
    return jsonError(error.message || "تعذر تحديث المسمى الوظيفي.", 500);
  }

  return NextResponse.json({ ok: true, jobTitle: data });
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const schoolId = req.nextUrl.searchParams.get("schoolId");

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "حذف المسميات الوظيفية متاح للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const requestedBranchId = req.nextUrl.searchParams.get("branchId") ?? req.nextUrl.searchParams.get("branch_id");
  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const rateLimited = await enforceRateLimit(req, {
    namespace: "payroll-job-titles-write",
    windowMs: 60_000,
    maxHits: 40,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const canManage = await routeUserHasPermission(actorSupabase, actorUserId, "manage_salaries");
  if (!canManage) {
    return jsonError("ليس لديك صلاحية حذف المسميات الوظيفية.", 403);
  }

  const { error } = await applyBranchScopeToQuery(
    actorSupabase
      .from("job_titles")
      .delete()
      .eq("id", id)
      .eq("school_id", targetSchoolId),
    branchScope.value,
  );

  if (error) {
    logRouteError("payroll-job-titles-delete", error, { actorUserId, schoolId: targetSchoolId, id });
    return jsonError(error.message || "تعذر حذف المسمى الوظيفي.", 500);
  }

  return NextResponse.json({ ok: true });
}
