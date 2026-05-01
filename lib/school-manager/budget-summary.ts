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
  dataQuality: "high" | "medium" | "low";
  insights: string[];
  isForecasted: boolean;
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
 * Evaluate data quality based on available financial records
 */
function evaluateDataQuality(
  hasBudget: boolean,
  paymentsCount: number,
  expensesCount: number,
  branchCount: number,
  hasActualData: boolean,
): "high" | "medium" | "low" {
  const score = [
    hasBudget ? 2 : 0,
    paymentsCount > 0 ? 2 : 0,
    expensesCount > 0 ? 2 : 0,
    branchCount > 0 ? 1 : 0,
    hasActualData ? 2 : 0,
  ].reduce((a, b) => a + b, 0);

  if (score >= 8) return "high";
  if (score >= 4) return "medium";
  return "low";
}

/**
 * Generate dynamic insights based on financial data
 */
function generateInsights(
  currentSummary: Omit<FiscalYearSummary, "dataQuality" | "insights" | "isForecasted">,
  paymentsCount: number,
  expensesCount: number,
): string[] {
  const insights: string[] = [];
  const { totals, branches } = currentSummary;

  // Income collection rate insight
  if (totals.plannedIncome > 0) {
    const collectionRate = totals.incomeCompletionRate;
    if (collectionRate < 50) {
      insights.push("معدل التحصيل منخفض جداً، مما قد يؤثر على دقة التوقعات المستقبلية.");
    } else if (collectionRate < 75) {
      insights.push("معدل التحصيل متوسط، لذلك توقع السنة القادمة قد يحمل مخاطرة.");
    }
  }

  // Expense tracking insight
  if (expensesCount === 0) {
    insights.push("لا توجد مصروفات مسجلة، لذلك دقة توقع المصروفات منخفضة.");
  } else if (totals.plannedExpense > 0 && totals.actualExpense === 0) {
    insights.push("المصروفات المخططة غير مطابقة للبيانات الفعلية المسجلة.");
  }

  // Branch concentration insight
  if (branches.length > 0) {
    const sortedByIncome = [...branches].sort((a, b) => b.actualIncome - a.actualIncome);
    const topBranchIncome = sortedByIncome[0]?.actualIncome || 0;
    const totalIncome = totals.actualIncome;

    if (totalIncome > 0 && topBranchIncome > 0) {
      const concentration = (topBranchIncome / totalIncome) * 100;
      if (concentration > 70) {
        insights.push(
          `أغلب الإيرادات (${concentration.toFixed(0)}%) تأتي من فرع واحد، مما يزيد المخاطرة.`,
        );
      }
    }
  }

  // Payment count insight
  if (paymentsCount === 0) {
    insights.push("لا توجد مدفوعات مسجلة حتى الآن.");
  }

  // Budget status insight
  if (!currentSummary.budget) {
    insights.push("لا توجد موازنة معتمدة، التوقع يعتمد على البيانات الفعلية فقط.");
  } else {
    insights.push("التوقع يعتمد على موازنة معتمدة وبيانات فعلية.");
  }

  return insights;
}

/**
 * Create a forecast for next year based on current data
 */
function createForecast(
  current: Omit<FiscalYearSummary, "dataQuality" | "insights" | "isForecasted">,
  nextYear: Omit<FiscalYearSummary, "dataQuality" | "insights" | "isForecasted">,
): Omit<FiscalYearSummary, "dataQuality" | "insights" | "isForecasted"> {
  // If next year has a budget, use it; otherwise create a forecast
  if (nextYear.budget) {
    return nextYear;
  }

  const { totals: currentTotals, branches: currentBranches } = current;

  // Calculate growth factor or use conservative estimate
  let incomeFactor = 1;
  let expenseFactor = 1;

  if (currentTotals.actualIncome > 0 && currentTotals.plannedIncome > 0) {
    // Compare actual to planned
    incomeFactor = Math.min(1.1, currentTotals.actualIncome / currentTotals.plannedIncome);
  } else if (currentTotals.actualIncome > 0) {
    // Conservative 5% growth
    incomeFactor = 1.05;
  }

  if (currentTotals.actualExpense > 0 && currentTotals.plannedExpense > 0) {
    expenseFactor = currentTotals.actualExpense / currentTotals.plannedExpense;
  } else if (currentTotals.actualExpense > 0) {
    expenseFactor = 1.05;
  }

  // Forecast branch data
  const forecastedBranches: BranchFinancialData[] = currentBranches.map((branch) => ({
    ...branch,
    plannedIncome: Math.round(branch.actualIncome * incomeFactor),
    plannedExpense: Math.round(branch.actualExpense * expenseFactor),
  }));

  // Compute new totals
  const forecastedTotals = {
    plannedIncome: Math.round(currentTotals.actualIncome * incomeFactor),
    actualIncome: 0,
    plannedExpense: Math.round(currentTotals.actualExpense * expenseFactor),
    actualExpense: 0,
    plannedSurplus: 0,
    actualSurplus: 0,
    incomeCompletionRate: 0,
    expenseConsumptionRate: 0,
  };

  forecastedTotals.plannedSurplus =
    forecastedTotals.plannedIncome - forecastedTotals.plannedExpense;

  return {
    fiscalYear: nextYear.fiscalYear,
    isCurrent: false,
    budget: null,
    branches: forecastedBranches,
    totals: forecastedTotals,
  };
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

  const baseSummary = {
    fiscalYear,
    isCurrent,
    budget,
    branches: branchList,
    totals,
  };

  // Evaluate data quality
  const dataQuality = evaluateDataQuality(
    !!budget,
    financials.payments.length,
    financials.expenses.length,
    branches.length,
    financials.payments.length > 0 || financials.expenses.length > 0,
  );

  // Generate insights
  const insights = isCurrent
    ? generateInsights(baseSummary, financials.payments.length, financials.expenses.length)
    : [];

  return {
    ...baseSummary,
    dataQuality,
    insights,
    isForecasted: false,
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

  const [current, nextComputed] = await Promise.all([
    computeFiscalYearSummary(supabase, schoolId, currentYear),
    computeFiscalYearSummary(supabase, schoolId, nextYear),
  ]);

  // If next year doesn't have a budget, create a forecast
  let next = nextComputed;
  if (!nextComputed.budget && current.totals.actualIncome > 0) {
    const forecasted = createForecast(current, nextComputed);
    next = {
      ...forecasted,
      dataQuality: current.dataQuality === "low" ? "low" : "medium",
      insights: [
        `هذا توقع أولي للسنة ${nextYear} بناءً على البيانات الفعلية للسنة ${currentYear}.`,
        ...(current.insights.length > 0 ? current.insights.slice(0, 2) : []),
      ],
      isForecasted: true,
    };
  }

  return { current, next };
}
