"use client";

import { formatNumber } from "@/lib/formatting";
import { cn } from "@/lib/brand/brand-utils";
import {
  TrendingUp,
  Briefcase,
  Users,
  HandCoins,
  Wallet,
  CalendarDays,
} from "@/lib/icons";

type ReportsMetrics = {
  netRevenue: number;
  netPayments: number;
  totalBalance: number;
  totalPaid: number;
  totalFees: number;
  expenseVolume: number;
  salaryVolume: number;

  salaryByMonth: Array<{ month: string; total: number }>;

  currentStudentsTotalFees: number;
  currentStudentsCollected: number;
  currentStudentsDiscounts: number;
  currentStudentsRemaining: number;

  transferredStudentsTotalFees: number;
  transferredStudentsCollected: number;
  transferredStudentsDiscounts: number;
  transferredStudentsRemaining: number;

  otherRevenueTotal: number;

  expensesByType: Array<{ name: string; total: number }>;
};

interface FinancialDashboardProps {
  metrics: ReportsMetrics;
  currency: string;
}

const MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

function formatMonth(month: string) {
  // month format: "2026-01"
  const parts = month.split("-");
  const monthIndex = parseInt(parts[1] ?? "0", 10) - 1;
  const monthName = MONTHS_AR[monthIndex] ?? month;
  return `${monthName} ${parts[0] ?? ""}`.trim();
}

const DONUT_COLORS = [
  "#8B5CF6", "#A78BFA", "#C4B5FD", "#DDD6FE", "#EDE9FE",
  "#7C3AED", "#6D28D9", "#5B21B6", "#4C1D95", "#9333EA",
];

export function FinancialDashboard({ metrics, currency }: FinancialDashboardProps) {
  // All revenue totals
  const allRevenueTotalFees = metrics.currentStudentsTotalFees + metrics.transferredStudentsTotalFees + metrics.otherRevenueTotal;
  const allRevenueCollected = metrics.currentStudentsCollected + metrics.transferredStudentsCollected + metrics.otherRevenueTotal;
  const allRevenueDiscounts = metrics.currentStudentsDiscounts + metrics.transferredStudentsDiscounts;
  const allRevenueRemaining = metrics.currentStudentsRemaining + metrics.transferredStudentsRemaining;

  // Collection rate
  const collectionRate = allRevenueTotalFees > 0
    ? Math.round((allRevenueCollected / allRevenueTotalFees) * 100)
    : 0;
  const availableBalance = allRevenueCollected - metrics.expenseVolume - metrics.salaryVolume;

  // Donut chart gradient
  const expenseTotal = metrics.expensesByType.reduce((sum, e) => sum + e.total, 0);
  let accumulated = 0;
  const conicStops = metrics.expensesByType.map((entry, i) => {
    const start = accumulated;
    accumulated += expenseTotal > 0 ? (entry.total / expenseTotal) * 360 : 0;
    return `${DONUT_COLORS[i % DONUT_COLORS.length]} ${start}deg ${accumulated}deg`;
  });
  const conicGradient = conicStops.length > 0
    ? `conic-gradient(${conicStops.join(", ")})`
    : `conic-gradient(#E5E7EB 0deg 360deg)`;

  return (
    <div className="space-y-6">
      {/* Section 1: Salaries by Month */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
            <Briefcase size={18} />
          </div>
          <h3 className="text-base font-black text-[var(--text-primary)]">الرواتب</h3>
        </div>
        {metrics.salaryByMonth.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {metrics.salaryByMonth.map((item) => (
              <div key={item.month} className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-[var(--primary)]/10 text-[var(--primary)] shrink-0">
                  <CalendarDays size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase text-[var(--text-muted)]">{formatMonth(item.month)}</p>
                  <p className="text-sm font-black text-[var(--text-primary)]">{currency} {formatNumber(item.total)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[var(--text-muted)] text-center py-3">لا توجد رواتب</p>
        )}
      </div>

      {/* Section 3: Revenue Breakdown */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
        <div className="flex items-center gap-2 mb-5">
          <div className="h-8 w-8 rounded-xl bg-[var(--success)]/10 flex items-center justify-center text-[var(--success)]">
            <HandCoins size={18} />
          </div>
          <h3 className="text-base font-black text-[var(--text-primary)]">الواردات</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* واردات الطلاب الحاليين */}
          <RevenueCard
            title="واردات الطلاب الحاليين"
            subtitle="واردات الطلاب الحاليين"
            icon={<Users size={20} />}
            iconBg="bg-blue-500"
            totalFees={metrics.currentStudentsTotalFees}
            collected={metrics.currentStudentsCollected}
            discounts={metrics.currentStudentsDiscounts}
            remaining={metrics.currentStudentsRemaining}
            currency={currency}
          />

          {/* واردات أخرى */}
          <RevenueCard
            title="واردات أخرى"
            subtitle="الواردات الأخرى"
            icon={<HandCoins size={20} />}
            iconBg="bg-emerald-500"
            totalFees={metrics.otherRevenueTotal}
            collected={metrics.otherRevenueTotal}
            discounts={0}
            remaining={0}
            currency={currency}
          />
        </div>
      </div>

      {/* Section 4: All Revenue Summary */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-base font-black text-[var(--text-primary)]">جميع الواردات</h3>
          <p className="text-xs text-[var(--text-muted)] font-bold">اجمالي جميع الواردات</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricItem label="المبالغ الكلية" value={allRevenueTotalFees} currency={currency} color="text-blue-600" />
          <MetricItem label="المبالغ المستحصلة" value={allRevenueCollected} currency={currency} color="text-emerald-600" />
          <MetricItem label="الخصومات الكلية" value={allRevenueDiscounts} currency={currency} color="text-violet-600" />
          <MetricItem label="الديون المتبقية" value={allRevenueRemaining} currency={currency} color="text-red-600" />
        </div>
      </div>

      {/* Section 5: Collection Rate */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-[var(--card-shadow)]">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-black text-[var(--text-primary)]">نسبة التحصيل</p>
          <p className="text-sm font-bold text-[var(--text-muted)]">الرصيد المتاح</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="h-4 rounded-full bg-[var(--surface-muted)] border border-[var(--border)] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-lime-400 transition-all duration-700"
                style={{ width: `${Math.min(collectionRate, 100)}%` }}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{collectionRate}%</span>
          <span className="text-sm font-black text-[var(--text-primary)]">{currency} {formatNumber(availableBalance)}</span>
        </div>
      </div>

      {/* Section 6: Expenses + Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* المصاريف */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-8 w-8 rounded-xl bg-[var(--danger)]/10 flex items-center justify-center text-[var(--danger)]">
              <Wallet size={18} />
            </div>
            <h3 className="text-base font-black text-[var(--text-primary)]">المصاريف</h3>
          </div>

          <div className="flex flex-col items-center gap-4">
            {/* Donut Chart */}
            <div className="relative">
              <div
                className="w-40 h-40 rounded-full"
                style={{ background: conicGradient }}
              />
              <div className="absolute inset-4 rounded-full bg-[var(--card-bg)] flex flex-col items-center justify-center">
                <p className="text-lg font-black text-[var(--primary)]">{currency} {formatNumber(expenseTotal)}</p>
                <p className="text-[10px] font-bold text-[var(--text-muted)]">اجمالي المصاريف</p>
              </div>
            </div>

            {/* Expense type list */}
            <div className="w-full space-y-2">
              {metrics.expensesByType.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }}
                    />
                    <span className="font-bold text-[var(--text-secondary)]">{item.name}</span>
                  </div>
                  <span className="font-black text-[var(--text-primary)]">{currency} {formatNumber(item.total)}</span>
                </div>
              ))}
              {metrics.expensesByType.length === 0 && (
                <p className="text-xs text-[var(--text-muted)] text-center py-3">لا توجد مصاريف</p>
              )}
            </div>
          </div>
        </div>

        {/* ملخص مالي */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-8 w-8 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
              <TrendingUp size={18} />
            </div>
            <h3 className="text-base font-black text-[var(--text-primary)]">ملخص مالي</h3>
          </div>

          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[var(--text-secondary)]">إجمالي الواردات</span>
              <span className="text-lg font-black text-blue-600">{currency} {formatNumber(allRevenueCollected)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[var(--text-secondary)]">إجمالي المصاريف</span>
              <span className="text-lg font-black text-red-500">{currency} {formatNumber(metrics.expenseVolume + metrics.salaryVolume)}</span>
            </div>
            <div className="border-t border-[var(--border)] pt-4 flex items-center justify-between">
              <span className="text-sm font-black text-[var(--text-primary)]">الرصيد الصافي</span>
              <span className="text-xl font-black text-emerald-600">{currency} {formatNumber(availableBalance)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Sub-components ---------- */

function RevenueCard({
  title,
  subtitle,
  icon,
  iconBg,
  totalFees,
  collected,
  discounts,
  remaining,
  currency,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  totalFees: number;
  collected: number;
  discounts: number;
  remaining: number;
  currency: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center text-white shrink-0", iconBg)}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-black text-[var(--text-primary)]">{title}</p>
          <p className="text-[10px] text-[var(--text-muted)] font-bold">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-2.5">
        {[
          { label: "المبالغ الكلية", value: totalFees, dotColor: "bg-blue-500" },
          { label: "المبالغ المستحصلة", value: collected, dotColor: "bg-emerald-500" },
          { label: "الخصومات الكلية", value: discounts, dotColor: "bg-violet-500" },
          { label: "الديون المتبقية", value: remaining, dotColor: "bg-red-500" },
        ].map((item, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full shrink-0", item.dotColor)} />
              <span className="text-xs font-bold text-[var(--text-secondary)]">{item.label}</span>
            </div>
            <span className="text-xs font-black text-[var(--text-primary)]">{currency} {formatNumber(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricItem({ label, value, currency, color }: { label: string; value: number; currency: string; color: string }) {
  return (
    <div className="text-center">
      <p className="text-xs font-bold text-[var(--text-muted)] mb-1">{label}</p>
      <p className={cn("text-base font-black", color)}>{currency} {formatNumber(value)}</p>
    </div>
  );
}
