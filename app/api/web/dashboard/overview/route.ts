import { NextRequest, NextResponse } from "next/server";

import { dashboardOverviewQuerySchema } from "@/lib/api-schemas";
import { resolveSchoolScopedActorContext, tableHasColumn } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError, jsonValidationError, logRouteError } from "@/lib/route-utils";
import { buildSchoolCacheTag, rememberWithTtl } from "@/lib/server-cache";
import { calculateStudentPaidPercentage } from "@/lib/students/financials";

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

  const { actorSupabase, actorUserId, targetSchoolId, allowedBranchIds } = context.value;
  const effectiveBranchId = branchId?.trim() || null;
  if (effectiveBranchId && allowedBranchIds.length > 0 && !allowedBranchIds.includes(effectiveBranchId)) {
    return jsonError("لا يمكنك الوصول إلى بيانات هذا الفرع.", 403);
  }

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
    const loadDashboardOverview = async () => {
      const [
        studentsBranchScope,
        paymentsBranchScope,
        salariesBranchScope,
        feeNotificationsBranchScope,
        classFeesSchoolScope,
        classFeesBranchScope,
      ] = await Promise.all([
        tableHasColumn(actorSupabase, "students", "branch_id").catch(() => false),
        tableHasColumn(actorSupabase, "payments", "branch_id").catch(() => false),
        tableHasColumn(actorSupabase, "salaries", "branch_id").catch(() => false),
        tableHasColumn(actorSupabase, "fee_notifications", "branch_id").catch(() => false),
        tableHasColumn(actorSupabase, "class_fees", "school_id").catch(() => false),
        tableHasColumn(actorSupabase, "class_fees", "branch_id").catch(() => false),
      ]);

      const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"

      let studentsPromise = actorSupabase
        .from("students")
        .select("id, full_name, class_name, total_fee, paid_fee, remaining_fee, discount_value, status")
        .eq("school_id", targetSchoolId)
        .neq("status", "deleted");
      if (effectiveBranchId && studentsBranchScope) {
        studentsPromise = studentsPromise.eq("branch_id", effectiveBranchId);
      }

      let recentPaymentsPromise = actorSupabase
        .from("payments")
        .select("id, amount, created_at, student_id, students(full_name,class_name)")
        .eq("school_id", targetSchoolId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (effectiveBranchId && paymentsBranchScope) {
        recentPaymentsPromise = recentPaymentsPromise.eq("branch_id", effectiveBranchId);
      }

      let classFeesPromise = actorSupabase
        .from("class_fees")
        .select("id, class_name, total_fee, installments, installment_amount, notes, created_at")
        .order("class_name", { ascending: true });

      if (classFeesSchoolScope) {
        classFeesPromise = classFeesPromise.eq("school_id", targetSchoolId);
      }
      if (effectiveBranchId && classFeesBranchScope) {
        classFeesPromise = classFeesPromise.eq("branch_id", effectiveBranchId);
      }

      let feeNotificationsCountPromise = actorSupabase
        .from("fee_notifications")
        .select("id", { count: "exact", head: true })
        .eq("school_id", targetSchoolId);
      if (effectiveBranchId && feeNotificationsBranchScope) {
        feeNotificationsCountPromise = feeNotificationsCountPromise.eq("branch_id", effectiveBranchId);
      }

      let monthlySalariesPromise = actorSupabase
        .from("salaries")
        .select("gross_salary, deductions")
        .eq("school_id", targetSchoolId)
        .eq("month", currentMonth);
      if (effectiveBranchId && salariesBranchScope) {
        monthlySalariesPromise = monthlySalariesPromise.eq("branch_id", effectiveBranchId);
      }

      const [studentsResult, recentPaymentsResult, classFeesResult, feeNotificationsResult, monthlySalariesResult] = await Promise.allSettled([
        studentsPromise,
        recentPaymentsPromise,
        classFeesPromise,
        feeNotificationsCountPromise,
        monthlySalariesPromise,
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
      const studentsById = new Map(students.map((student) => [student.id, student]));
      const classStatsByKey = Object.fromEntries(
        Object.entries(
          students.reduce<Record<string, { className: string; count: number; totalPaid: number; totalRemaining: number }>>((acc, student) => {
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
        (sum, row) => sum + Number(row.gross_salary ?? 0) - Number(row.deductions ?? 0),
        0,
      );

      const totals = {
        studentsCount: students.length,
        transferredCount: students.filter((student) => student.status === "transferred").length,
        totalFees: students.reduce((sum, student) => sum + Number(student.total_fee ?? 0), 0),
        totalPaid: students.reduce((sum, student) => sum + Number(student.paid_fee ?? 0), 0),
        totalDiscount: students.reduce((sum, student) => sum + Number(student.discount_value ?? 0), 0),
        totalRemaining: students.reduce((sum, student) => sum + Number(student.remaining_fee ?? 0), 0),
        feeNotificationsCount,
        monthlySalaries,
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
        overdueStudents: [...students]
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
