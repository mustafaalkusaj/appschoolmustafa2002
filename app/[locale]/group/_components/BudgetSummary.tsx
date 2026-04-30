"use client";

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
  if (value === 0) return "IQD 0";
  return `IQD ${value.toLocaleString("en-US")}`;
}

function RateBar({ value, color }: { value: number; color: string }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function BudgetMetricCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3.5 text-right border ${
        highlight
          ? "border-blue-100 bg-blue-50"
          : "border-transparent"
      }`}
      style={!highlight ? { background: "var(--surface-strong)" } : undefined}
    >
      <div className="text-[11px] font-semibold leading-tight" style={{ color: "var(--text-tertiary)" }}>{label}</div>
      <div
        className={`mt-1.5 text-sm font-black tabular-nums leading-tight ${
          highlight ? "text-blue-600" : ""
        }`}
        style={highlight ? undefined : { color: "var(--text-primary)" }}
      >
        {value}
      </div>
    </div>
  );
}

function EmptyBudgetYear({ label, year }: { label: string; year: number }) {
  return (
    <div className="rounded-xl border border-dashed px-6 py-8 text-center" style={{ background: "var(--surface-strong)", borderColor: "var(--border)" }}>
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl">
        📋
      </div>
      <div className="text-sm font-black" style={{ color: "var(--text-primary)" }}>
        {label} ({year})
      </div>
      <p className="mt-1.5 text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>لا توجد موازنة مسجلة لهذه السنة</p>
    </div>
  );
}

function BudgetYearSection({
  year,
  badge,
  badgeColor,
}: {
  year: FiscalYearSummary;
  badge: string;
  badgeColor: string;
}) {
  const { totals, branches, fiscalYear } = year;
  const yearLabel = year.isCurrent ? "السنة الحالية" : "السنة القادمة";

  return (
    <div className="space-y-3">
      {/* Year header */}
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded-xl px-3 py-1 text-[11px] font-black ${badgeColor}`}>{badge}</span>
        <div className="flex items-center gap-2">
          <h3 className="text-base font-black" style={{ color: "var(--text-primary)" }}>{yearLabel}</h3>
          <div className="w-5 h-5 flex items-center justify-center" style={{ color: "var(--text-tertiary)" }}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </div>

      {/* No budget */}
      {!year.budget ? (
        <EmptyBudgetYear label={yearLabel} year={fiscalYear} />
      ) : (
        <div className="space-y-2.5">
          {/* Main metrics grid */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <BudgetMetricCell label="الدخل المخطط" value={formatCurrency(totals.plannedIncome)} />
            <BudgetMetricCell label="الدخل الفعلي" value={formatCurrency(totals.actualIncome)} highlight />
            <BudgetMetricCell label="المصروفات المخططة" value={formatCurrency(totals.plannedExpense)} />
            <BudgetMetricCell label="المصروفات الفعلية" value={formatCurrency(totals.actualExpense)} />
          </div>

          {/* Surplus + rates */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <BudgetMetricCell label="الفائض المخطط" value={formatCurrency(totals.plannedSurplus)} />
            <BudgetMetricCell label="الفائض الفعلي" value={formatCurrency(totals.actualSurplus)} highlight />
            <div className="rounded-xl border border-transparent p-3.5 text-right" style={{ background: "var(--surface-strong)" }}>
              <div className="text-[11px] font-semibold" style={{ color: "var(--text-tertiary)" }}>نسبة تحقق الدخل</div>
              <div className="mt-1.5 text-sm font-black" style={{ color: "var(--text-primary)" }}>
                {totals.incomeCompletionRate.toFixed(1)}%
              </div>
              <RateBar value={totals.incomeCompletionRate} color="bg-emerald-500" />
            </div>
            <div className="rounded-xl border border-transparent p-3.5 text-right" style={{ background: "var(--surface-strong)" }}>
              <div className="text-[11px] font-semibold" style={{ color: "var(--text-tertiary)" }}>استهلاك المصروفات</div>
              <div className="mt-1.5 text-sm font-black" style={{ color: "var(--text-primary)" }}>
                {totals.expenseConsumptionRate.toFixed(1)}%
              </div>
              <RateBar value={totals.expenseConsumptionRate} color="bg-amber-400" />
            </div>
          </div>

          {/* Branch breakdown */}
          {branches.length > 0 && (
            <div className="rounded-xl border p-4" style={{ background: "var(--surface-strong)", borderColor: "var(--border)" }}>
              <div className="mb-3 text-[11px] font-black uppercase tracking-wide text-right" style={{ color: "var(--text-tertiary)" }}>
                تفصيل الفروع
              </div>
              <div className="space-y-2">
                {branches.map((branch) => (
                  <div
                    key={branch.branchId ?? "unassigned"}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5"
                    style={{ background: "var(--background)", borderColor: "var(--border)" }}
                  >
                    <div className="flex flex-wrap gap-3 text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                      <span>
                        مصروفات:{" "}
                        <span className="font-black" style={{ color: "var(--text-primary)" }}>
                          {formatCurrency(branch.actualExpense)}
                        </span>
                        {" / "}
                        {formatCurrency(branch.plannedExpense)}
                      </span>
                      <span>
                        دخل:{" "}
                        <span className="font-black" style={{ color: "var(--text-primary)" }}>
                          {formatCurrency(branch.actualIncome)}
                        </span>
                        {" / "}
                        {formatCurrency(branch.plannedIncome)}
                      </span>
                    </div>
                    <span className="text-xs font-black" style={{ color: "var(--text-primary)" }}>{branch.branchName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function BudgetSummary({ locale }: { locale: "ar" | "en" }) {
  const [response, setResponse] = useState<BudgetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchBudgets = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/web/dashboard/budgets", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: { message?: string };
          };
          throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as BudgetResponse;
        if (!cancelled) {
          if (data.ok) {
            setResponse(data);
          } else {
            setError("استجابة غير متوقعة من الخادم.");
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchBudgets();
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  const title = locale === "ar" ? "الموازنة السنوية" : "Annual Budget";

  // Loading state
  if (loading) {
    return (
      <section className="rounded-2xl border shadow-sm p-6" style={{ background: "var(--surface-strong)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2 mb-6">
          <h2 className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{title}</h2>
          <div className="w-5 h-5" style={{ color: "var(--text-tertiary)" }}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 20h16a2 2 0 002-2V8a2 2 0 00-2-2h-2.586a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 0012.586 3H9a2 2 0 00-2 2v1M4 20a2 2 0 01-2-2v-5a2 2 0 012-2h2" />
            </svg>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      </section>
    );
  }

  // Error state
  if (error || !response) {
    return (
      <section className="rounded-2xl border shadow-sm p-6" style={{ background: "var(--surface-strong)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2 mb-6">
          <h2 className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{title}</h2>
        </div>
        <div className="space-y-3">
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-center">
            <p className="text-sm font-semibold text-red-700">
              {locale === "ar" ? "تعذر تحميل بيانات الموازنة." : "Could not load budget data."}
            </p>
            {error && (
              <p className="mt-1 text-[11px] text-red-500 opacity-80">{error}</p>
            )}
          </div>
          <div className="flex justify-center">
            <button
              onClick={() => setRetryKey((k) => k + 1)}
              className="rounded-xl border px-5 py-2 text-sm font-black transition"
              style={{ borderColor: "var(--border)", background: "var(--surface-strong)", color: "var(--text-primary)" }}
            >
              {locale === "ar" ? "إعادة المحاولة" : "Retry"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border shadow-sm p-6" style={{ background: "var(--surface-strong)", borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{title}</h2>
        <div className="w-5 h-5" style={{ color: "var(--text-tertiary)" }}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 20h16a2 2 0 002-2V8a2 2 0 00-2-2h-2.586a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 0012.586 3H9a2 2 0 00-2 2v1M4 20a2 2 0 01-2-2v-5a2 2 0 012-2h2" />
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BudgetYearSection
          year={response.current}
          badge={locale === "ar" ? "هذه السنة" : "Current"}
          badgeColor="bg-blue-100 text-blue-700"
        />
        <div className="hidden md:block border-r" style={{ borderColor: "var(--border)" }} />
        <div className="md:hidden border-t" style={{ borderColor: "var(--border)" }} />
        <BudgetYearSection
          year={response.next}
          badge={locale === "ar" ? "السنة القادمة" : "Upcoming"}
          badgeColor="bg-amber-100 text-amber-700"
        />
      </div>
    </section>
  );
}
