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

export async function GET(req: NextRequest) {
  const parsed = dashboardOverviewQuerySchema.safeParse({
    schoolId: req.nextUrl.searchParams.get("schoolId"),
  });
  if (!parsed.success) {
    return jsonValidationError(parsed.error, "معرّف المدرسة غير صالح.");
  }

  const { schoolId } = parsed.data;
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

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
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
    const payload = await rememberWithTtl(
      `dashboard-overview:${targetSchoolId}`,
      15_000,
      async () => {
        const classFeesSchoolScope = await tableHasColumn(actorSupabase, "class_fees", "school_id").catch(() => false);

        const studentsPromise = actorSupabase
          .from("students")
          .select("id, full_name, class_name, total_fee, paid_fee, remaining_fee, discount_value, status")
          .eq("school_id", targetSchoolId)
          .neq("status", "deleted");

        const recentPaymentsPromise = actorSupabase
          .from("payments")
          .select("id, amount, created_at, student_id, students(full_name,class_name)")
          .eq("school_id", targetSchoolId)
          .order("created_at", { ascending: false })
          .limit(5);

        let classFeesPromise = actorSupabase
          .from("class_fees")
          .select("id, class_name, total_fee, installments, installment_amount, notes, created_at")
          .order("class_name", { ascending: true });

        if (classFeesSchoolScope) {
          classFeesPromise = classFeesPromise.eq("school_id", targetSchoolId);
        }

        const [studentsResult, recentPaymentsResult, classFeesResult] = await Promise.allSettled([
          studentsPromise,
          recentPaymentsPromise,
          classFeesPromise,
        ]);

        if (studentsResult.status !== "fulfilled" || studentsResult.value.error) {
          throw (
            studentsResult.status === "fulfilled"
              ? studentsResult.value.error ?? new Error("Students query failed")
              : studentsResult.reason
          );
        }

        const students = (studentsResult.value.data ?? []) as DashboardStudentRow[];
        const studentsById = new Map(students.map((student) => [student.id, student]));
        const classStatsByName = Object.fromEntries(
          Object.entries(
            students.reduce<Record<string, { count: number; totalPaid: number; totalRemaining: number }>>((acc, student) => {
              const className = (student.class_name || "").trim();
              if (!className) return acc;
              const current = acc[className] ?? { count: 0, totalPaid: 0, totalRemaining: 0 };
              current.count += 1;
              current.totalPaid += Number(student.paid_fee ?? 0);
              current.totalRemaining += Number(student.remaining_fee ?? 0);
              acc[className] = current;
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
                const className = String(fee.class_name ?? "");
                const studentStats = classStatsByName[className] ?? { count: 0, totalPaid: 0, totalRemaining: 0 };
                const feeTotal = Number(fee.total_fee ?? 0);
                const totalExpected = studentStats.count * feeTotal;
                const paidPct = totalExpected > 0 ? Math.round((studentStats.totalPaid / totalExpected) * 100) : 0;

                return {
                  ...fee,
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

        const totals = {
          studentsCount: students.length,
          transferredCount: students.filter((student) => student.status === "transferred").length,
          totalFees: students.reduce((sum, student) => sum + Number(student.total_fee ?? 0), 0),
          totalPaid: students.reduce((sum, student) => sum + Number(student.paid_fee ?? 0), 0),
          totalDiscount: students.reduce((sum, student) => sum + Number(student.discount_value ?? 0), 0),
          totalRemaining: students.reduce((sum, student) => sum + Number(student.remaining_fee ?? 0), 0),
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
              class_name: student.class_name,
              remaining_fee: Number(student.remaining_fee ?? 0),
            })),
          classFees,
          studentCountByClass: Object.fromEntries(
            Object.entries(classStatsByName).map(([className, stats]) => [className, stats.count]),
          ),
        };
      },
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
      requestId: req.headers.get("x-request-id"),
    });
    return jsonError("تعذر تحميل ملخص لوحة التحكم حالياً. حاول مرة أخرى بعد قليل.", 500);
  }
}
