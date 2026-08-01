"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { formatNumber } from "@/lib/formatting";
import { getLocaleFromPath, localizeAppPath } from "@/lib/locale-routing";
import type { DashboardOverdueStudent, ClassFee } from "./types";

const DONUT_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899"];

interface DashboardOverdueNewProps {
  overdueStudents: DashboardOverdueStudent[];
  classFees: ClassFee[];
  loading?: boolean;
}

export function DashboardOverdueNew({ overdueStudents, classFees, loading }: DashboardOverdueNewProps) {
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 h-80 animate-pulse" />
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 h-80 animate-pulse" />
      </div>
    );
  }

  const topOverdue = overdueStudents.slice(0, 8);

  const branchIncome = classFees
    .filter(cf => cf.stats && cf.stats.totalPaid > 0)
    .map((cf, i) => ({
      name: cf.class_name,
      value: cf.stats!.totalPaid,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
    }));

  const totalIncome = branchIncome.reduce((s, b) => s + b.value, 0);

  const r = 70;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const arcs = branchIncome.map(b => {
    const pct = totalIncome > 0 ? b.value / totalIncome : 0;
    const dash = pct * circumference;
    const arc = { ...b, pct, dash, offset };
    offset += dash;
    return arc;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">أعلى الطلاب المتأخرين</h3>
          <Link
            href={localizeAppPath("/payments", getLocaleFromPath(pathname))}
            className="text-xs text-[var(--primary)] font-semibold hover:underline"
          >
            عرض الكل
          </Link>
        </div>
        {topOverdue.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] text-center py-8">لا يوجد طلاب متأخرين</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["الطالب", "الفرع", "المبلغ المتأخر"].map(h => (
                    <th key={h} className="text-start py-2.5 px-2 font-semibold text-[var(--text-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topOverdue.map(s => (
                  <tr key={s.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-soft)] transition-colors">
                    <td className="py-3 px-2 font-semibold text-[var(--text-primary)]">{s.full_name ?? "—"}</td>
                    <td className="py-3 px-2 text-[var(--text-secondary)]">{s.class_name ?? "—"}</td>
                    <td className="py-3 px-2 tabular-nums text-red-500 font-bold">{formatNumber(s.remaining_fee)} IQD</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-5">توزيع الدخل حسب الفروع</h3>
        <div className="flex items-center gap-6">
          <div className="relative w-40 h-40 flex-shrink-0">
            <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
              {arcs.length === 0 ? (
                <circle cx="80" cy="80" r={r} fill="none" stroke="var(--border)" strokeWidth="14" />
              ) : (
                arcs.map((arc, i) => (
                  <circle
                    key={i}
                    cx="80" cy="80" r={r}
                    fill="none"
                    stroke={arc.color}
                    strokeWidth="14"
                    strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
                    strokeDashoffset={-arc.offset}
                    strokeLinecap="butt"
                  />
                ))
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-black text-[var(--text-primary)] tabular-nums">{formatNumber(totalIncome)}</span>
              <span className="text-[9px] text-[var(--text-muted)]">إجمالي</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 min-w-0 flex-1">
            {arcs.map((arc, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: arc.color }} />
                <span className="text-[11px] text-[var(--text-secondary)] truncate flex-1">{arc.name}</span>
                <span className="text-[11px] font-bold tabular-nums text-[var(--text-primary)]">{Math.round(arc.pct * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
