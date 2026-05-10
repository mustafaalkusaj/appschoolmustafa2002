import { NextRequest, NextResponse } from "next/server";

import { applyBranchScopeToQuery, resolveBranchScope, type ResolvedBranchScope } from "@/lib/branch-scope";
import { enforceRateLimit } from "@/lib/rate-limit";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import type { RouteSupabaseClient } from "@/lib/managed-users/types";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { buildSchoolCacheTag, rememberWithTtl } from "@/lib/server-cache";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { buildResolvedStudentFinancials } from "@/lib/students/financials";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ReportsMetrics = {
  studentsCount: number;
  activeStudents: number;
  totalFees: number;
  totalPaid: number;
  totalRemaining: number;
  paymentsCount: number;
  paymentVolume: number;
  todayPayments: number;
  expensesCount: number;
  expenseVolume: number;
  expenseTypeCount: number;
  salariesCount: number;
  salaryVolume: number;
  currentMonthSalaryCount: number;
  netBalance: number;

  // Top 3 summary cards
  netRevenue: number;
  netPayments: number;
  totalBalance: number;

  // Salary breakdown
  salaryFixedTotal: number;
  salaryLecturesTotal: number;
  salarySupervisionTotal: number;
  salaryDeductionsTotal: number;

  // Current students revenue
  currentStudentsTotalFees: number;
  currentStudentsCollected: number;
  currentStudentsDiscounts: number;
  currentStudentsRemaining: number;

  // Transferred students revenue
  transferredStudentsTotalFees: number;
  transferredStudentsCollected: number;
  transferredStudentsDiscounts: number;
  transferredStudentsRemaining: number;

  // Other revenue (incomes)
  otherRevenueTotal: number;

  // Expenses by type
  expensesByType: Array<{ name: string; total: number }>;
};

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



async function loadFallbackMetrics(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  branchScope: ResolvedBranchScope,
  currentMonth: string,
  todayDate: string,
) {
  const [studentsResult, classFeesResult, paymentsResult, expensesResult, salariesResult, dailyLecturesResult, deductionsResult, incomesResult, teachersResult] = await Promise.allSettled([
    applyBranchScopeToQuery(
      actorSupabase
        .from("students")
        .select("id, class_name, total_fee, paid_fee, remaining_fee, discount_value, status")
        .eq("school_id", schoolId)
        .neq("status", "deleted"),
      branchScope,
    ),
    applyBranchScopeToQuery(
      actorSupabase
        .from("class_fees")
        .select("class_name, total_fee")
        .eq("school_id", schoolId),
      branchScope,
    ),
    applyBranchScopeToQuery(
      actorSupabase
        .from("payments")
        .select("id, amount, created_at")
        .eq("school_id", schoolId)
        .is("deleted_at", null),
      branchScope,
    ),
    applyBranchScopeToQuery(
      actorSupabase
        .from("expenses")
        .select("id, amount, expense_types(name)")
        .eq("school_id", schoolId)
        .is("deleted_at", null),
      branchScope,
    ),
    applyBranchScopeToQuery(
      actorSupabase
        .from("salaries")
        .select("id, teacher_id, gross_salary, deductions, month")
        .eq("school_id", schoolId),
      branchScope,
    ),
    applyBranchScopeToQuery(
      actorSupabase
        .from("daily_lectures")
        .select("id, teacher_id, price")
        .eq("school_id", schoolId),
      branchScope,
    ),
    applyBranchScopeToQuery(
      actorSupabase
        .from("deductions")
        .select("id, teacher_id, amount")
        .eq("school_id", schoolId),
      branchScope,
    ),
    applyBranchScopeToQuery(
      actorSupabase
        .from("incomes")
        .select("id, amount")
        .eq("school_id", schoolId)
        .is("deleted_at", null),
      branchScope,
    ),
    applyBranchScopeToQuery(
      actorSupabase
        .from("teachers")
        .select("id, salary_type, job_title")
        .eq("school_id", schoolId),
      branchScope,
    ),
  ]);

  const students =
    studentsResult.status === "fulfilled"
      ? studentsResult.value.error
        ? []
        : ((studentsResult.value.data ?? []) as Array<Record<string, unknown>>)
      : [];

  const classFees =
    classFeesResult.status === "fulfilled"
      ? classFeesResult.value.error
        ? []
        : ((classFeesResult.value.data ?? []) as Array<Record<string, unknown>>)
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

  const dailyLectures =
    dailyLecturesResult.status === "fulfilled"
      ? dailyLecturesResult.value.error
        ? []
        : ((dailyLecturesResult.value.data ?? []) as Array<Record<string, unknown>>)
      : [];

  const deductionRows =
    deductionsResult.status === "fulfilled"
      ? deductionsResult.value.error
        ? []
        : ((deductionsResult.value.data ?? []) as Array<Record<string, unknown>>)
      : [];

  const incomes =
    incomesResult.status === "fulfilled"
      ? incomesResult.value.error
        ? []
        : ((incomesResult.value.data ?? []) as Array<Record<string, unknown>>)
      : [];

  const teachers =
    teachersResult.status === "fulfilled"
      ? teachersResult.value.error
        ? []
        : ((teachersResult.value.data ?? []) as Array<Record<string, unknown>>)
      : [];

  // Build teacher lookup map
  const teacherMap = new Map<string, { salary_type: string; job_title: string }>();
  teachers.forEach((t: any) => {
    if (t.id) {
      teacherMap.set(String(t.id), {
        salary_type: String(t.salary_type ?? "fixed"),
        job_title: String(t.job_title ?? ""),
      });
    }
  });

  // Build class_name -> total_fee map
  const classFeeMap = new Map<string, number>();
  classFees.forEach((cf: any) => {
    if (cf.class_name && typeof cf.total_fee === "number") {
      classFeeMap.set(String(cf.class_name), cf.total_fee);
    }
  });

  const expenseTypeCount = new Set(
    expenses
      .map((item) => readRelationName(item.expense_types))
      .filter(Boolean),
  ).size;

  // Calculate metrics with resolved class fees — split by current vs transferred
  let totalFees = 0;
  let totalPaid = 0;
  let totalRemaining = 0;

  let currentStudentsTotalFees = 0;
  let currentStudentsCollected = 0;
  let currentStudentsDiscounts = 0;
  let currentStudentsRemaining = 0;

  let transferredStudentsTotalFees = 0;
  let transferredStudentsCollected = 0;
  let transferredStudentsDiscounts = 0;
  let transferredStudentsRemaining = 0;

  students.forEach((student: any) => {
    const className = student.class_name;
    const classFeeTotal = className ? classFeeMap.get(className) : undefined;
    const resolved = buildResolvedStudentFinancials(
      {
        total_fee: Number(student.total_fee ?? 0),
        paid_fee: Number(student.paid_fee ?? 0),
        discount_value: Number(student.discount_value ?? 0),
      },
      classFeeTotal,
    );

    totalFees += resolved.resolved_total_fee;
    totalPaid += resolved.paid_fee;
    totalRemaining += resolved.remaining_fee;

    if (student.status === "transferred") {
      transferredStudentsTotalFees += resolved.resolved_total_fee;
      transferredStudentsCollected += resolved.paid_fee;
      transferredStudentsDiscounts += Number(student.discount_value ?? 0);
      transferredStudentsRemaining += resolved.remaining_fee;
    } else {
      currentStudentsTotalFees += resolved.resolved_total_fee;
      currentStudentsCollected += resolved.paid_fee;
      currentStudentsDiscounts += Number(student.discount_value ?? 0);
      currentStudentsRemaining += resolved.remaining_fee;
    }
  });

  // Salary breakdown by teacher type
  let salaryFixedTotal = 0;
  let salarySupervisionTotal = 0;

  salaries.forEach((s: any) => {
    const net = Math.max(0, Number(s.gross_salary ?? 0) - Number(s.deductions ?? 0));
    const teacherId = String(s.teacher_id ?? "");
    const teacher = teacherMap.get(teacherId);
    if (!teacher) {
      salaryFixedTotal += net;
      return;
    }
    if (teacher.job_title.includes("مراقب")) {
      salarySupervisionTotal += net;
    } else {
      salaryFixedTotal += net;
    }
  });

  const salaryLecturesTotal = dailyLectures.reduce(
    (sum, item) => sum + Number(item.price ?? 0), 0,
  );

  const salaryDeductionsTotal = deductionRows.reduce(
    (sum, item) => sum + Number(item.amount ?? 0), 0,
  );

  // Other revenue from incomes table
  const otherRevenueTotal = incomes.reduce(
    (sum, item) => sum + Number(item.amount ?? 0), 0,
  );

  // Expenses by type
  const expensesByTypeMap = new Map<string, number>();
  expenses.forEach((item) => {
    const typeName = readRelationName(item.expense_types) || "أخرى";
    expensesByTypeMap.set(typeName, (expensesByTypeMap.get(typeName) ?? 0) + Number(item.amount ?? 0));
  });
  const expensesByType = Array.from(expensesByTypeMap.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);

  const paymentVolume = payments.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
  const expenseVolume = expenses.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
  const salaryVolume = salaries.reduce(
    (sum, item) => sum + Number(item.gross_salary ?? 0) - Number(item.deductions ?? 0),
    0,
  );

  const netRevenue = totalPaid;
  const netPayments = expenseVolume + salaryVolume;

  const metrics = {
    studentsCount: students.length,
    activeStudents: students.filter((item) => item.status === "active").length,
    totalFees,
    totalPaid,
    totalRemaining,
    paymentsCount: payments.length,
    paymentVolume,
    todayPayments: payments.filter((item) => String(item.created_at ?? "").slice(0, 10) === todayDate).length,
    expensesCount: expenses.length,
    expenseVolume,
    expenseTypeCount,
    salariesCount: salaries.length,
    salaryVolume,
    currentMonthSalaryCount: salaries.filter((item) => item.month === currentMonth).length,

    netRevenue,
    netPayments,
    totalBalance: netRevenue - netPayments,

    salaryFixedTotal,
    salaryLecturesTotal,
    salarySupervisionTotal,
    salaryDeductionsTotal,

    currentStudentsTotalFees,
    currentStudentsCollected,
    currentStudentsDiscounts,
    currentStudentsRemaining,

    transferredStudentsTotalFees,
    transferredStudentsCollected,
    transferredStudentsDiscounts,
    transferredStudentsRemaining,

    otherRevenueTotal,

    expensesByType,
  };

  const finalMetrics = {
    ...metrics,
    netBalance: metrics.paymentVolume - metrics.expenseVolume - metrics.salaryVolume,
  } satisfies ReportsMetrics;

  return {
    metrics: finalMetrics,
    warnings: [studentsResult, classFeesResult, paymentsResult, expensesResult, salariesResult, dailyLecturesResult, deductionsResult, incomesResult, teachersResult]
      .map((result, index) => {
        const labels = ["بيانات الطلاب", "بيانات رسوم الفئات", "بيانات الدفعات", "بيانات المصروفات", "بيانات الرواتب", "بيانات المحاضرات", "بيانات الخصومات", "بيانات الواردات", "بيانات الأساتذة"];
        if (result.status !== "fulfilled") return `تعذر تحميل ${labels[index]} حالياً.`;
        if (result.value.error) return result.value.error.message || `تعذر تحميل ${labels[index]} حالياً.`;
        return null;
      })
      .filter(Boolean),
  };
}


export async function GET(req: NextRequest) {
  const t0 = performance.now();
  const tAuthStart = performance.now();

  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "التقارير متاحة للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );
  const tAuthEnd = performance.now();

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
  const canViewReports = await routeUserHasPermission(actorSupabase, actorUserId, "view_reports");
  if (!canViewReports) {
    return jsonError("ليس لديك صلاحية عرض التقارير.", 403);
  }
  const rateLimited = await enforceRateLimit(req, {
    namespace: "reports-overview",
    windowMs: 60_000,
    maxHits: 90,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  const currentMonth = new Date().toISOString().slice(0, 7);
  const todayDate = new Date().toISOString().slice(0, 10);

  try {
    const payload = await rememberWithTtl(
      `reports-overview:${targetSchoolId}:${branchScope.value.cacheKeySuffix}:${todayDate}`,
      30_000,
      async () => {
        // Use service role client for data queries (authorization already validated above)
        const dataSupabase = createServiceSupabaseClient();

        const fallback = await loadFallbackMetrics(dataSupabase, targetSchoolId, branchScope.value, currentMonth, todayDate);
        return {
          metrics: fallback.metrics,
          warnings: fallback.warnings,
        };
      },
      {
        tags: [buildSchoolCacheTag(targetSchoolId, "reports-overview")],
      },
    );

    const tEnd = performance.now();
    const totalTime = tEnd - t0;
    const authTime = tAuthEnd - tAuthStart;
    const dataTime = tEnd - tAuthEnd;

    return NextResponse.json(
      {
        ok: true,
        ...payload,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0, must-revalidate",
          "Pragma": "no-cache",
          "Server-Timing": `auth;dur=${Math.round(authTime)}, data;dur=${Math.round(dataTime)}, total;dur=${Math.round(totalTime)}`,
        },
      },
    );
  } catch {
    return jsonError("تعذر تحميل ملخص التقارير.", 500);
  }
}
