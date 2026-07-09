"use client";

import { AlertTriangle, TrendingUp, Wallet, Clock } from "@/lib/icons";
import type { LucideIcon } from "@/lib/icons";
import type { DashboardTotals, DashboardOverdueStudent, MonthOverMonthChange, AttendanceSummary } from "./types";
import { EMPTY_MONTH_CHANGE, EMPTY_ATTENDANCE } from "./types";

interface AlertItem {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface DashboardAlertsProps {
  dashboardTotals: DashboardTotals;
  overdueStudents: DashboardOverdueStudent[];
  monthChange?: MonthOverMonthChange;
  attendanceSummary?: AttendanceSummary;
}

export function DashboardAlerts({ dashboardTotals, overdueStudents, monthChange = EMPTY_MONTH_CHANGE, attendanceSummary = EMPTY_ATTENDANCE }: DashboardAlertsProps) {
  const alerts: AlertItem[] = [];

  if (overdueStudents.length > 0) {
    alerts.push({
      icon: Clock,
      title: "مبالغ متبقية",
      description: `${overdueStudents.length} طالب لديهم مبالغ متبقية`,
      color: "#dc2626",
      bgColor: "#fef2f2",
      borderColor: "#fecaca",
    });
  }

  if (monthChange.incomeChange !== null && monthChange.incomeChange < 0) {
    alerts.push({
      icon: TrendingUp,
      title: "انخفاض في الدخل",
      description: `انخفض الدخل بنسبة ${Math.abs(monthChange.incomeChange).toFixed(1)}% عن الشهر الماضي`,
      color: "#d97706",
      bgColor: "#fffbeb",
      borderColor: "#fde68a",
    });
  }

  if (attendanceSummary.totalToday > 0 && attendanceSummary.attendancePct < 70) {
    alerts.push({
      icon: Wallet,
      title: "نسبة حضور منخفضة",
      description: `حضور اليوم ${attendanceSummary.attendancePct}% — ${attendanceSummary.absentCount} غائب`,
      color: "#7c3aed",
      bgColor: "#f5f3ff",
      borderColor: "#ddd6fe",
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={18} className="text-[var(--warning)]" />
        <h3 className="text-sm font-bold text-[var(--text-primary)]">التنبيهات</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {alerts.map((alert, i) => {
          const Icon = alert.icon;
          return (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl p-4 border"
              style={{ backgroundColor: alert.bgColor, borderColor: alert.borderColor }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: alert.color + "18", color: alert.color }}
              >
                <Icon size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold" style={{ color: alert.color }}>{alert.title}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{alert.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
