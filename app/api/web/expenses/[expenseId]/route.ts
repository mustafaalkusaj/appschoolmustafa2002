import { NextRequest, NextResponse } from "next/server";

import { expenseMutationSchema, schoolScopedDeleteSchema } from "@/lib/api-schemas";
import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { invalidateExpenseRelatedCaches } from "@/lib/expenses-server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { jsonError, jsonValidationError, logRouteError } from "@/lib/route-utils";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> },
) {
  const { expenseId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = expenseMutationSchema.safeParse(body);

  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  const context = await resolveSchoolScopedActorContext(
    parsed.data.school_id,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "إدارة المصروفات متاحة للإدارة فقط.",
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
    namespace: "expenses-update",
    windowMs: 60_000,
    maxHits: 40,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }
  const canAddExpenses = await routeUserHasPermission(actorSupabase, actorUserId, "add_expenses");
  if (!canAddExpenses) {
    return jsonError("ليس لديك صلاحية تعديل المصروفات.", 403);
  }

  const [expenseResult, expenseTypeResult] = await Promise.all([
    applyBranchScopeToQuery(
      actorSupabase
        .from("expenses")
        .select("id")
        .eq("id", expenseId)
        .eq("school_id", targetSchoolId),
      branchScope.value,
    ).maybeSingle(),
    actorSupabase
      .from("expense_types")
      .select("id")
      .eq("id", parsed.data.expense_type_id)
      .eq("school_id", targetSchoolId)
      .maybeSingle(),
  ]);

  if (expenseResult.error || !expenseResult.data?.id) {
    return jsonError("سجل المصروف المطلوب غير موجود ضمن المدرسة الحالية.", 404);
  }

  if (expenseTypeResult.error || !expenseTypeResult.data?.id) {
    return jsonError("نوع المصروف المحدد غير موجود ضمن المدرسة الحالية.", 404);
  }

  try {
    const { data: updatedExpense, error } = await applyBranchScopeToQuery(
      actorSupabase
        .from("expenses")
        .update({
          expense_type_id: parsed.data.expense_type_id,
          amount: parsed.data.amount,
          expense_date: parsed.data.expense_date,
          recipient: parsed.data.recipient,
          receipt_number: parsed.data.receipt_number,
          notes: parsed.data.notes,
        })
        .eq("id", expenseId)
        .eq("school_id", targetSchoolId),
      branchScope.value,
    )
      .select("id, school_id, expense_type_id, amount, expense_date, recipient, receipt_number, notes, created_at, expense_types(name)")
      .single();

    if (error || !updatedExpense) {
      throw error ?? new Error("Expense update failed");
    }

    invalidateExpenseRelatedCaches(targetSchoolId);

    return NextResponse.json({
      ok: true,
      expense: updatedExpense,
    });
  } catch (error) {
    logRouteError("expenses-update", error, {
      actorUserId,
      schoolId: targetSchoolId,
      expenseId,
      requestId: req.headers.get("x-request-id"),
    });
    return jsonError("تعذر تحديث المصروف حالياً. حاول مرة أخرى بعد قليل.", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> },
) {
  const { expenseId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schoolScopedDeleteSchema.safeParse(body);

  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  const context = await resolveSchoolScopedActorContext(
    parsed.data.school_id,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "إدارة المصروفات متاحة للإدارة فقط.",
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
    namespace: "expenses-delete",
    windowMs: 60_000,
    maxHits: 40,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }
  const canDeleteExpenses = await routeUserHasPermission(actorSupabase, actorUserId, "delete_expenses");
  if (!canDeleteExpenses) {
    return jsonError("ليس لديك صلاحية حذف المصروفات.", 403);
  }

  try {
    const { data: deletedExpense, error } = await applyBranchScopeToQuery(
      actorSupabase
        .from("expenses")
        .delete()
        .eq("id", expenseId)
        .eq("school_id", targetSchoolId),
      branchScope.value,
    )
      .select("id")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!deletedExpense?.id) {
      return jsonError("سجل المصروف المطلوب غير موجود ضمن المدرسة الحالية.", 404);
    }

    invalidateExpenseRelatedCaches(targetSchoolId);

    return NextResponse.json({
      ok: true,
      deletedExpenseId: deletedExpense.id,
    });
  } catch (error) {
    logRouteError("expenses-delete", error, {
      actorUserId,
      schoolId: targetSchoolId,
      expenseId,
      requestId: req.headers.get("x-request-id"),
    });
    return jsonError("تعذر حذف المصروف حالياً. حاول مرة أخرى بعد قليل.", 500);
  }
}
