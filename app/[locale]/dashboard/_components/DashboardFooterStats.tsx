"use client";

import { formatNumber } from "@/lib/formatting";
import type { DashboardTotals, MonthOverMonthChange } from "./types";
import { EMPTY_MONTH_CHANGE } from "./types";

function formatChange(val: number | null): { text: string; up: boolean } {
  if (val === null) return { text: "—", up: true };
  const sign = val >= 0 ? "+" : "";
  return { text: `${sign}${val.toFixed(1)}%`, up: val >= 0 };
}

interface DashboardFooterStatsProps {
  dashboardTotals: DashboardTotals;
  monthChange?: MonthOverMonthChange;
}

export function DashboardFooterStats({ dashboardTotals, monthChange = EMPTY_MONTH_CHANGE }: DashboardFooterStatsProps) {
  const avgTransaction = dashboardTotals.studentsCount > 0
    ? Math.round(dashboardTotals.totalPaid / dashboardTotals.studentsCount)
    : 0;

  const collection = formatChange(monthChange.collectionChange);
  const paid = formatChange(monthChange.paidChange);
  const remaining = formatChange(monthChange.remainingChange);
  const income = formatChange(monthChange.incomeChange);
  const students = formatChange(monthChange.studentsChange);

  const items = [
    { label: "نسبة التحصيل", value: `${dashboardTotals.paidPct}%`, ...collection },
    { label: "المبالغ المستلمة", value: `${formatNumber(dashboardTotals.totalPaid)} IQD`, ...paid },
    { label: "المبالغ المتبقية", value: `${formatNumber(dashboardTotals.totalRemaining)} IQD`, change: remaining.text, up: !remaining.up },
    { label: "إجمالي الدخل", value: `${formatNumber(dashboardTotals.totalIncomes)} IQD`, ...income },
    { label: "متوسط لكل طالب", value: `${formatNumber(avgTransaction)} IQD`, ...students },
  ];

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {items.map((item, i) => (
          <div key={i} className="flex flex-col gap-0.5 min-w-[120px]">
            <span className="text-[10px] text-[var(--text-muted)]">{item.label}</span>
            <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums">{item.value}</span>
            <span className={`text-[10px] font-semibold ${item.up ? "text-emerald-600" : "text-red-500"}`}>
              {item.change} <span className="text-[var(--text-muted)] font-normal">عن الشهر الماضي</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
