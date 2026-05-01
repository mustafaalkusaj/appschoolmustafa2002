import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { jsonError } from "@/lib/route-utils";
import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    { allowedRoles: ["super_admin", "admin"], roleDeniedMessage: "unauthorized" },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const requestedBranchId = req.nextUrl.searchParams.get("branchId");
  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { targetSchoolId, actorUserId, actorRole, actorBranchId } = context.value;
  const dataSupabase = createServiceSupabaseClient();

  try {
    // Raw queries to show exactly what data exists
    const [studentsQ, paymentsQ, expensesQ, salariesQ] = await Promise.allSettled([
      applyBranchScopeToQuery(
        dataSupabase
          .from("students")
          .select("id, total_fee, paid_fee, school_id, branch_id, status")
          .eq("school_id", targetSchoolId)
          .neq("status", "deleted"),
        branchScope.value,
      ),
      applyBranchScopeToQuery(
        dataSupabase
          .from("payments")
          .select("id, amount, school_id, branch_id, created_at")
          .eq("school_id", targetSchoolId),
        branchScope.value,
      ),
      applyBranchScopeToQuery(
        dataSupabase
          .from("expenses")
          .select("id, amount, school_id, branch_id")
          .eq("school_id", targetSchoolId),
        branchScope.value,
      ),
      applyBranchScopeToQuery(
        dataSupabase
          .from("salaries")
          .select("id, gross_salary, deductions, school_id, branch_id")
          .eq("school_id", targetSchoolId),
        branchScope.value,
      ),
    ]);

    const students = studentsQ.status === "fulfilled" && !studentsQ.value.error ? (studentsQ.value.data as Array<Record<string, unknown>>) : [];
    const payments = paymentsQ.status === "fulfilled" && !paymentsQ.value.error ? (paymentsQ.value.data as Array<Record<string, unknown>>) : [];
    const expenses = expensesQ.status === "fulfilled" && !expensesQ.value.error ? (expensesQ.value.data as Array<Record<string, unknown>>) : [];
    const salaries = salariesQ.status === "fulfilled" && !salariesQ.value.error ? (salariesQ.value.data as Array<Record<string, unknown>>) : [];

    return NextResponse.json({
      debug: {
        currentUserId: actorUserId,
        role: actorRole,
        schoolIdRequested: schoolId,
        schoolIdActual: targetSchoolId,
        branchIdRequested: requestedBranchId,
        branchIdActual: actorBranchId,
        branchScope: branchScope.value,
      },
      rawCounts: {
        studentsCount: students.length,
        paymentsCount: payments.length,
        expensesCount: expenses.length,
        salariesCount: salaries.length,
      },
      studentsSample: students.slice(0, 2),
      paymentsSample: payments.slice(0, 2),
      expensesSample: expenses.slice(0, 2),
      salariesSample: salaries.slice(0, 2),
      computedMetrics: {
        totalFees: students.reduce((sum: number, s) => sum + Number(s.total_fee ?? 0), 0),
        totalPaid: students.reduce((sum: number, s) => sum + Number(s.paid_fee ?? 0), 0),
        paymentVolume: payments.reduce((sum: number, p) => sum + Number(p.amount ?? 0), 0),
        expenseVolume: expenses.reduce((sum: number, e) => sum + Number(e.amount ?? 0), 0),
        salaryVolume: salaries.reduce((sum: number, s) => sum + Number(s.gross_salary ?? 0) - Number(s.deductions ?? 0), 0),
      },
      errors: {
        students: studentsQ.status === "fulfilled" ? (studentsQ.value.error?.message || null) : "rejected",
        payments: paymentsQ.status === "fulfilled" ? (paymentsQ.value.error?.message || null) : "rejected",
        expenses: expensesQ.status === "fulfilled" ? (expensesQ.value.error?.message || null) : "rejected",
        salaries: salariesQ.status === "fulfilled" ? (salariesQ.value.error?.message || null) : "rejected",
      },
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "debug failed", 500);
  }
}
