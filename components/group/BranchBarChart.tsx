"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, type TooltipProps } from "recharts";
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";

interface BranchData {
  name: string;
  collected: number;
  expenses: number;
}

export function BranchBarChart({ branches }: { branches: BranchData[] }) {
  const data = branches.map((b) => ({
    name: b.name,
    الإيرادات: b.collected,
    المصاريف: b.expenses,
  }));

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-5">
      <h3 className="font-bold text-[var(--text-primary)] mb-4">مقارنة الإيرادات والمصاريف</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} layout="vertical">
          <XAxis type="number" tickFormatter={(v: number) => v.toLocaleString("ar-IQ")} />
          <YAxis type="category" dataKey="name" width={100} />
          <Tooltip formatter={(v: ValueType | undefined) => (typeof v === "number" ? v.toLocaleString("ar-IQ") : String(v ?? "")) + " د.ع"} />
          <Legend />
          <Bar dataKey="الإيرادات" fill="#7C3AED" radius={[0, 4, 4, 0]} />
          <Bar dataKey="المصاريف" fill="#F43F5E" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
