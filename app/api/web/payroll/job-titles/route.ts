import { NextRequest, NextResponse } from "next/server";

import { applyBranchScopeToQuery, resolveBranchIdForWrite, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError, logRouteError } from "@/lib/route-utils";
import { routeUserHasPermission } from "@/lib/route-permissions";

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const category = req.nextUrl.searchParams.get("category")?.trim() || "";

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

  let query = applyBranchScopeToQuery(
    actorSupabase
      .from("job_titles")
      .select(
        "id, school_id, branch_id, title_ar, title_en, category, base_salary, transport_allowance, housing_allowance, other_allowances, lecture_price, overtime_lecture_price, max_lectures_daily, max_lectures_weekly, grade_level, sort_order, is_active, description",
      )
      .eq("school_id", targetSchoolId)
      .order("sort_order", { ascending: true })
      .order("title_ar", { ascending: true }),
    branchScope.value,
  );

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    return jsonError(error.message || "تعذر تحميل المسميات الوظيفية.", 500);
  }

  return NextResponse.json({ ok: true, jobTitles: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return jsonError("البيانات المرسلة غير صالحة.", 400);

  const schoolId = body.school_id as string | undefined;

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "إضافة المسميات الوظيفية متاحة للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const requestedBranchId = body.branch_id as string | undefined;
  const branchScope = resolveBranchScope(context.value, requestedBranchId ?? null);
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
    return jsonError("ليس لديك صلاحية إضافة المسميات الوظيفية.", 403);
  }

  const titleAr = typeof body.title_ar === "string" ? body.title_ar.trim() : "";
  if (!titleAr) {
    return jsonError("اسم المسمى الوظيفي مطلوب.", 400);
  }

  const category = body.category as string | undefined;
  if (!category || !["teaching", "administrative", "support"].includes(category)) {
    return jsonError("فئة المسمى الوظيفي غير صالحة.", 400);
  }

  const writeBranch = resolveBranchIdForWrite(branchScope.value, requestedBranchId ?? null);
  if (!writeBranch.ok) {
    return jsonError(writeBranch.message, writeBranch.status);
  }

  const { data, error } = await actorSupabase
    .from("job_titles")
    .insert({
      school_id: targetSchoolId,
      branch_id: writeBranch.value ?? null,
      title_ar: titleAr,
      title_en: typeof body.title_en === "string" ? body.title_en.trim() || null : null,
      category,
      base_salary: Number(body.base_salary) || 0,
      transport_allowance: Number(body.transport_allowance) || 0,
      housing_allowance: Number(body.housing_allowance) || 0,
      other_allowances: Number(body.other_allowances) || 0,
      lecture_price: Number(body.lecture_price) || 0,
      overtime_lecture_price: Number(body.overtime_lecture_price) || 0,
      max_lectures_daily: Number(body.max_lectures_daily) || 0,
      max_lectures_weekly: Number(body.max_lectures_weekly) || 0,
      grade_level: typeof body.grade_level === "string" ? body.grade_level.trim() || null : null,
      sort_order: Number(body.sort_order) || 0,
      is_active: body.is_active !== false,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    .select()
    .single();

  if (error) {
    logRouteError("payroll-job-titles-post", error, { actorUserId, schoolId: targetSchoolId });
    return jsonError(error.message || "تعذر إضافة المسمى الوظيفي.", 500);
  }

  return NextResponse.json({ ok: true, jobTitle: data }, { status: 201 });
}
