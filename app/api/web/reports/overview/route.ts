import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";

function readRelationName(value: unknown) {
  if (Array.isArray(value)) {
    return readRelationName(value[0] ?? null);
  }
  if (typeof value !== "object" || value === null) {
    return "";
  }

  const relation = value as { name?: unknown };
  return typeof relation.name === "string" ? relation.name : "";
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "التقارير متاحة للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorSupabase, targetSchoolId } = context.value;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const todayKey = new Date().toDateString();

  const [studentsResult, paymentsResult, expensesResult, salariesResult] = await Promise.allSettled([
    actorSupabase
      .from("students")
      .select("id, total_fee, paid_fee, remaining_fee, status")
      .eq("school_id", targetSchoolId)
      .neq("status", "deleted"),
    actorSupabase
      .from("payments")
      .select("id, amount, created_at")
      .eq("school_id", targetSchoolId),
    actorSupabase
      .from("expenses")
      .select("id, amount, expense_types(name)")
      .eq("school_id", targetSchoolId),
    actorSupabase
      .from("salaries")
      .select("id, gross_salary, deductions, month")
      .eq("school_id", targetSchoolId),
  ]);

  const students =
    studentsResult.status === "fulfilled"
      ? studentsResult.value.error
        ? []
        : ((studentsResult.value.data ?? []) as Array<Record<string, unknown>>)
      : [];
  const payments =
    paymentsResult.status === "fulfilled"
      ? paymentsResult.value.error
        ? []
        : ((paymentsResult.value.data ?? []) as Array<Record<string, unknown>>)
      : [];
  const expenses =
    expensesResult.status === "fulfilled"
      ? expensesResult.value.error
        ? []
        : ((expensesResult.value.data ?? []) as Array<Record<string, unknown>>)
      : [];
  const salaries =
    salariesResult.status === "fulfilled"
      ? salariesResult.value.error
        ? []
        : ((salariesResult.value.data ?? []) as Array<Record<string, unknown>>)
      : [];

  const expenseTypeCount = new Set(
    expenses
      .map((item) => readRelationName(item.expense_types))
      .filter(Boolean),
  ).size;

  const metrics = {
    studentsCount: students.length,
    activeStudents: students.filter((item) => item.status === "active").length,
    totalFees: students.reduce((sum, item) => sum + Number(item.total_fee ?? 0), 0),
    totalPaid: students.reduce((sum, item) => sum + Number(item.paid_fee ?? 0), 0),
    totalRemaining: students.reduce((sum, item) => sum + Number(item.remaining_fee ?? 0), 0),
    paymentsCount: payments.length,
    paymentVolume: payments.reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
    todayPayments: payments.filter((item) => new Date(String(item.created_at ?? "")).toDateString() === todayKey).length,
    expensesCount: expenses.length,
    expenseVolume: expenses.reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
    expenseTypeCount,
    salariesCount: salaries.length,
    salaryVolume: salaries.reduce(
      (sum, item) => sum + Math.max(0, Number(item.gross_salary ?? 0) - Number(item.deductions ?? 0)),
      0,
    ),
    currentMonthSalaryCount: salaries.filter((item) => item.month === currentMonth).length,
  };

  return NextResponse.json({
    ok: true,
    metrics: {
      ...metrics,
      netBalance: metrics.paymentVolume - metrics.expenseVolume - metrics.salaryVolume,
    },
    warnings: [studentsResult, paymentsResult, expensesResult, salariesResult]
      .map((result, index) => {
        const labels = ["بيانات الطلاب", "بيانات الدفعات", "بيانات المصروفات", "بيانات الرواتب"];
        if (result.status !== "fulfilled") return `تعذر تحميل ${labels[index]} حالياً.`;
        if (result.value.error) return result.value.error.message || `تعذر تحميل ${labels[index]} حالياً.`;
        return null;
      })
      .filter(Boolean),
  });
}
