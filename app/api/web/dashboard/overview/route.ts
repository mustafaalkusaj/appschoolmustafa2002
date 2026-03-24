import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext, tableHasColumn } from "@/lib/managed-users-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
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

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
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

  const { actorSupabase, targetSchoolId } = context.value;
  const classFeesSchoolScope = await tableHasColumn(actorSupabase, "class_fees", "school_id").catch(() => false);

  const studentsPromise = actorSupabase
    .from("students")
    .select("id, full_name, class_name, total_fee, paid_fee, remaining_fee, discount_value, status")
    .eq("school_id", targetSchoolId)
    .neq("status", "deleted");

  let recentPaymentsPromise = actorSupabase
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
    return jsonError(
      studentsResult.status === "fulfilled"
        ? studentsResult.value.error?.message || "تعذر تحميل إحصائيات الطلاب."
        : "تعذر تحميل إحصائيات الطلاب.",
      500,
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
  const paidPct = totals.totalFees > 0 ? Math.round((totals.totalPaid / totals.totalFees) * 100) : 0;

  return NextResponse.json({
    ok: true,
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
  });
}
