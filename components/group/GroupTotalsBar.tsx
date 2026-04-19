"use client";

interface Totals {
  students: number;
  collected: number;
  expenses: number;
  net: number;
}

function fmtIQD(n: number) {
  return n.toLocaleString("ar-IQ") + " د.ع";
}

export function GroupTotalsBar({ totals }: { totals: Totals }) {
  const items = [
    { label: "إجمالي الطلاب", value: totals.students.toLocaleString("ar-IQ"), color: "text-violet-600" },
    { label: "إجمالي الإيرادات", value: fmtIQD(totals.collected), color: "text-emerald-600" },
    { label: "إجمالي المصاريف", value: fmtIQD(totals.expenses), color: "text-rose-500" },
    { label: "الصافي الكلي", value: fmtIQD(totals.net), color: totals.net >= 0 ? "text-violet-700" : "text-rose-600" },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4 text-center">
          <p className="text-xs text-[var(--text-muted)] mb-1">{item.label}</p>
          <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}
