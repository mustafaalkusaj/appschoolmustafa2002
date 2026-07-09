"use client";

import { formatNumber } from "@/lib/formatting";
import type { DashboardTotals, MonthOverMonthChange, AttendanceSummary } from "./types";
import { EMPTY_MONTH_CHANGE, EMPTY_ATTENDANCE } from "./types";
import { DollarSign, TrendingUp, Banknote, Wallet, Users } from "@/lib/icons";
import type { LucideIcon } from "@/lib/icons";

function formatChange(val: number | null): { text: string; type: "up" | "down" | "neutral" } {
  if (val === null) return { text: "", type: "neutral" };
  const sign = val >= 0 ? "+" : "";
  return {
    text: `${sign}${val.toFixed(1)}%`,
    type: val > 0 ? "up" : val < 0 ? "down" : "neutral",
  };
}

interface KPICardProps {
  label: string;
  value: string;
  subtitle?: string;
  change?: string;
  changeType?: "up" | "down" | "neutral";
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

function KPICard({ label, value, subtitle, change, changeType = "neutral", icon: Icon, color, bgColor }: KPICardProps) {
  const changeColor =
    changeType === "up" ? "text-emerald-600" :
    changeType === "down" ? "text-red-500" :
    "text-[var(--text-muted)]";

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 flex flex-col gap-3 hover:shadow-[var(--shadow-md)] transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--text-muted)]">{label}</span>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: bgColor, color }}
        >
          <Icon size={20} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-black text-[var(--text-primary)] tabular-nums leading-tight">
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>
        )}
      </div>
      {change && (
        <p className={`text-[11px] font-semibold ${changeColor}`}>
          {change}
          <span className="text-[var(--text-muted)] font-normal mx-1">عن الشهر الماضي</span>
        </p>
      )}
    </div>
  );
}

interface DashboardKPICardsProps {
  dashboardTotals: DashboardTotals;
  monthChange?: MonthOverMonthChange;
  attendanceSummary?: AttendanceSummary;
  loading?: boolean;
}

export function DashboardKPICards({ dashboardTotals, monthChange = EMPTY_MONTH_CHANGE, attendanceSummary = EMPTY_ATTENDANCE, loading }: DashboardKPICardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 h-32 animate-pulse">
            <div className="h-3 w-20 rounded bg-[var(--border)] mb-4" />
            <div className="h-7 w-28 rounded bg-[var(--border)] mb-2" />
            <div className="h-3 w-16 rounded bg-[var(--border)] mt-4" />
          </div>
        ))}
      </div>
    );
  }

  const paidChange = formatChange(monthChange.paidChange);
  const incomeChange = formatChange(monthChange.incomeChange);
  const remainingChange = formatChange(monthChange.remainingChange);
  const collectionChange = formatChange(monthChange.collectionChange);
  const studentsChange = formatChange(monthChange.studentsChange);

  const cards: KPICardProps[] = [
    {
      label: "نسبة التحصيل",
      value: `${dashboardTotals.paidPct}%`,
      subtitle: `${formatNumber(dashboardTotals.totalPaid)} من ${formatNumber(dashboardTotals.afterDiscount)}`,
      icon: DollarSign,
      color: "#8b5cf6",
      bgColor: "#f3f0ff",
      change: collectionChange.text || undefined,
      changeType: collectionChange.type,
    },
    {
      label: "إجمالي الدخل",
      value: `${formatNumber(Math.round(dashboardTotals.totalIncomes / 100000) / 10)} مليون IQD`,
      icon: TrendingUp,
      color: "#3b82f6",
      bgColor: "#eff6ff",
      change: incomeChange.text || undefined,
      changeType: incomeChange.type,
    },
    {
      label: "المبالغ المستلمة",
      value: `${formatNumber(Math.round(dashboardTotals.totalPaid / 100000) / 10)} مليون IQD`,
      icon: Banknote,
      color: "#10b981",
      bgColor: "#ecfdf5",
      change: paidChange.text || undefined,
      changeType: paidChange.type,
    },
    {
      label: "المبالغ المتبقية",
      value: `${formatNumber(Math.round(dashboardTotals.totalRemaining / 100000) / 10)} مليون IQD`,
      icon: Wallet,
      color: "#f59e0b",
      bgColor: "#fffbeb",
      change: remainingChange.text || undefined,
      changeType: remainingChange.type === "down" ? "up" : remainingChange.type === "up" ? "down" : "neutral",
    },
    {
      label: "إجمالي الطلاب",
      value: `${formatNumber(dashboardTotals.studentsCount)}`,
      subtitle: attendanceSummary.totalToday > 0 ? `حضور اليوم: ${attendanceSummary.attendancePct}%` : "طالب",
      icon: Users,
      color: "#6366f1",
      bgColor: "#eef2ff",
      change: studentsChange.text || undefined,
      changeType: studentsChange.type,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      {cards.map((card, i) => (
        <KPICard key={i} {...card} />
      ))}
    </div>
  );
}
