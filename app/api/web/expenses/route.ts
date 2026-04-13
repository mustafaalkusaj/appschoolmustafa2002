import { NextRequest, NextResponse } from "next/server";

import {
  expenseMutationSchema,
  expensesListQuerySchema,
} from "@/lib/api-schemas";
import {
  invalidateExpenseRelatedCaches,
  resolveExpensesPage,
} from "@/lib/expenses-server";
import {
  resolveSchoolBranchId,
  resolveSchoolScopedActorContext,
} from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError, jsonValidationError, logRouteError } from "@/lib/route-utils";

export async function GET(req: NextRequest) {
  const parsed = expensesListQuerySchema.safeParse({
    schoolId: req.nextUrl.searchParams.get("schoolId"),
    page: req.nextUrl.searchParams.get("page") ?? "1",
    pageSize: req.nextUrl.searchParams.get("pageSize") ?? "20",
    search: req.nextUrl.searchParams.get("search") ?? "",
    expenseTypeId: req.nextUrl.searchParams.get("expenseTypeId"),
    fromDate: req.nextUrl.searchParams.get("fromDate"),
    toDate: req.nextUrl.searchParams.get("toDate"),
  });

  if (!parsed.success) {
    return jsonValidationError(parsed.error, "معايير تحميل المصروفات غير صالحة.");
  }

  const context = await resolveSchoolScopedActorContext(
    parsed.data.schoolId,
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
  const rateLimited = await enforceRateLimit(req, {
    namespace: "expenses-list",
    windowMs: 60_000,
    maxHits: 120,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  try {
    const payload = await resolveExpensesPage(actorSupabase, targetSchoolId, {
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      search: parsed.data.search,
      expenseTypeId: parsed.data.expenseTypeId ?? null,
      fromDate: parsed.data.fromDate ?? null,
      toDate: parsed.data.toDate ?? null,
    });

    return NextResponse.json(
      {
        ok: true,
        ...payload,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    logRouteError("expenses-list", error, {
      actorUserId,
      schoolId: targetSchoolId,
      requestId: req.headers.get("x-request-id"),
    });
    return jsonError("تعذر تحميل المصروفات حالياً. حاول مرة أخرى بعد قليل.", 500);
  }
}

export async function POST(req: NextRequest) {
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
  const rateLimited = await enforceRateLimit(req, {
    namespace: "expenses-create",
    windowMs: 60_000,
    maxHits: 40,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  const { data: expenseType, error: expenseTypeError } = await actorSupabase
    .from("expense_types")
    .select("id, name")
    .eq("id", parsed.data.expense_type_id)
    .eq("school_id", targetSchoolId)
    .maybeSingle();

  if (expenseTypeError || !expenseType?.id) {
    return jsonError("نوع المصروف المحدد غير موجود ضمن المدرسة الحالية.", 404);
  }

  try {
    const branchId = await resolveSchoolBranchId(actorSupabase, targetSchoolId);
    const { data: createdExpense, error } = await actorSupabase
      .from("expenses")
      .insert({
        school_id: targetSchoolId,
        branch_id: branchId,
        expense_type_id: parsed.data.expense_type_id,
        amount: parsed.data.amount,
        expense_date: parsed.data.expense_date,
        recipient: parsed.data.recipient,
        receipt_number: parsed.data.receipt_number,
        notes: parsed.data.notes,
      })
      .select("id, school_id, expense_type_id, amount, expense_date, recipient, receipt_number, notes, created_at, expense_types(name)")
      .single();

    if (error || !createdExpense) {
      throw error ?? new Error("Expense insert failed");
    }

    invalidateExpenseRelatedCaches(targetSchoolId);

    return NextResponse.json({
      ok: true,
      expense: createdExpense,
    });
  } catch (error) {
    logRouteError("expenses-create", error, {
      actorUserId,
      schoolId: targetSchoolId,
      requestId: req.headers.get("x-request-id"),
    });
    return jsonError("تعذر حفظ المصروف حالياً. حاول مرة أخرى بعد قليل.", 500);
  }
}

