import { NextRequest, NextResponse } from "next/server";

import { expenseMutationSchema, schoolScopedDeleteSchema } from "@/lib/api-schemas";
import { invalidateExpenseRelatedCaches } from "@/lib/expenses-server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
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

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  const rateLimited = enforceRateLimit(req, {
    namespace: "expenses-update",
    windowMs: 60_000,
    maxHits: 40,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  const [expenseResult, expenseTypeResult] = await Promise.all([
    actorSupabase
      .from("expenses")
      .select("id")
      .eq("id", expenseId)
      .eq("school_id", targetSchoolId)
      .maybeSingle(),
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
    const { data: updatedExpense, error } = await actorSupabase
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
      .eq("school_id", targetSchoolId)
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

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  const rateLimited = enforceRateLimit(req, {
    namespace: "expenses-delete",
    windowMs: 60_000,
    maxHits: 40,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  try {
    const { data: deletedExpense, error } = await actorSupabase
      .from("expenses")
      .delete()
      .eq("id", expenseId)
      .eq("school_id", targetSchoolId)
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

