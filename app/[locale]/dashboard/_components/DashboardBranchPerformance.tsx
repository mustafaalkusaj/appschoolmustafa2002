"use client";

import { formatNumber } from "@/lib/formatting";
import { ArrowUp, ArrowDown } from "@/lib/icons";
import type { ClassFee, DashboardTotals } from "./types";

interface DashboardBranchPerformanceProps {
  classFees: ClassFee[];
  dashboardTotals: DashboardTotals;
  loading?: boolean;
}

export function DashboardBranchPerformance({ classFees, dashboardTotals, loading }: DashboardBranchPerformanceProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 h-96 animate-pulse" />
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 h-96 animate-pulse" />
      </div>
    );
  }

  const rows = classFees
    .filter(cf => cf.stats)
    .map(cf => ({
      name: cf.class_name,
      totalIncome: cf.stats!.totalExpected,
      received: cf.stats!.totalPaid,
      remaining: cf.stats!.totalRemaining,
      paidPct: cf.stats!.paidPct,
      students: cf.stats!.count,
      transactions: cf.stats!.activeCount,
    }));

  const totalRow = {
    totalIncome: dashboardTotals.afterDiscount,
    received: dashboardTotals.totalPaid,
    remaining: dashboardTotals.totalRemaining,
    paidPct: dashboardTotals.paidPct,
    students: dashboardTotals.studentsCount,
  };

  const months = ["أكتوبر", "نوفمبر", "ديسمبر", "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">أداء الفروع</h3>
          <button className="text-xs text-[var(--primary)] font-semibold hover:underline">عرض الكل</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {["الفرع", "إجمالي الدخل", "المستلم", "المتبقي", "النسبة", "المعاملات", "الطلاب"].map(h => (
                  <th key={h} className="text-start py-2.5 px-2 font-semibold text-[var(--text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-soft)] transition-colors">
                  <td className="py-3 px-2 font-semibold text-[var(--text-primary)]">{row.name}</td>
                  <td className="py-3 px-2 tabular-nums text-[var(--text-secondary)]">{formatNumber(row.totalIncome)}</td>
                  <td className="py-3 px-2 tabular-nums text-emerald-600 font-semibold">{formatNumber(row.received)}</td>
                  <td className="py-3 px-2 tabular-nums text-red-500 font-semibold">{formatNumber(row.remaining)}</td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-1">
                      {row.paidPct >= 50 ? <ArrowUp size={12} className="text-emerald-600" /> : <ArrowDown size={12} className="text-red-500" />}
                      <span className={`font-bold tabular-nums ${row.paidPct >= 50 ? "text-emerald-600" : "text-red-500"}`}>{row.paidPct}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 tabular-nums text-[var(--text-secondary)]">{row.transactions}</td>
                  <td className="py-3 px-2 tabular-nums text-[var(--text-secondary)]">{row.students}</td>
                </tr>
              ))}
              <tr className="bg-[var(--surface-soft)] font-bold">
                <td className="py-3 px-2 text-[var(--text-primary)]">الإجمالي</td>
                <td className="py-3 px-2 tabular-nums text-[var(--text-primary)]">{formatNumber(totalRow.totalIncome)}</td>
                <td className="py-3 px-2 tabular-nums text-emerald-600">{formatNumber(totalRow.received)}</td>
                <td className="py-3 px-2 tabular-nums text-red-500">{formatNumber(totalRow.remaining)}</td>
                <td className="py-3 px-2 tabular-nums text-[var(--primary)]">{totalRow.paidPct}%</td>
                <td className="py-3 px-2" />
                <td className="py-3 px-2 tabular-nums text-[var(--text-primary)]">{totalRow.students}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">نظرة عامة على الدخل</h3>
          <select className="text-xs border border-[var(--border)] rounded-lg px-2 py-1 bg-[var(--card-bg)] text-[var(--text-secondary)]">
            <option>آخر 12 شهر</option>
          </select>
        </div>
        <div className="flex items-center gap-4 mb-4 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> المبالغ المدفوعة</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> المبالغ المستلمة</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> المعاملات</span>
        </div>
        <div className="h-64">
          <svg viewBox="0 0 400 200" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="income-area-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 50, 100, 150].map(y => (
              <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4,4" />
            ))}
            <polyline points="0,180 33,170 66,160 100,140 133,130 166,100 200,80 233,60 266,90 300,110 333,130 366,120" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <polygon points="0,180 33,170 66,160 100,140 133,130 166,100 200,80 233,60 266,90 300,110 333,130 366,120 366,200 0,200" fill="url(#income-area-grad)" />
            <polyline points="0,185 33,180 66,175 100,165 133,155 166,130 200,110 233,100 266,120 300,140 333,150 366,145" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6,3" />
          </svg>
        </div>
        <div className="flex justify-between text-[9px] text-[var(--text-muted)] mt-2 px-1">
          {months.map(m => <span key={m}>{m}</span>)}
        </div>
      </div>
    </div>
  );
}
