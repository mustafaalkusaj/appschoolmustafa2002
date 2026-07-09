"use client";

import { formatNumber } from "@/lib/formatting";
import { Building2, TrendingUp, DollarSign, Users } from "@/lib/icons";
import type { DashboardTotals, ClassFee, MonthOverMonthChange } from "./types";
import { EMPTY_MONTH_CHANGE } from "./types";

interface DashboardInsightsProps {
  dashboardTotals: DashboardTotals;
  classFees: ClassFee[];
  monthChange?: MonthOverMonthChange;
  loading?: boolean;
}

export function DashboardInsights({ dashboardTotals, classFees, monthChange = EMPTY_MONTH_CHANGE, loading }: DashboardInsightsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 h-72 animate-pulse" />
        ))}
      </div>
    );
  }

  const collectionPct = dashboardTotals.paidPct;
  const latePct = dashboardTotals.remainingPct;
  const avgTransaction = dashboardTotals.studentsCount > 0
    ? Math.round(dashboardTotals.totalPaid / dashboardTotals.studentsCount)
    : 0;

  const topCollectionBranch = classFees
    .filter(cf => cf.stats)
    .sort((a, b) => b.stats!.paidPct - a.stats!.paidPct)[0];

  const topSubscriptionBranch = classFees
    .filter(cf => cf.stats)
    .sort((a, b) => b.stats!.count - a.stats!.count)[0];

  const bars = [
    { label: "نسبة التحصيل", value: collectionPct, color: "#10b981" },
    { label: "نسبة التأخر", value: latePct, color: "#ef4444" },
    { label: "نسبة الأقساط", value: Math.round((dashboardTotals.totalPaid / Math.max(dashboardTotals.afterDiscount, 1)) * 100), color: "#3b82f6" },
  ];

  const circumference = 2 * Math.PI * 70;
  const strokeDash = (collectionPct / 100) * circumference;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Performance Indicators */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-5">مؤشرات الأداء</h3>
        <div className="flex flex-col gap-4">
          {bars.map(bar => (
            <div key={bar.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-[var(--text-muted)]">{bar.label}</span>
                <span className="text-xs font-bold tabular-nums" style={{ color: bar.color }}>{bar.value}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-[var(--surface-soft)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${bar.value}%`, backgroundColor: bar.color }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 pt-4 border-t border-[var(--border)]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">نمو الدخل الشهري</span>
            {monthChange.incomeChange !== null ? (
              <span className={`text-xs font-bold ${monthChange.incomeChange >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {monthChange.incomeChange >= 0 ? "+" : ""}{monthChange.incomeChange.toFixed(1)}%
              </span>
            ) : (
              <span className="text-xs text-[var(--text-muted)]">—</span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Financial Summary */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-5">ملخص مالي سريع</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Building2, label: "أعلى فرع تحصيل", value: topCollectionBranch?.class_name ?? "—", color: "#10b981", bg: "#ecfdf5" },
            { icon: Users, label: "أعلى فرع اشتراك", value: topSubscriptionBranch?.class_name ?? "—", color: "#3b82f6", bg: "#eff6ff" },
            { icon: DollarSign, label: "متوسط المعاملة", value: `${formatNumber(avgTransaction)} IQD`, color: "#8b5cf6", bg: "#f3f0ff" },
            { icon: TrendingUp, label: "إجمالي الطلاب", value: `${formatNumber(dashboardTotals.studentsCount)}`, color: "#f59e0b", bg: "#fffbeb" },
          ].map(item => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-xl p-3 border border-[var(--border)] flex flex-col gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: item.bg, color: item.color }}>
                  <Icon size={16} />
                </div>
                <p className="text-[10px] text-[var(--text-muted)] leading-tight">{item.label}</p>
                <p className="text-xs font-bold text-[var(--text-primary)] truncate">{item.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Collection Rate Donut */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 flex flex-col items-center justify-center">
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 self-start">نسبة التحصيل</h3>
        <div className="relative w-44 h-44">
          <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
            <circle cx="80" cy="80" r="70" fill="none" stroke="var(--border)" strokeWidth="12" />
            <circle cx="80" cy="80" r="70" fill="none" stroke="#10b981" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${strokeDash} ${circumference}`} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-[var(--text-primary)] tabular-nums">{collectionPct}%</span>
            <span className="text-[10px] text-[var(--text-muted)]">نسبة التحصيل</span>
          </div>
        </div>
        <div className="flex gap-6 mt-4 text-[10px]">
          <div className="text-center">
            <p className="text-emerald-600 font-bold tabular-nums">{formatNumber(dashboardTotals.totalPaid)}</p>
            <p className="text-[var(--text-muted)]">مستلم</p>
          </div>
          <div className="text-center">
            <p className="text-red-500 font-bold tabular-nums">{formatNumber(dashboardTotals.totalRemaining)}</p>
            <p className="text-[var(--text-muted)]">متبقي</p>
          </div>
        </div>
      </div>
    </div>
  );
}
