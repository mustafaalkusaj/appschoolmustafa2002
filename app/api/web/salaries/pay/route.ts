import { NextRequest, NextResponse } from "next/server";

import { applyBranchScopeToQuery, resolveBranchIdForWrite, resolveBranchScope } from "@/lib/branch-scope";
import { salaryPaymentSchema } from "@/lib/api-schemas";
import { resolveSchoolBranchId, resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError, jsonValidationError, logRouteError } from "@/lib/route-utils";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { invalidateSchoolCacheDomains } from "@/lib/server-cache";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = salaryPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  const {
    school_id: schoolId,
    teacher_id: teacherId,
    branch_id: requestedBranchId,
    month,
    gross_salary: grossSalary,
    deductions,
    notes,
  } = parsed.data;

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "صرف الرواتب متاح للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  const rateLimited = await enforceRateLimit(req, {
    namespace: "salaries-pay",
    windowMs: 60_000,
    maxHits: 40,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  const canManageSalaries = await routeUserHasPermission(actorSupabase, actorUserId, "manage_salaries");
  if (!canManageSalaries) {
    return jsonError("ليس لديك صلاحية صرف الرواتب.", 403);
  }
  const { data: teacher, error: teacherError } = await applyBranchScopeToQuery(
    actorSupabase
      .from("teachers")
      .select("id, full_name")
      .eq("id", teacherId)
      .eq("school_id", targetSchoolId),
    branchScope.value,
  ).maybeSingle();

  if (teacherError || !teacher?.id) {
    return jsonError("الأستاذ المطلوب غير موجود ضمن المدرسة الحالية.", 404);
  }

  const { data: existing } = await applyBranchScopeToQuery(
    actorSupabase
      .from("salaries")
      .select("id")
      .eq("school_id", targetSchoolId)
      .eq("teacher_id", teacherId)
      .eq("month", month)
      .order("created_at", { ascending: true })
      .limit(1),
    branchScope.value,
  );

  if (existing && existing.length > 0) {
    return jsonError("تم دفع راتب هذا الشهر مسبقاً.", 409);
  }

  const writeBranch = resolveBranchIdForWrite(branchScope.value, requestedBranchId);
  if (!writeBranch.ok) {
    return jsonError(writeBranch.message, writeBranch.status);
  }
  const branchId = writeBranch.value ?? (await resolveSchoolBranchId(actorSupabase, targetSchoolId));
  const { data: insertedSalary, error: insertError } = await actorSupabase
    .from("salaries")
    .insert({
      school_id: targetSchoolId,
      branch_id: branchId,
      teacher_id: teacherId,
      gross_salary: grossSalary,
      deductions,
      month,
      is_paid: true,
      paid_at: new Date().toISOString(),
      notes,
    })
    .select("id, school_id, branch_id, teacher_id, gross_salary, deductions, month, is_paid, paid_at, notes, created_at, teachers(full_name,subject)")
    .single();

  if (insertError || !insertedSalary) {
    if (insertError?.code === "23505") {
      return jsonError("تم دفع راتب هذا الشهر مسبقاً.", 409);
    }

    logRouteError("salaries-pay", insertError ?? new Error("Salary insert failed"), {
      actorUserId,
      schoolId: targetSchoolId,
      teacherId,
      month,
    });
    return jsonError("تعذر صرف الراتب حالياً. حاول مرة أخرى بعد قليل.", 500);
  }

  invalidateSchoolCacheDomains(targetSchoolId, ["reports-overview"]);

  return NextResponse.json({
    ok: true,
    salary: {
      ...insertedSalary,
      teachers: Array.isArray(insertedSalary.teachers)
        ? insertedSalary.teachers[0] ?? null
        : insertedSalary.teachers ?? null,
    },
  });
}
