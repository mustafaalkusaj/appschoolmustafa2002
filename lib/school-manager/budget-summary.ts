/**
 * Budget Summary Calculations for School Manager Dashboard
 * Computes planned vs actual income/expenses for fiscal years
 */

import type { RouteSupabaseClient } from "@/lib/managed-users/types";

export interface BudgetItemData {
  id: string;
  branch_id: string | null;
  category: string;
  item_type: string;
  description: string | null;
  planned_amount: number;
}

export interface BudgetData {
  id: string;
  school_id: string;
  fiscal_year: number;
  status: string;
  notes: string | null;
  created_at: string;
  budget_items: BudgetItemData[];
}

export interface BranchFinancialData {
  branchId: string | null;
  branchName: string;
  plannedIncome: number;
  actualIncome: number;
  plannedExpense: number;
  actualExpense: number;
}

export interface FiscalYearSummary {
  fiscalYear: number;
  isCurrent: boolean;
  budget: BudgetData | null;
  branches: BranchFinancialData[];
  totals: {
    plannedIncome: number;
    actualIncome: number;
    plannedExpense: number;
    actualExpense: number;
    plannedSurplus: number;
    actualSurplus: number;
    incomeCompletionRate: number;
    expenseConsumptionRate: number;
  };
}

function toAmount(value: unknown): number {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? Math.max(0, num) : 0;
}

function calculateRate(actual: number, planned: number): number {
  if (planned === 0) return 0;
  const rate = (actual / planned) * 100;
  return Math.min(100, Math.max(0, Math.round(rate * 10) / 10));
}

/**
 * Fetch actual financial data (payments and expenses) for a fiscal year
 */
async function fetchActualFinancials(
  supabase: RouteSupabaseClient,
  schoolId: string,
  fiscalYear: number,
) {
  const yearStart = new Date(`${fiscalYear}-01-01`);
  const yearEnd = new Date(`${fiscalYear}-12-31T23:59:59`);

  const [{ data: payments }, { data: expenses }] = await Promise.all([
    supabase
      .from("payments")
      .select("branch_id, amount, created_at")
      .eq("school_id", schoolId)
      .gte("created_at", yearStart.toISOString())
      .lte("created_at", yearEnd.toISOString()),
    supabase
      .from("expenses")
      .select("branch_id, amount, expense_date")
      .eq("school_id", schoolId)
      .gte("expense_date", yearStart.toISOString().split("T")[0])
      .lte("expense_date", yearEnd.toISOString().split("T")[0]),
  ]);

  return {
    payments: (payments ?? []) as Array<{ branch_id: string | null; amount: number }>,
    expenses: (expenses ?? []) as Array<{ branch_id: string | null; amount: number }>,
  };
}

// Must match the exclusion list in lib/school-manager/overview.ts
const EXCLUDED_BRANCH_NAMES = new Set([
  "الفرع الرئيسي",
  "الفرع الافتراضي",
  "الفرع الاداري",
  "main branch",
  "main",
  "root",
  "root branch",
  "default branch",
]);

function isBudgetExcludedBranch(name: string | null | undefined): boolean {
  if (!name) return false;
  const t = name.trim();
  return EXCLUDED_BRANCH_NAMES.has(t) || EXCLUDED_BRANCH_NAMES.has(t.toLowerCase());
}

/**
 * Get all non-excluded branches for school
 */
async function fetchBranchesWithData(supabase: RouteSupabaseClient, schoolId: string) {
  const { data } = await supabase
    .from("branches")
    .select("id, name")
    .eq("school_id", schoolId)
    .order("name", { ascending: true });

  return ((data ?? []) as Array<{ id: string; name: string }>).filter(
    (b) => !isBudgetExcludedBranch(b.name),
  );
}

/**
 * Compute financial summary for a fiscal year
 */
export async function computeFiscalYearSummary(
  supabase: RouteSupabaseClient,
  schoolId: string,
  fiscalYear: number,
): Promise<FiscalYearSummary> {
  const currentYear = new Date().getFullYear();
  const isCurrent = fiscalYear === currentYear;

  // Fetch budget data
  const { data: budgetData } = await supabase
    .from("budgets")
    .select(
      `
      id,
      school_id,
      fiscal_year,
      status,
      notes,
      created_at,
      budget_items(
        id,
        branch_id,
        category,
        item_type,
        description,
        planned_amount
      )
    `
    )
    .eq("school_id", schoolId)
    .eq("fiscal_year", fiscalYear)
    .maybeSingle();

  const budget = (budgetData as BudgetData) || null;

  // Fetch branches and actual financials
  const [branches, financials] = await Promise.all([
    fetchBranchesWithData(supabase, schoolId),
    isCurrent ? fetchActualFinancials(supabase, schoolId, fiscalYear) : Promise.resolve({ payments: [], expenses: [] }),
  ]);

  // Build branch summaries
  const branchMap = new Map<string, BranchFinancialData>();

  // Initialize with all branches
  branches.forEach((branch) => {
    branchMap.set(branch.id, {
      branchId: branch.id,
      branchName: branch.name || "فرع غير مسمى",
      plannedIncome: 0,
      actualIncome: 0,
      plannedExpense: 0,
      actualExpense: 0,
    });
  });

  // Add unassigned branch for null branch_id records
  branchMap.set("__unassigned__", {
    branchId: null,
    branchName: "سجلات غير مرتبطة بفرع",
    plannedIncome: 0,
    actualIncome: 0,
    plannedExpense: 0,
    actualExpense: 0,
  });

  // Add planned amounts from budget
  if (budget?.budget_items) {
    for (const item of budget.budget_items) {
      const key = item.branch_id || "__unassigned__";
      const existing = branchMap.get(key);

      if (existing) {
        const amount = toAmount(item.planned_amount);
        if (item.item_type === "income") {
          existing.plannedIncome += amount;
        } else if (item.item_type === "expense") {
          existing.plannedExpense += amount;
        }
      }
    }
  }

  // Add actual amounts
  for (const payment of financials.payments) {
    const key = payment.branch_id || "__unassigned__";
    const existing = branchMap.get(key);
    if (existing) {
      existing.actualIncome += toAmount(payment.amount);
    }
  }

  for (const expense of financials.expenses) {
    const key = expense.branch_id || "__unassigned__";
    const existing = branchMap.get(key);
    if (existing) {
      existing.actualExpense += toAmount(expense.amount);
    }
  }

  // Compute totals
  const branchList = Array.from(branchMap.values()).filter(
    (b) => b.branchId !== null || b.plannedIncome > 0 || b.plannedExpense > 0 || b.actualIncome > 0 || b.actualExpense > 0
  );

  const basicTotals = branchList.reduce(
    (acc, branch) => ({
      plannedIncome: acc.plannedIncome + branch.plannedIncome,
      actualIncome: acc.actualIncome + branch.actualIncome,
      plannedExpense: acc.plannedExpense + branch.plannedExpense,
      actualExpense: acc.actualExpense + branch.actualExpense,
    }),
    {
      plannedIncome: 0,
      actualIncome: 0,
      plannedExpense: 0,
      actualExpense: 0,
    }
  );

  const totals = {
    ...basicTotals,
    plannedSurplus: basicTotals.plannedIncome - basicTotals.plannedExpense,
    actualSurplus: basicTotals.actualIncome - basicTotals.actualExpense,
    incomeCompletionRate: calculateRate(basicTotals.actualIncome, basicTotals.plannedIncome),
    expenseConsumptionRate: calculateRate(basicTotals.actualExpense, basicTotals.plannedExpense),
  };

  return {
    fiscalYear,
    isCurrent,
    budget,
    branches: branchList,
    totals,
  };
}

/**
 * Fetch summaries for current and next fiscal year
 */
export async function fetchBudgetSummaries(
  supabase: RouteSupabaseClient,
  schoolId: string,
): Promise<{ current: FiscalYearSummary; next: FiscalYearSummary }> {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  const [current, next] = await Promise.all([
    computeFiscalYearSummary(supabase, schoolId, currentYear),
    computeFiscalYearSummary(supabase, schoolId, nextYear),
  ]);

  return { current, next };
}
