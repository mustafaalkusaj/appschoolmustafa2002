import { NextRequest, NextResponse } from "next/server";

import { dashboardOverviewQuerySchema } from "@/lib/api-schemas";
import { resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext, tableHasColumn } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError, jsonValidationError, logRouteError } from "@/lib/route-utils";
import { buildSchoolCacheTag, rememberWithTtl } from "@/lib/server-cache";
import { buildResolvedStudentFinancials, calculateStudentPaidPercentage } from "@/lib/students/financials";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

// Server-side cache for schema column detection (10-minute TTL)
let schemaColumnsCache: {
  value: {
    studentsStatusScope: boolean;
    studentsBranchScope: boolean;
    paymentsBranchScope: boolean;
    salariesBranchScope: boolean;
    feeNotificationsTableExists: boolean;
    feeNotificationsBranchScope: boolean;
    classFeesTableExists: boolean;
    classFeesSchoolScope: boolean;
    classFeesBranchScope: boolean;
  };
  timestamp: number;
} | null = null;

const SCHEMA_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function getSchemaColumns(
  serviceSupabase: ReturnType<typeof createServiceSupabaseClient>,
) {
  const now = Date.now();
  if (schemaColumnsCache && now - schemaColumnsCache.timestamp < SCHEMA_CACHE_TTL_MS) {
    return schemaColumnsCache.value;
  }

  const [
    studentsStatusScope,
    studentsBranchScope,
    paymentsBranchScope,
    salariesBranchScope,
    feeNotificationsTableExists,
    feeNotificationsBranchScope,
    classFeesTableExists,
    classFeesSchoolScope,
    classFeesBranchScope,
  ] = await Promise.all([
    tableHasColumn(serviceSupabase as never, "students", "status").catch(() => false),
    tableHasColumn(serviceSupabase as never, "students", "branch_id").catch(() => false),
    tableHasColumn(serviceSupabase as never, "payments", "branch_id").catch(() => false),
    tableHasColumn(serviceSupabase as never, "salaries", "branch_id").catch(() => false),
    tableHasColumn(serviceSupabase as never, "fee_notifications", "id").catch(() => false),
    tableHasColumn(serviceSupabase as never, "fee_notifications", "branch_id").catch(
      () => false,
    ),
    tableHasColumn(serviceSupabase as never, "class_fees", "id").catch(() => false),
    tableHasColumn(serviceSupabase as never, "class_fees", "school_id").catch(() => false),
    tableHasColumn(serviceSupabase as never, "class_fees", "branch_id").catch(() => false),
  ]);

  const result = {
    studentsStatusScope,
    studentsBranchScope,
    paymentsBranchScope,
    salariesBranchScope,
    feeNotificationsTableExists,
    feeNotificationsBranchScope,
    classFeesTableExists,
    classFeesSchoolScope,
    classFeesBranchScope,
  };

  schemaColumnsCache = { value: result, timestamp: now };
  return result;
}

type DashboardStudentRow = {
  id: string;
  full_name: string | null;
  class_name: string | null;
  total_fee: number | null;
  paid_fee: number | null;
  remaining_fee: number | null;
  discount_value: number | null;
  status: string | null;
};

type ResolvedDashboardStudentRow = DashboardStudentRow & {
  resolved_total_fee: number;
};

function normalizeDashboardOverviewName(value: string | null | undefined) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
}

function normalizeDashboardOverviewKey(value: string | null | undefined) {
  return normalizeDashboardOverviewName(value)
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/ـ/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .toLocaleLowerCase();
}

function buildEmptyDashboardOverviewPayload(warning?: string | null) {
  return {
    totals: {
      studentsCount: 0,
      transferredCount: 0,
      totalFees: 0,
      totalPaid: 0,
      totalDiscount: 0,
      totalRemaining: 0,
      feeNotificationsCount: 0,
      monthlySalaries: 0,
      totalIncomes: 0,
      afterDiscount: 0,
      paidPct: 0,
      remainingPct: 0,
    },
    recentPayments: [],
    overdueStudents: [],
    classFees: [],
    studentCountByClass: {},
    ...(warning ? { warning } : {}),
  };
}

export async function GET(req: NextRequest) {
  const parsed = dashboardOverviewQuerySchema.safeParse({
    schoolId: req.nextUrl.searchParams.get("schoolId"),
    branchId: req.nextUrl.searchParams.get("branchId") ?? req.nextUrl.searchParams.get("branch_id"),
  });
  if (!parsed.success) {
    return jsonValidationError(parsed.error, "معرّف المدرسة غير صالح.");
  }

  const { schoolId, branchId } = parsed.data;
  const bypassCache = req.nextUrl.searchParams.get("fresh") === "1";
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "لوحة التحكم متاحة ضمن نطاق المدرسة الحالية فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorUserId, targetSchoolId } = context.value;
  // Resolve branch access via resolveBranchScope — handles all cases: school-level, branch-level, multi-branch
  const branchScope = resolveBranchScope(context.value, branchId ?? null);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }
  const effectiveBranchId = branchScope.value.branchId;

  const rateLimited = await enforceRateLimit(req, {
    namespace: "dashboard-overview",
    windowMs: 60_000,
    maxHits: 120,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  try {
    const serviceSupabase = createServiceSupabaseClient();
    const loadDashboardOverview = async () => {
      const {
        studentsStatusScope,
        studentsBranchScope,
        paymentsBranchScope,
        salariesBranchScope,
        feeNotificationsTableExists,
        feeNotificationsBranchScope,
        classFeesTableExists,
        classFeesSchoolScope,
        classFeesBranchScope,
      } = await getSchemaColumns(serviceSupabase);

      const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"

      let studentsPromise = serviceSupabase
        .from("students")
        .select("id, full_name, class_name, total_fee, paid_fee, remaining_fee, discount_value, status")
        .eq("school_id", targetSchoolId);
      if (studentsStatusScope) {
        studentsPromise = studentsPromise.or("status.neq.deleted,status.is.null");
      }
      // Apply branch_id filter if branchId is requested and column detection says it exists
      // If detection is wrong (false positive/negative), the query will fail and return degraded
      if (effectiveBranchId && studentsBranchScope) {
        studentsPromise = studentsPromise.eq("branch_id", effectiveBranchId);
      }

      let recentPaymentsPromise = serviceSupabase
        .from("payments")
        .select("id, amount, created_at, student_id, students(full_name,class_name)")
        .eq("school_id", targetSchoolId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(5);
      if (effectiveBranchId && paymentsBranchScope) {
        recentPaymentsPromise = recentPaymentsPromise.eq("branch_id", effectiveBranchId);
      }

      const classFeesPromise = classFeesTableExists
        ? (() => {
            let classFeesQuery = serviceSupabase
              .from("class_fees")
              .select("id, class_name, total_fee, installments, installment_amount, notes, created_at")
              .order("class_name", { ascending: true });
            if (classFeesSchoolScope) {
              classFeesQuery = classFeesQuery.eq("school_id", targetSchoolId);
            }
            if (effectiveBranchId && classFeesBranchScope) {
              classFeesQuery = classFeesQuery.eq("branch_id", effectiveBranchId);
            }
            return classFeesQuery;
          })()
        : Promise.resolve({ data: [], error: null });

      const feeNotificationsCountPromise = feeNotificationsTableExists
        ? (() => {
            let feeNotificationsQuery = serviceSupabase
              .from("fee_notifications")
              .select("id", { count: "exact", head: true })
              .eq("school_id", targetSchoolId);
            if (effectiveBranchId && feeNotificationsBranchScope) {
              feeNotificationsQuery = feeNotificationsQuery.eq("branch_id", effectiveBranchId);
            }
            return feeNotificationsQuery;
          })()
        : Promise.resolve({ count: 0, error: null });

      let monthlySalariesPromise = serviceSupabase
        .from("salaries")
        .select("gross_salary, deductions")
        .eq("school_id", targetSchoolId)
        .eq("month", currentMonth);
      if (effectiveBranchId && salariesBranchScope) {
        monthlySalariesPromise = monthlySalariesPromise.eq("branch_id", effectiveBranchId);
      }

      let incomesPromise = serviceSupabase
        .from("incomes")
        .select("amount")
        .eq("school_id", targetSchoolId)
        .is("deleted_at", null);
      if (effectiveBranchId) {
        incomesPromise = incomesPromise.eq("branch_id", effectiveBranchId);
      }

      const [studentsResult, recentPaymentsResult, classFeesResult, feeNotificationsResult, monthlySalariesResult, incomesResult] = await Promise.allSettled([
        studentsPromise,
        recentPaymentsPromise,
        classFeesPromise,
        feeNotificationsCountPromise,
        monthlySalariesPromise,
        incomesPromise,
      ]);

      const studentsFailed = studentsResult.status !== "fulfilled" || Boolean(studentsResult.value?.error);
      const recentPaymentsFailed = recentPaymentsResult.status !== "fulfilled" || Boolean(recentPaymentsResult.value?.error);
      const classFeesFailed = classFeesResult.status !== "fulfilled" || Boolean(classFeesResult.value?.error);
      const feeNotificationsFailed =
        feeNotificationsResult.status !== "fulfilled" || Boolean(feeNotificationsResult.value?.error);
      const monthlySalariesFailed =
        monthlySalariesResult.status !== "fulfilled" || Boolean(monthlySalariesResult.value?.error);

      const warning =
        studentsFailed || recentPaymentsFailed || classFeesFailed || feeNotificationsFailed || monthlySalariesFailed
          ? "degraded_dashboard_overview"
          : undefined;

      const students =
        studentsResult.status === "fulfilled" && !studentsResult.value.error
          ? ((studentsResult.value.data ?? []) as DashboardStudentRow[])
          : [];

      // SAFETY: If branch scope was requested but schema detection failed for any table,
      // we cannot safely apply branch filtering. Return degraded to prevent data leakage.
      if (effectiveBranchId) {
        const missingBranchScopes = [];
        if (!studentsBranchScope) missingBranchScopes.push("students");
        if (!paymentsBranchScope) missingBranchScopes.push("payments");
        if (!salariesBranchScope) missingBranchScopes.push("salaries");
        if (effectiveBranchId && feeNotificationsTableExists && !feeNotificationsBranchScope) {
          missingBranchScopes.push("fee_notifications");
        }
        if (missingBranchScopes.length > 0) {
          console.warn(
            `[dashboard-overview] Branch requested but columns not found in: ${missingBranchScopes.join(", ")}. Returning degraded.`
          );
          return buildEmptyDashboardOverviewPayload("degraded_dashboard_overview");
        }
      }
      const classFeeMap = new Map<string, number>();
      (classFeesResult.status === "fulfilled" && !classFeesResult.value.error
        ? (classFeesResult.value.data ?? [])
        : []
      ).forEach((fee: Record<string, unknown>) => {
        const className = normalizeDashboardOverviewName(String(fee.class_name ?? ""));
        const totalFee = Number(fee.total_fee ?? 0);
        if (className && Number.isFinite(totalFee) && totalFee > 0) {
          classFeeMap.set(className, totalFee);
        }
      });

      const resolvedStudents: ResolvedDashboardStudentRow[] = students.map((student) => {
        const className = normalizeDashboardOverviewName(student.class_name);
        const classFeeTotal = classFeeMap.get(className);
        const resolved = buildResolvedStudentFinancials(
          {
            total_fee: student.total_fee,
            paid_fee: student.paid_fee,
            discount_value: student.discount_value,
          },
          classFeeTotal,
        );

        return {
          ...student,
          total_fee: resolved.total_fee,
          paid_fee: resolved.paid_fee,
          discount_value: resolved.discount_value,
          remaining_fee: resolved.remaining_fee,
          resolved_total_fee: resolved.resolved_total_fee,
        };
      });
      const studentsById = new Map(resolvedStudents.map((student) => [student.id, student]));
      const classStatsByKey = Object.fromEntries(
        Object.entries(
          resolvedStudents.reduce<Record<string, { className: string; count: number; totalPaid: number; totalRemaining: number }>>((acc, student) => {
            const className = normalizeDashboardOverviewName(student.class_name);
            const classKey = normalizeDashboardOverviewKey(className);
            if (!classKey) return acc;
            const current = acc[classKey] ?? { className, count: 0, totalPaid: 0, totalRemaining: 0 };
            current.count += 1;
            current.totalPaid += Number(student.paid_fee ?? 0);
            current.totalRemaining += Number(student.remaining_fee ?? 0);
            acc[classKey] = current;
            return acc;
          }, {}),
        ).map(([className, stats]) => [className, stats]),
      );

      const recentPayments =
        recentPaymentsResult.status === "fulfilled" && !recentPaymentsResult.value.error
          ? (recentPaymentsResult.value.data ?? []).map((payment) => {
              const relation = Array.isArray(payment.students) ? payment.students[0] ?? null : payment.students ?? null;
              const student = studentsById.get(String(payment.student_id)) ?? null;
              return {
                id: payment.id,
                amount: payment.amount ?? 0,
                created_at: payment.created_at,
                student_id: payment.student_id,
                student_name:
                  (relation && typeof relation.full_name === "string" ? relation.full_name : null) ??
                  student?.full_name ??
                  "—",
                class_name:
                  (relation && typeof relation.class_name === "string" ? relation.class_name : null) ??
                  student?.class_name ??
                  "—",
              };
            })
          : [];

      const classFees =
        classFeesResult.status === "fulfilled" && !classFeesResult.value.error
          ? (classFeesResult.value.data ?? []).map((fee) => {
                const className = normalizeDashboardOverviewName(String(fee.class_name ?? ""));
                const studentStats =
                  classStatsByKey[normalizeDashboardOverviewKey(className)] ?? {
                  className,
                  count: 0,
                  totalPaid: 0,
                  totalRemaining: 0,
                };
              const feeTotal = Number(fee.total_fee ?? 0);
              const totalExpected = studentStats.count * feeTotal;
              const paidPct = totalExpected > 0 ? Math.round((studentStats.totalPaid / totalExpected) * 100) : 0;

              return {
                ...fee,
                class_name: className,
                total_fee: feeTotal,
                installments: Number(fee.installments ?? 0),
                installment_amount: Number(fee.installment_amount ?? 0),
                stats: {
                  count: studentStats.count,
                  totalExpected,
                  totalPaid: studentStats.totalPaid,
                  totalRemaining: studentStats.totalRemaining,
                  paidPct,
                },
              };
            })
          : [];

      const feeNotificationsCount =
        feeNotificationsResult.status === "fulfilled" && !feeNotificationsResult.value.error
          ? (feeNotificationsResult.value.count ?? 0)
          : 0;

      const monthlySalaryRows =
        monthlySalariesResult.status === "fulfilled" && !monthlySalariesResult.value.error
          ? (monthlySalariesResult.value.data ?? [])
          : [];

      const monthlySalaries = monthlySalaryRows.reduce(
        (sum, row) => sum + Math.max(0, Number(row.gross_salary ?? 0) - Number(row.deductions ?? 0)),
        0,
      );

      const incomeRows =
        incomesResult.status === "fulfilled" && !incomesResult.value?.error
          ? (incomesResult.value.data ?? [])
          : [];

      const totalIncomes = incomeRows.reduce(
        (sum, row) => sum + Number((row as Record<string, unknown>).amount ?? 0),
        0,
      );

      // Split into current vs transferred so transferred fees don't inflate global totals
      const currentStudents = resolvedStudents.filter((s) => s.status !== "transferred");
      const transferredStudents = resolvedStudents.filter((s) => s.status === "transferred");

      const totals = {
        studentsCount: resolvedStudents.length,
        transferredCount: transferredStudents.length,
        // totalFees and totalRemaining reflect current students only (transferred are written off)
        totalFees: currentStudents.reduce((sum, s) => sum + Number(s.resolved_total_fee ?? 0), 0),
        // totalPaid includes all students — their actual collected amounts
        totalPaid: resolvedStudents.reduce((sum, s) => sum + Number(s.paid_fee ?? 0), 0),
        totalDiscount: currentStudents.reduce((sum, s) => sum + Number(s.discount_value ?? 0), 0),
        totalRemaining: currentStudents.reduce((sum, s) => sum + Number(s.remaining_fee ?? 0), 0),
        feeNotificationsCount,
        monthlySalaries,
        totalIncomes,
      };

      const afterDiscount = totals.totalFees - totals.totalDiscount;
      const paidPct = calculateStudentPaidPercentage({
        total_fee: totals.totalFees,
        paid_fee: totals.totalPaid,
        discount_value: totals.totalDiscount,
      });

      return {
        totals: {
          ...totals,
          afterDiscount,
          paidPct,
          remainingPct: Math.max(0, 100 - paidPct),
        },
        recentPayments,
        overdueStudents: [...resolvedStudents]
          .filter((student) => Number(student.remaining_fee ?? 0) > 0)
          .sort((left, right) => Number(right.remaining_fee ?? 0) - Number(left.remaining_fee ?? 0))
          .slice(0, 3)
          .map((student) => ({
            id: student.id,
            full_name: student.full_name,
            class_name: normalizeDashboardOverviewName(student.class_name),
            remaining_fee: Number(student.remaining_fee ?? 0),
          })),
        classFees,
        studentCountByClass: Object.fromEntries(
          Object.values(classStatsByKey).map((stats) => [stats.className, stats.count]),
        ),
        ...(warning ? { warning } : {}),
      };
    };

    const payload = bypassCache
      ? await loadDashboardOverview()
      : await rememberWithTtl(
          `dashboard-overview:${targetSchoolId}:${effectiveBranchId ?? "all"}`,
          15_000,
          loadDashboardOverview,
          {
            tags: [buildSchoolCacheTag(targetSchoolId, "dashboard-overview")],
          },
        );

    return NextResponse.json({
      ok: true,
      ...payload,
    });
  } catch (error) {
    logRouteError("dashboard-overview", error, {
      actorUserId,
      schoolId: targetSchoolId,
      branchId: effectiveBranchId,
      requestId: req.headers.get("x-request-id"),
    });

    return NextResponse.json({
      ok: true,
      ...buildEmptyDashboardOverviewPayload("degraded_dashboard_overview"),
    });
  }
}
