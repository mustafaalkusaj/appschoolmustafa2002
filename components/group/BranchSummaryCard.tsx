"use client";
import { Building2, TrendingUp, TrendingDown } from "lucide-react";
import { useRouter } from "next/navigation";

interface BranchSummaryCardProps {
  id: string;
  name: string;
  students: number;
  collected: number;
  expenses: number;
  net: number;
  collectionRate: number;
  prevCollected: number;
  expected: number;
}

function fmtIQD(n: number) { return n.toLocaleString("ar-IQ-u-nu-latn") + " د.ع"; }

function RateBadge({ rate }: { rate: number }) {
  if (rate >= 90) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30">ممتاز</span>;
  if (rate >= 70) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30">جيد</span>;
  return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/30">يحتاج متابعة</span>;
}

export function BranchSummaryCard({ id, name, students, collected, expenses, net, collectionRate, prevCollected }: BranchSummaryCardProps) {
  const router = useRouter();
  const delta = collected - prevCollected;
  const isUp = delta >= 0;

  return (
    <div
      onClick={() => router.push(`/ar/dashboard?branch=${id}`)}
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-5 hover:border-violet-400 hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <Building2 size={20} className="text-violet-600" />
          </div>
          <h3 className="font-bold text-[var(--text-primary)]">{name}</h3>
        </div>
        <RateBadge rate={collectionRate} />
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">الطلاب</span>
          <span className="font-semibold">{students.toLocaleString("ar-IQ-u-nu-latn")}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[var(--text-muted)]">الإيرادات</span>
          <div className="flex items-center gap-2">
            {isUp
              ? <TrendingUp size={14} className="text-emerald-500" />
              : <TrendingDown size={14} className="text-rose-500" />}
            <span className="font-semibold text-emerald-600">{fmtIQD(collected)}</span>
          </div>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">المصاريف</span>
          <span className="font-semibold text-rose-500">{fmtIQD(expenses)}</span>
        </div>
        <div className="flex justify-between border-t border-[var(--border)] pt-2">
          <span className="font-medium text-[var(--text-muted)]">الصافي</span>
          <span className={`font-black text-base ${net >= 0 ? "text-violet-600" : "text-rose-600"}`}>{fmtIQD(net)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[var(--text-muted)]">نسبة التحصيل</span>
          <span className="font-bold">{collectionRate}%</span>
        </div>
      </div>
    </div>
  );
}
