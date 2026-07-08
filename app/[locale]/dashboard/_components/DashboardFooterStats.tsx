"use client";

import { formatNumber } from "@/lib/formatting";
import type { DashboardTotals } from "./types";

interface DashboardFooterStatsProps {
  dashboardTotals: DashboardTotals;
}

export function DashboardFooterStats({ dashboardTotals }: DashboardFooterStatsProps) {
  const avgTransaction = dashboardTotals.studentsCount > 0
    ? Math.round(dashboardTotals.totalPaid / dashboardTotals.studentsCount)
    : 0;

  const items = [
    { label: "نسبة التحصيل", value: `${dashboardTotals.paidPct}%`, change: "+2.1%", up: true },
    { label: "المبالغ المستلمة", value: `${formatNumber(dashboardTotals.totalPaid)} IQD`, change: "+8.4%", up: true },
    { label: "المبالغ المتبقية", value: `${formatNumber(dashboardTotals.totalRemaining)} IQD`, change: "-15.2%", up: false },
    { label: "إجمالي الدخل", value: `${formatNumber(dashboardTotals.totalIncomes)} IQD`, change: "-12.5%", up: false },
    { label: "متوسط المعاملة", value: `${formatNumber(avgTransaction)} IQD`, change: "+6.8%", up: true },
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
