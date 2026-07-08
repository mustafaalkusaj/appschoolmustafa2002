"use client";

import { formatNumber } from "@/lib/formatting";
import { CheckCircle2 } from "@/lib/icons";
import type { DashboardRecentPayment } from "./types";

interface DashboardTransactionsProps {
  recentPayments: DashboardRecentPayment[];
  loading?: boolean;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("ar-IQ", { year: "numeric", month: "short", day: "numeric" });
}

export function DashboardTransactions({ recentPayments, loading }: DashboardTransactionsProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 h-64 animate-pulse" />
    );
  }

  const payments = recentPayments.slice(0, 10);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">المعاملات الأخيرة</h3>
        <button className="text-xs text-[var(--primary)] font-semibold hover:underline">عرض الكل</button>
      </div>
      {payments.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)] text-center py-8">لا توجد معاملات</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {["رقم المعاملة", "التاريخ", "الطالب", "الفرع", "الحالة", "المبلغ"].map(h => (
                  <th key={h} className="text-start py-2.5 px-2 font-semibold text-[var(--text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => (
                <tr key={p.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-soft)] transition-colors">
                  <td className="py-3 px-2 font-mono text-[var(--text-muted)]">#{String(i + 1).padStart(4, "0")}</td>
                  <td className="py-3 px-2 text-[var(--text-secondary)]">{formatDate(p.created_at)}</td>
                  <td className="py-3 px-2 font-semibold text-[var(--text-primary)]">{p.student_name ?? "—"}</td>
                  <td className="py-3 px-2 text-[var(--text-secondary)]">{p.class_name ?? "—"}</td>
                  <td className="py-3 px-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                      <CheckCircle2 size={10} />
                      مكتمل
                    </span>
                  </td>
                  <td className="py-3 px-2 tabular-nums font-bold text-emerald-600">{formatNumber(p.amount)} IQD</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
