"use client";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { PieLabelRenderProps } from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";

const COLORS = ["#7C3AED","#6D28D9","#8B5CF6","#A78BFA","#C4B5FD","#DDD6FE","#EDE9FE","#F5F3FF"];

export function StudentDistributionChart({ branches }: { branches: { name: string; students: number }[] }) {
  const data = branches.map((b) => ({ name: b.name, value: b.students }));
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-5">
      <h3 className="font-bold text-[var(--text-primary)] mb-4">توزيع الطلاب بالفروع</h3>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(props: PieLabelRenderProps) => `${props.name ?? ""} ${Math.round(((props.percent ?? 0)) * 100)}%`}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v: ValueType | undefined) => (typeof v === "number" ? v.toLocaleString("ar-IQ") : String(v ?? ""))} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
