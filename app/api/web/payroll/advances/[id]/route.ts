import { NextRequest, NextResponse } from "next/server";

import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError, logRouteError } from "@/lib/route-utils";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { invalidateSchoolCacheDomains } from "@/lib/server-cache";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;

  const schoolId = req.nextUrl.searchParams.get("schoolId");

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "تعديل السلف متاح للإدارة فقط.",
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
    namespace: "payroll-advances-write",
    windowMs: 60_000,
    maxHits: 30,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const canManage = await routeUserHasPermission(actorSupabase, actorUserId, "manage_salaries");
  if (!canManage) {
    return jsonError("ليس لديك صلاحية تعديل السلف.", 403);
  }

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("البيانات المرسلة غير صالحة.", 400);

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if ("is_deducted" in body) {
    update.is_deducted = Boolean(body.is_deducted);
    update.deducted_on = body.is_deducted
      ? (typeof body.deducted_on === "string" && body.deducted_on
        ? body.deducted_on
        : new Date().toISOString().slice(0, 10))
      : null;
  }
  if ("notes" in body) update.notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null;
  if ("reason" in body) update.reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : null;
  if ("amount" in body) {
    const parsedAmount = Number(body.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return jsonError("المبلغ غير صحيح.", 400);
    update.amount = parsedAmount;
  }
  if ("advance_date" in body) update.advance_date = body.advance_date;

  if (Object.keys(update).length === 1) {
    // only updated_at means nothing was actually changed
    return jsonError("لا توجد بيانات للتحديث.", 400);
  }

  const { error } = await applyBranchScopeToQuery(
    actorSupabase
      .from("salary_advances")
      .update(update)
      .eq("id", id)
      .eq("school_id", targetSchoolId),
    branchScope.value,
  );

  if (error) {
    logRouteError("payroll-advances-patch", error, { actorUserId, schoolId: targetSchoolId, id });
    return jsonError("تعذر تحديث السلفة.", 500);
  }

  invalidateSchoolCacheDomains(targetSchoolId, ["reports-overview"]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;

  const schoolId = req.nextUrl.searchParams.get("schoolId");

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "حذف السلف متاح للإدارة فقط.",
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
    namespace: "payroll-advances-write",
    windowMs: 60_000,
    maxHits: 30,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const canManage = await routeUserHasPermission(actorSupabase, actorUserId, "manage_salaries");
  if (!canManage) {
    return jsonError("ليس لديك صلاحية حذف السلف.", 403);
  }

  const { error } = await applyBranchScopeToQuery(
    actorSupabase
      .from("salary_advances")
      .delete()
      .eq("id", id)
      .eq("school_id", targetSchoolId),
    branchScope.value,
  );

  if (error) {
    logRouteError("payroll-advances-delete", error, { actorUserId, schoolId: targetSchoolId, id });
    return jsonError("تعذر حذف السلفة.", 500);
  }

  invalidateSchoolCacheDomains(targetSchoolId, ["reports-overview"]);
  return NextResponse.json({ ok: true });
}
