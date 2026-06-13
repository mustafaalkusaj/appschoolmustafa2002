import { NextRequest, NextResponse } from "next/server";

import { incomeMutationSchema, schoolScopedDeleteSchema } from "@/lib/api-schemas";
import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { invalidateIncomeRelatedCaches } from "@/lib/incomes-server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { jsonError, jsonValidationError, logRouteError } from "@/lib/route-utils";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ incomeId: string }> },
) {
  const { incomeId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = incomeMutationSchema.safeParse(body);

  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  const context = await resolveSchoolScopedActorContext(
    parsed.data.school_id,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "إدارة الإيرادات متاحة للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const branchScope = resolveBranchScope(context.value, parsed.data.branch_id ?? null);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  const rateLimited = await enforceRateLimit(req, {
    namespace: "incomes-update",
    windowMs: 60_000,
    maxHits: 40,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }
  const canAddIncomes = await routeUserHasPermission(actorSupabase, actorUserId, "add_incomes");
  if (!canAddIncomes) {
    return jsonError("ليس لديك صلاحية تعديل الإيرادات.", 403);
  }

  const [incomeResult, incomeTypeResult] = await Promise.all([
    applyBranchScopeToQuery(
      actorSupabase
        .from("incomes")
        .select("id")
        .eq("id", incomeId)
        .eq("school_id", targetSchoolId),
      branchScope.value,
    ).maybeSingle(),
    actorSupabase
      .from("income_types")
      .select("id")
      .eq("id", parsed.data.income_type_id)
      .eq("school_id", targetSchoolId)
      .maybeSingle(),
  ]);

  if (incomeResult.error || !incomeResult.data?.id) {
    return jsonError("سجل الإيراد المطلوب غير موجود ضمن المدرسة الحالية.", 404);
  }

  if (incomeTypeResult.error || !incomeTypeResult.data?.id) {
    return jsonError("نوع الإيراد المحدد غير موجود ضمن المدرسة الحالية.", 404);
  }

  try {
    const { data: updatedIncome, error } = await applyBranchScopeToQuery(
      actorSupabase
        .from("incomes")
        .update({
          income_type_id: parsed.data.income_type_id,
          amount: parsed.data.amount,
          income_date: parsed.data.income_date,
          source: parsed.data.source,
          receipt_number: parsed.data.receipt_number,
          notes: parsed.data.notes,
        })
        .eq("id", incomeId)
        .eq("school_id", targetSchoolId),
      branchScope.value,
    )
      .select("id, school_id, income_type_id, amount, income_date, source, receipt_number, notes, created_at, income_types(name)")
      .single();

    if (error || !updatedIncome) {
      throw error ?? new Error("Income update failed");
    }

    invalidateIncomeRelatedCaches(targetSchoolId);

    return NextResponse.json({
      ok: true,
      income: updatedIncome,
    });
  } catch (error) {
    logRouteError("incomes-update", error, {
      actorUserId,
      schoolId: targetSchoolId,
      incomeId,
      requestId: req.headers.get("x-request-id"),
    });
    return jsonError("تعذر تحديث الإيراد حالياً. حاول مرة أخرى بعد قليل.", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ incomeId: string }> },
) {
  const { incomeId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schoolScopedDeleteSchema.safeParse(body);

  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  const context = await resolveSchoolScopedActorContext(
    parsed.data.school_id,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "إدارة الإيرادات متاحة للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const branchScope = resolveBranchScope(context.value);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  const rateLimited = await enforceRateLimit(req, {
    namespace: "incomes-delete",
    windowMs: 60_000,
    maxHits: 40,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }
  const canDeleteIncomes = await routeUserHasPermission(actorSupabase, actorUserId, "delete_incomes");
  if (!canDeleteIncomes) {
    return jsonError("ليس لديك صلاحية حذف الإيرادات.", 403);
  }

  try {
    const { data: deletedIncome, error } = await applyBranchScopeToQuery(
      actorSupabase
        .from("incomes")
        .delete()
        .eq("id", incomeId)
        .eq("school_id", targetSchoolId),
      branchScope.value,
    )
      .select("id")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!deletedIncome?.id) {
      return jsonError("سجل الإيراد المطلوب غير موجود ضمن المدرسة الحالية.", 404);
    }

    invalidateIncomeRelatedCaches(targetSchoolId);

    return NextResponse.json({
      ok: true,
      deletedIncomeId: deletedIncome.id,
    });
  } catch (error) {
    logRouteError("incomes-delete", error, {
      actorUserId,
      schoolId: targetSchoolId,
      incomeId,
      requestId: req.headers.get("x-request-id"),
    });
    return jsonError("تعذر حذف الإيراد حالياً. حاول مرة أخرى بعد قليل.", 500);
  }
}
