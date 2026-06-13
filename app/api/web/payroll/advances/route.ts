import { NextRequest, NextResponse } from "next/server";

import { applyBranchScopeToQuery, resolveBranchIdForWrite, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError, logRouteError } from "@/lib/route-utils";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { invalidateSchoolCacheDomains } from "@/lib/server-cache";

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "سجل السلف متاح للإدارة فقط.",
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
    namespace: "payroll-advances-read",
    windowMs: 60_000,
    maxHits: 60,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const canManage = await routeUserHasPermission(actorSupabase, actorUserId, "manage_salaries");
  if (!canManage) {
    return jsonError("ليس لديك صلاحية الوصول إلى سجل السلف.", 403);
  }

  const teacherId = req.nextUrl.searchParams.get("teacherId");
  const isDeducted = req.nextUrl.searchParams.get("isDeducted"); // "true" | "false" | null

  let query = applyBranchScopeToQuery(
    actorSupabase
      .from("salary_advances")
      .select(
        "id, amount, reason, advance_date, is_deducted, deducted_on, notes, created_at, teacher_id, teachers(id, full_name, subject)",
      )
      .eq("school_id", targetSchoolId)
      .order("advance_date", { ascending: false }),
    branchScope.value,
  );

  if (teacherId) query = query.eq("teacher_id", teacherId);
  if (isDeducted === "true") query = query.eq("is_deducted", true);
  if (isDeducted === "false") query = query.eq("is_deducted", false);

  const { data, error } = await query;

  if (error) {
    logRouteError("payroll-advances-get", error, { actorUserId, schoolId: targetSchoolId });
    return jsonError("تعذر جلب السلف.", 500);
  }

  return NextResponse.json({ ok: true, advances: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return jsonError("البيانات المرسلة غير صالحة.", 400);

  const schoolId = typeof body.school_id === "string" ? body.school_id.trim() : null;

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "إضافة السلف متاحة للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const requestedBranchId = typeof body.branch_id === "string" && body.branch_id.trim() ? body.branch_id.trim() : null;
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
    return jsonError("ليس لديك صلاحية إضافة السلف.", 403);
  }

  const { teacher_id, amount, reason, advance_date, notes } = body as Record<string, unknown>;

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof teacher_id !== "string" || !UUID_REGEX.test(teacher_id)) {
    return jsonError("معرف المعلم غير صحيح.", 400);
  }

  const parsedAmount = Number(amount);
  if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
    return jsonError("المبلغ غير صحيح.", 400);
  }

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  if (typeof advance_date !== "string" || !DATE_RE.test(advance_date)) {
    return jsonError("التاريخ غير صحيح.", 400);
  }

  // Verify teacher belongs to this school (within branch scope)
  const { data: teacher, error: teacherError } = await applyBranchScopeToQuery(
    actorSupabase
      .from("teachers")
      .select("id")
      .eq("id", teacher_id)
      .eq("school_id", targetSchoolId),
    branchScope.value,
  ).maybeSingle();

  if (teacherError || !teacher?.id) {
    return jsonError("المعلم غير موجود.", 404);
  }

  const writeBranch = resolveBranchIdForWrite(branchScope.value, requestedBranchId);
  if (!writeBranch.ok) {
    return jsonError(writeBranch.message, writeBranch.status);
  }

  const { error } = await actorSupabase.from("salary_advances").insert({
    school_id: targetSchoolId,
    branch_id: writeBranch.value ?? null,
    teacher_id,
    amount: parsedAmount,
    reason: typeof reason === "string" && reason.trim() ? reason.trim() : null,
    advance_date,
    notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
    created_by: actorUserId,
  });

  if (error) {
    logRouteError("payroll-advances-post", error, { actorUserId, schoolId: targetSchoolId });
    return jsonError("تعذر إضافة السلفة.", 500);
  }

  invalidateSchoolCacheDomains(targetSchoolId, ["reports-overview"]);
  return NextResponse.json({ ok: true }, { status: 201 });
}
