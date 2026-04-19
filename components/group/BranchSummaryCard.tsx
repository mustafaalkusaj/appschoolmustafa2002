"use client";
import { Building2 } from "lucide-react";

interface BranchSummaryCardProps {
  name: string;
  students: number;
  collected: number;
  expenses: number;
  net: number;
}

function fmtIQD(n: number) {
  return n.toLocaleString("ar-IQ") + " د.ع";
}

export function BranchSummaryCard({ name, students, collected, expenses, net }: BranchSummaryCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
          <Building2 size={20} className="text-violet-600" />
        </div>
        <h3 className="font-bold text-[var(--text-primary)] text-base">{name}</h3>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">الطلاب</span>
          <span className="font-semibold text-[var(--text-primary)]">{students.toLocaleString("ar-IQ")}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">الإيرادات</span>
          <span className="font-semibold text-emerald-600">{fmtIQD(collected)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">المصاريف</span>
          <span className="font-semibold text-rose-500">{fmtIQD(expenses)}</span>
        </div>
        <div className="flex justify-between border-t border-[var(--border)] pt-2 mt-2">
          <span className="text-[var(--text-muted)] font-medium">الصافي</span>
          <span className={`font-bold text-base ${net >= 0 ? "text-violet-600" : "text-rose-600"}`}>{fmtIQD(net)}</span>
        </div>
      </div>
    </div>
  );
}
