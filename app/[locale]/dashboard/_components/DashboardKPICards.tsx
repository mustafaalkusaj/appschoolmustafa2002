"use client";

import { formatNumber } from "@/lib/formatting";
import { DashboardTotals } from "./types";
import { DollarSign, TrendingUp, Banknote, Wallet, Users } from "@/lib/icons";
import type { LucideIcon } from "@/lib/icons";

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
      <div className="h-8 w-full">
        <svg viewBox="0 0 120 32" className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`kpi-grad-${label.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.15" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline
            points="0,28 15,24 30,26 45,20 60,22 75,16 90,12 105,14 120,8"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polygon
            points="0,28 15,24 30,26 45,20 60,22 75,16 90,12 105,14 120,8 120,32 0,32"
            fill={`url(#kpi-grad-${label.replace(/\s/g, "")})`}
          />
        </svg>
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
  loading?: boolean;
}

export function DashboardKPICards({ dashboardTotals, loading }: DashboardKPICardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 h-40 animate-pulse">
            <div className="h-3 w-20 rounded bg-[var(--border)] mb-4" />
            <div className="h-7 w-28 rounded bg-[var(--border)] mb-2" />
            <div className="h-8 w-full rounded bg-[var(--border)] mt-4" />
          </div>
        ))}
      </div>
    );
  }

  const avgTransaction = dashboardTotals.studentsCount > 0
    ? Math.round(dashboardTotals.totalPaid / dashboardTotals.studentsCount)
    : 0;

  const cards: KPICardProps[] = [
    {
      label: "متوسط المعاملة",
      value: `${formatNumber(avgTransaction)} IQD`,
      icon: DollarSign,
      color: "#8b5cf6",
      bgColor: "#f3f0ff",
      change: "+6.8%",
      changeType: "up",
    },
    {
      label: "إجمالي الدخل",
      value: `${formatNumber(Math.round(dashboardTotals.totalIncomes / 100000) / 10)} مليون IQD`,
      icon: TrendingUp,
      color: "#3b82f6",
      bgColor: "#eff6ff",
      change: "-12.5%",
      changeType: "down",
    },
    {
      label: "المبالغ المستلمة",
      value: `${formatNumber(Math.round(dashboardTotals.totalPaid / 100000) / 10)} مليون IQD`,
      icon: Banknote,
      color: "#10b981",
      bgColor: "#ecfdf5",
      change: "+8.4%",
      changeType: "up",
    },
    {
      label: "المبالغ المتبقية",
      value: `${formatNumber(Math.round(dashboardTotals.totalRemaining / 100000) / 10)} مليون IQD`,
      icon: Wallet,
      color: "#f59e0b",
      bgColor: "#fffbeb",
      change: "-15.2%",
      changeType: "down",
    },
    {
      label: "إجمالي المعاملات",
      value: `${formatNumber(dashboardTotals.studentsCount)}`,
      subtitle: "معاملة",
      icon: Users,
      color: "#6366f1",
      bgColor: "#eef2ff",
      change: "+6.8%",
      changeType: "up",
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
