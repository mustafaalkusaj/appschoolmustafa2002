import { NextRequest, NextResponse } from "next/server";

import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { jsonError } from "@/lib/route-utils";
import { generateFinancialSummaryReport } from "@/lib/reports/pdf-generator";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const schoolId = url.searchParams.get("schoolId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const locale = (url.searchParams.get("locale") === "en" ? "en" : "ar") as "ar" | "en";

  if (!schoolId || !from || !to) {
    return jsonError("schoolId, from, and to are required.", 400);
  }

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    { allowedRoles: ["super_admin", "admin"], roleDeniedMessage: "غير مصرح بالوصول." },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "Unauthorized",
      "status" in context ? context.status : 403,
    );
  }

  const { actorSupabase, targetSchoolId } = context.value;

  const requestedBranchId = url.searchParams.get("branchId") ?? url.searchParams.get("branch_id");
  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const [studentsRes, paymentsRes, expensesRes, salariesRes, incomesRes, schoolRes] =
    await Promise.all([
      applyBranchScopeToQuery(
        actorSupabase
          .from("students")
          .select("id, full_name, class_name, total_fee, paid_fee, remaining_fee")
          .eq("school_id", targetSchoolId),
        branchScope.value,
      ),
      applyBranchScopeToQuery(
        actorSupabase
          .from("payments")
          .select("id, amount, payment_method")
          .eq("school_id", targetSchoolId)
          .gte("created_at", from)
          .lte("created_at", to.includes("T") ? to : `${to}T23:59:59.999`),
        branchScope.value,
      ),
      applyBranchScopeToQuery(
        actorSupabase
          .from("expenses")
          .select("id, amount")
          .eq("school_id", targetSchoolId)
          .gte("expense_date", from)
          .lte("expense_date", to),
        branchScope.value,
      ),
      applyBranchScopeToQuery(
        actorSupabase
          .from("salaries")
          .select("id, gross_salary, deductions")
          .eq("school_id", targetSchoolId),
        branchScope.value,
      ),
      applyBranchScopeToQuery(
        actorSupabase
          .from("incomes")
          .select("id, amount")
          .eq("school_id", targetSchoolId)
          .gte("income_date", from)
          .lte("income_date", to),
        branchScope.value,
      ),
      actorSupabase
        .from("schools")
        .select("name, logo_url, primary_color")
        .eq("id", targetSchoolId)
        .maybeSingle(),
    ]);

  const students = (studentsRes.data ?? []) as Array<{
    id: string;
    full_name: string;
    class_name: string | null;
    total_fee: number | null;
    paid_fee: number | null;
    remaining_fee: number | null;
  }>;
  const payments = (paymentsRes.data ?? []) as Array<{
    id: string;
    amount: number | null;
    payment_method: string | null;
  }>;
  const expenses = (expensesRes.data ?? []) as Array<{ id: string; amount: number | null }>;
  const salaries = (salariesRes.data ?? []) as Array<{
    id: string;
    gross_salary: number | null;
    deductions: number | null;
  }>;
  const incomes = (incomesRes.data ?? []) as Array<{ id: string; amount: number | null }>;

  const totalFees = students.reduce((s, st) => s + (st.total_fee ?? 0), 0);
  const totalPaid = students.reduce((s, st) => s + (st.paid_fee ?? 0), 0);
  const totalRemaining = students.reduce((s, st) => s + (st.remaining_fee ?? 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount ?? 0), 0);
  const totalSalaries = salaries.reduce(
    (s, sal) => s + Math.max(0, (sal.gross_salary ?? 0) - (sal.deductions ?? 0)),
    0,
  );
  const totalIncomes = incomes.reduce((s, inc) => s + (inc.amount ?? 0), 0);

  // Payments by method
  const methodMap = new Map<string, { total: number; count: number }>();
  for (const p of payments) {
    const m = p.payment_method || "other";
    const existing = methodMap.get(m) || { total: 0, count: 0 };
    existing.total += p.amount ?? 0;
    existing.count += 1;
    methodMap.set(m, existing);
  }
  const paymentsByMethod = Array.from(methodMap.entries()).map(([method, v]) => ({
    method,
    total: v.total,
    count: v.count,
  }));

  // Top debtors
  const topDebtors = students
    .filter((st) => (st.remaining_fee ?? 0) > 0)
    .sort((a, b) => (b.remaining_fee ?? 0) - (a.remaining_fee ?? 0))
    .slice(0, 10)
    .map((st) => ({
      name: st.full_name,
      className: st.class_name ?? "—",
      remaining: st.remaining_fee ?? 0,
    }));

  const school = schoolRes.data as { name: string; logo_url: string | null; primary_color: string | null } | null;

  const html = generateFinancialSummaryReport({
    dateRange: { from, to },
    data: {
      totalStudents: students.length,
      totalFees,
      totalPaid,
      totalRemaining,
      totalExpenses,
      totalSalaries,
      totalIncomes,
      paymentsByMethod,
      topDebtors,
    },
    locale,
    branding: {
      schoolName: school?.name ?? null,
      logoUrl: school?.logo_url ?? null,
      primaryColor: school?.primary_color ?? null,
    },
  });

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
