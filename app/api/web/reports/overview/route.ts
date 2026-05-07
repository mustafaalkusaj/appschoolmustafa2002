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

function isMissingReportsSummaryFunction(error: { code?: string | null; message?: string | null } | null | undefined) {
  return error?.code === "42883" || error?.message?.includes("school_reports_summary") || false;
}

function normalizeMetricNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function loadFallbackMetrics(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  branchScope: ResolvedBranchScope,
  currentMonth: string,
  todayDate: string,
) {
  const [studentsResult, classFeesResult, paymentsResult, expensesResult, salariesResult] = await Promise.allSettled([
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
        .eq("school_id", schoolId),
      branchScope,
    ),
    applyBranchScopeToQuery(
      actorSupabase
        .from("expenses")
        .select("id, amount, expense_types(name)")
        .eq("school_id", schoolId),
      branchScope,
    ),
    applyBranchScopeToQuery(
      actorSupabase
        .from("salaries")
        .select("id, gross_salary, deductions, month")
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

  // Calculate metrics with resolved class fees
  let totalFees = 0;
  let totalPaid = 0;
  let totalRemaining = 0;

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
  });

  const metrics = {
    studentsCount: students.length,
    activeStudents: students.filter((item) => item.status === "active").length,
    totalFees,
    totalPaid,
    totalRemaining,
    paymentsCount: payments.length,
    paymentVolume: payments.reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
    todayPayments: payments.filter((item) => String(item.created_at ?? "").slice(0, 10) === todayDate).length,
    expensesCount: expenses.length,
    expenseVolume: expenses.reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
    expenseTypeCount,
    salariesCount: salaries.length,
    salaryVolume: salaries.reduce(
      (sum, item) => sum + Number(item.gross_salary ?? 0) - Number(item.deductions ?? 0),
      0,
    ),
    currentMonthSalaryCount: salaries.filter((item) => item.month === currentMonth).length,
  };

  const finalMetrics = {
    ...metrics,
    netBalance: metrics.paymentVolume - metrics.expenseVolume - metrics.salaryVolume,
  } satisfies ReportsMetrics;

  return {
    metrics: finalMetrics,
    warnings: [studentsResult, classFeesResult, paymentsResult, expensesResult, salariesResult]
      .map((result, index) => {
        const labels = ["بيانات الطلاب", "بيانات رسوم الفئات", "بيانات الدفعات", "بيانات المصروفات", "بيانات الرواتب"];
        if (result.status !== "fulfilled") return `تعذر تحميل ${labels[index]} حالياً.`;
        if (result.value.error) return result.value.error.message || `تعذر تحميل ${labels[index]} حالياً.`;
        return null;
      })
      .filter(Boolean),
  };
}

async function loadSummaryMetrics(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  currentMonth: string,
  todayDate: string,
) {
  const { data, error } = await actorSupabase.rpc("school_reports_summary", {
    p_school_id: schoolId,
    p_current_month: currentMonth,
    p_today: todayDate,
  });

  if (error) {
    throw error;
  }

  const record = Array.isArray(data) ? data[0] : data;
  if (!record || typeof record !== "object") {
    return null;
  }

  const source = record as Record<string, unknown>;
  return {
    studentsCount: normalizeMetricNumber(source.students_count),
    activeStudents: normalizeMetricNumber(source.active_students),
    totalFees: normalizeMetricNumber(source.total_fees),
    totalPaid: normalizeMetricNumber(source.total_paid),
    totalRemaining: normalizeMetricNumber(source.total_remaining),
    paymentsCount: normalizeMetricNumber(source.payments_count),
    paymentVolume: normalizeMetricNumber(source.payment_volume),
    todayPayments: normalizeMetricNumber(source.today_payments),
    expensesCount: normalizeMetricNumber(source.expenses_count),
    expenseVolume: normalizeMetricNumber(source.expense_volume),
    expenseTypeCount: normalizeMetricNumber(source.expense_type_count),
    salariesCount: normalizeMetricNumber(source.salaries_count),
    salaryVolume: normalizeMetricNumber(source.salary_volume),
    currentMonthSalaryCount: normalizeMetricNumber(source.current_month_salary_count),
    netBalance: normalizeMetricNumber(source.net_balance),
  } satisfies ReportsMetrics;
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

        if (branchScope.value.branchIds.length === 0) {
          try {
            const metrics = await loadSummaryMetrics(dataSupabase, targetSchoolId, currentMonth, todayDate);
            if (metrics) {
              return {
                metrics,
                warnings: [],
              };
            }
          } catch (error) {
            if (!isMissingReportsSummaryFunction(error as { code?: string | null; message?: string | null })) {
              throw error;
            }
          }
        }

        const fallback = await loadFallbackMetrics(dataSupabase, targetSchoolId, branchScope.value, currentMonth, todayDate);
        return {
          metrics: fallback.metrics,
          warnings: [
            branchScope.value.branchIds.length > 0
              ? "تم تعطيل دالة ملخص المدرسة الواسعة تلقائياً داخل نطاق الفرع لمنع خلط بيانات الفروع."
              : "ملخص التقارير يعمل حالياً بوضع التوافق البرمجي. طبّق migration الخاصة بدالة school_reports_summary لتحسين الأداء.",
            ...fallback.warnings,
          ],
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
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر تحميل ملخص التقارير.", 500);
  }
}
