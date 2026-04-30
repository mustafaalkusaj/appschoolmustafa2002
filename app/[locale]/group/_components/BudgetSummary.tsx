"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FiscalYearSummary } from "@/lib/school-manager/budget-summary";

interface BudgetResponse {
  ok: boolean;
  current: FiscalYearSummary;
  next: FiscalYearSummary;
  currentYear: number;
  nextYear: number;
}

function formatCurrency(value: number) {
  return `${value.toLocaleString("en-US")} IQD`;
}

function BudgetYearTab({
  year: { fiscalYear, isCurrent, budget, branches, totals },
  locale,
  nextYear,
}: {
  year: FiscalYearSummary;
  locale: "ar" | "en";
  nextYear: number;
}) {
  const router = useRouter();
  const isNextYear = fiscalYear === nextYear;
  const hasActualData = totals.actualIncome > 0 || totals.actualExpense > 0;

  const handleCreateBudget = () => {
    router.push(`/budgets/new?year=${fiscalYear}`);
  };

  if (!budget) {
    return (
      <div className="space-y-4">
        <div className="rounded-[24px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--info)_10%,transparent)] px-6 py-4 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            {isCurrent
              ? locale === "ar"
                ? "لم يتم إنشاء موازنة لهذه السنة بعد."
                : "No budget has been created for this year yet."
              : locale === "ar"
                ? "لم يتم إنشاء موازنة للسنة القادمة بعد."
                : "No budget has been created for next year yet."}
          </p>
        </div>
        <div className="flex justify-center">
          <button
            onClick={handleCreateBudget}
            className="rounded-[18px] bg-blue-500 px-6 py-2 font-black text-white hover:bg-blue-600"
          >
            {isCurrent
              ? locale === "ar"
                ? "إنشاء موازنة لهذه السنة"
                : "Create Budget for This Year"
              : locale === "ar"
                ? "إنشاء موازنة للسنة القادمة"
                : "Create Budget for Next Year"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isNextYear && !hasActualData && (
        <div className="rounded-[18px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] px-4 py-3 text-center text-xs text-[var(--text-secondary)]">
          {locale === "ar"
            ? "لا توجد بيانات فعلية للسنة القادمة بعد."
            : "No actual data available for next year yet."}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
          <div className="text-xs font-black text-[var(--text-secondary)]">
            {locale === "ar" ? "الدخل المخطط" : "Planned Income"}
          </div>
          <div className="mt-2 text-lg font-black text-[var(--text-primary)]">
            {formatCurrency(totals.plannedIncome)}
          </div>
        </div>
        <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
          <div className="text-xs font-black text-[var(--text-secondary)]">
            {locale === "ar" ? "الدخل الفعلي" : "Actual Income"}
          </div>
          <div className="mt-2 text-lg font-black text-[var(--text-primary)]">
            {formatCurrency(totals.actualIncome)}
          </div>
        </div>
        <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
          <div className="text-xs font-black text-[var(--text-secondary)]">
            {locale === "ar" ? "المصروفات المخطط" : "Planned Expenses"}
          </div>
          <div className="mt-2 text-lg font-black text-[var(--text-primary)]">
            {formatCurrency(totals.plannedExpense)}
          </div>
        </div>
        <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
          <div className="text-xs font-black text-[var(--text-secondary)]">
            {locale === "ar" ? "المصروفات الفعلية" : "Actual Expenses"}
          </div>
          <div className="mt-2 text-lg font-black text-[var(--text-primary)]">
            {formatCurrency(totals.actualExpense)}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
          <div className="text-xs font-black text-[var(--text-secondary)]">
            {locale === "ar" ? "الفائض المخطط" : "Planned Surplus"}
          </div>
          <div className="mt-2 text-lg font-black text-[var(--text-primary)]">
            {formatCurrency(totals.plannedSurplus)}
          </div>
        </div>
        <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
          <div className="text-xs font-black text-[var(--text-secondary)]">
            {locale === "ar" ? "الفائض الفعلي" : "Actual Surplus"}
          </div>
          <div className="mt-2 text-lg font-black text-[var(--text-primary)]">
            {formatCurrency(totals.actualSurplus)}
          </div>
        </div>
        <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
          <div className="text-xs font-black text-[var(--text-secondary)]">
            {locale === "ar" ? "نسبة تحقق الدخل" : "Income Completion Rate"}
          </div>
          <div className="mt-2 text-lg font-black text-[var(--text-primary)]">
            {totals.incomeCompletionRate.toFixed(1)}%
          </div>
        </div>
        <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
          <div className="text-xs font-black text-[var(--text-secondary)]">
            {locale === "ar" ? "نسبة استهلاك المصروفات" : "Expense Consumption Rate"}
          </div>
          <div className="mt-2 text-lg font-black text-[var(--text-primary)]">
            {totals.expenseConsumptionRate.toFixed(1)}%
          </div>
        </div>
      </div>

      {branches.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-black text-[var(--text-primary)]">
            {locale === "ar" ? "تفصيل الفروع" : "Branch Details"}
          </h4>
          <div className="space-y-2">
            {branches.map((branch) => (
              <div key={branch.branchId || "unassigned"} className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                <div className="font-bold text-[var(--text-primary)]">{branch.branchName}</div>
                <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                  <div>
                    <span className="text-[var(--text-secondary)]">
                      {locale === "ar" ? "دخل: " : "Income: "}
                    </span>
                    <span className="font-bold">
                      {formatCurrency(branch.actualIncome)} / {formatCurrency(branch.plannedIncome)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--text-secondary)]">
                      {locale === "ar" ? "مصروفات: " : "Expenses: "}
                    </span>
                    <span className="font-bold">
                      {formatCurrency(branch.actualExpense)} / {formatCurrency(branch.plannedExpense)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function BudgetSummary({ locale }: { locale: "ar" | "en" }) {
  const [response, setResponse] = useState<BudgetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        const res = await fetch("/api/web/dashboard/budgets");
        if (!res.ok) {
          throw new Error("Failed to fetch budgets");
        }
        const data = (await res.json()) as BudgetResponse;
        if (data.ok) {
          setResponse(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchBudgets();
  }, []);

  if (loading) {
    return (
      <section className="rounded-[34px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
        <div className="text-center">
          <h2 className="text-2xl font-black text-[var(--text-primary)]">
            {locale === "ar" ? "الموازنة السنوية" : "Annual Budget"}
          </h2>
        </div>
        <div className="mt-6 text-center text-[var(--text-secondary)]">
          {locale === "ar" ? "جاري التحميل..." : "Loading..."}
        </div>
      </section>
    );
  }

  if (error || !response) {
    return (
      <section className="rounded-[34px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
        <div className="text-center">
          <h2 className="text-2xl font-black text-[var(--text-primary)]">
            {locale === "ar" ? "الموازنة السنوية" : "Annual Budget"}
          </h2>
        </div>
        <div className="mt-6 rounded-[24px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-6 py-4 text-center text-sm text-[var(--text-secondary)]">
          {locale === "ar" ? "حدث خطأ في تحميل الموازنات." : "Error loading budgets."}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[34px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
      <div className="text-center">
        <h2 className="text-2xl font-black text-[var(--text-primary)]">
          {locale === "ar" ? "الموازنة السنوية" : "Annual Budget"}
        </h2>
      </div>

      <div className="mt-6 space-y-8">
        <div key="current">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-black text-[var(--text-primary)]">
              {locale === "ar" ? "السنة الحالية" : "Current Year"} ({response.currentYear})
            </h3>
            <span className="inline-block rounded-[12px] bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">
              {locale === "ar" ? "هذه السنة" : "Current"}
            </span>
          </div>
          <BudgetYearTab
            year={response.current}
            locale={locale}
            nextYear={response.nextYear}
          />
        </div>

        <div key="next">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-black text-[var(--text-primary)]">
              {locale === "ar" ? "السنة القادمة" : "Next Year"} ({response.nextYear})
            </h3>
            <span className="inline-block rounded-[12px] bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
              {locale === "ar" ? "قادمة" : "Upcoming"}
            </span>
          </div>
          <BudgetYearTab
            year={response.next}
            locale={locale}
            nextYear={response.nextYear}
          />
        </div>
      </div>
    </section>
  );
}
