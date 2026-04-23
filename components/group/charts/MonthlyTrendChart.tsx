"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";

export function MonthlyTrendChart({ trend }: { trend: { month: string; collected: number }[] }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-5">
      <h3 className="font-bold text-[var(--text-primary)] mb-4">الاتجاه الشهري للإيرادات (آخر 6 أشهر)</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={trend}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v: number) => (v / 1_000_000).toFixed(1) + "M"} />
          <Tooltip formatter={(v: ValueType | undefined) => (typeof v === "number" ? v.toLocaleString("ar-IQ") : String(v ?? "")) + " د.ع"} />
          <Line type="monotone" dataKey="collected" stroke="#7C3AED" strokeWidth={2} dot={{ r: 4 }} name="الإيرادات" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
