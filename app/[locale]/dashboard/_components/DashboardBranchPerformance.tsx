"use client";

import { formatNumber } from "@/lib/formatting";
import { ArrowUp, ArrowDown } from "@/lib/icons";
import type { DashboardTotals, BranchBreakdown, MonthlyDataPoint, TeacherSubjectCount } from "./types";

const MONTH_LABELS: Record<string, string> = {
  "01": "يناير", "02": "فبراير", "03": "مارس", "04": "أبريل",
  "05": "مايو", "06": "يونيو", "07": "يوليو", "08": "أغسطس",
  "09": "سبتمبر", "10": "أكتوبر", "11": "نوفمبر", "12": "ديسمبر",
};

function monthLabel(yyyymm: string): string {
  const mm = yyyymm.split("-")[1];
  return MONTH_LABELS[mm] ?? mm;
}

function buildChartPoints(data: MonthlyDataPoint[], key: "income" | "payments", w: number, h: number, maxVal: number): string {
  if (data.length === 0) return "";
  const step = data.length > 1 ? w / (data.length - 1) : w / 2;
  return data
    .map((d, i) => {
      const x = data.length === 1 ? w / 2 : i * step;
      const y = maxVal > 0 ? h - (d[key] / maxVal) * (h - 20) : h - 10;
      return `${x},${y}`;
    })
    .join(" ");
}

interface DashboardBranchPerformanceProps {
  branchBreakdown?: BranchBreakdown[];
  monthlyIncome?: MonthlyDataPoint[];
  teachersBySubject?: TeacherSubjectCount[];
  dashboardTotals: DashboardTotals;
  loading?: boolean;
}

export function DashboardBranchPerformance({
  branchBreakdown = [],
  monthlyIncome = [],
  teachersBySubject = [],
  dashboardTotals,
  loading,
}: DashboardBranchPerformanceProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 h-96 animate-pulse" />
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 h-96 animate-pulse" />
      </div>
    );
  }

  const totalRow = {
    totalFees: dashboardTotals.afterDiscount,
    totalPaid: dashboardTotals.totalPaid,
    totalRemaining: dashboardTotals.totalRemaining,
    paidPct: dashboardTotals.paidPct,
    studentsCount: dashboardTotals.studentsCount,
  };

  const chartW = 400;
  const chartH = 200;
  const maxVal = Math.max(...monthlyIncome.map(d => Math.max(d.income, d.payments)), 1);
  const incomePoints = buildChartPoints(monthlyIncome, "income", chartW, chartH, maxVal);
  const paymentsPoints = buildChartPoints(monthlyIncome, "payments", chartW, chartH, maxVal);
  const incomeArea = incomePoints ? `${incomePoints} ${chartW},${chartH} 0,${chartH}` : "";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Branch table */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">أداء الفروع</h3>
          {teachersBySubject.length > 0 && (
            <span className="text-[10px] text-[var(--text-muted)]">
              {teachersBySubject.reduce((s, t) => s + t.teacherCount, 0)} مدرس • {teachersBySubject.length} مادة
            </span>
          )}
        </div>

        {branchBreakdown.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] py-8 text-center">لا توجد بيانات فروع</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["الفرع", "الطلاب", "المدرسين", "المستلم", "المتبقي", "النسبة"].map(h => (
                    <th key={h} className="text-start py-2.5 px-2 font-semibold text-[var(--text-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {branchBreakdown.map(branch => (
                  <tr key={branch.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-soft)] transition-colors">
                    <td className="py-3 px-2 font-semibold text-[var(--text-primary)]">{branch.nameAr}</td>
                    <td className="py-3 px-2 tabular-nums text-[var(--text-secondary)]">{branch.studentsCount}</td>
                    <td className="py-3 px-2 tabular-nums text-[var(--text-secondary)]">{branch.teachersCount}</td>
                    <td className="py-3 px-2 tabular-nums text-emerald-600 font-semibold">{formatNumber(branch.totalPaid)}</td>
                    <td className="py-3 px-2 tabular-nums text-red-500 font-semibold">{formatNumber(branch.totalRemaining)}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1">
                        {branch.paidPct >= 50 ? <ArrowUp size={12} className="text-emerald-600" /> : <ArrowDown size={12} className="text-red-500" />}
                        <span className={`font-bold tabular-nums ${branch.paidPct >= 50 ? "text-emerald-600" : "text-red-500"}`}>{branch.paidPct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="bg-[var(--surface-soft)] font-bold">
                  <td className="py-3 px-2 text-[var(--text-primary)]">الإجمالي</td>
                  <td className="py-3 px-2 tabular-nums text-[var(--text-primary)]">{totalRow.studentsCount}</td>
                  <td className="py-3 px-2" />
                  <td className="py-3 px-2 tabular-nums text-emerald-600">{formatNumber(totalRow.totalPaid)}</td>
                  <td className="py-3 px-2 tabular-nums text-red-500">{formatNumber(totalRow.totalRemaining)}</td>
                  <td className="py-3 px-2 tabular-nums text-[var(--primary)]">{totalRow.paidPct}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Income chart */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">نظرة عامة على الدخل</h3>
          <span className="text-[10px] text-[var(--text-muted)]">آخر {monthlyIncome.length} أشهر</span>
        </div>
        <div className="flex items-center gap-4 mb-4 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> الدخل</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> المدفوعات</span>
        </div>

        {monthlyIncome.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] py-16 text-center">لا توجد بيانات شهرية</p>
        ) : (
          <>
            <div className="h-64">
              <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="income-area-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0, 50, 100, 150].map(y => (
                  <line key={y} x1="0" y1={y} x2={chartW} y2={y} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4,4" />
                ))}
                {incomePoints && (
                  <>
                    <polygon points={incomeArea} fill="url(#income-area-grad)" />
                    <polyline points={incomePoints} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                )}
                {paymentsPoints && (
                  <polyline points={paymentsPoints} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6,3" />
                )}
              </svg>
            </div>
            <div className="flex justify-between text-[9px] text-[var(--text-muted)] mt-2 px-1">
              {monthlyIncome.map(d => <span key={d.month}>{monthLabel(d.month)}</span>)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
