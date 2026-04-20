"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type SchoolManagerChartPoint = {
  branchName: string;
  totalFeesAfterDiscount: number;
  totalPaid: number;
  totalRemaining: number;
  totalExpenses: number;
};

function formatCurrency(value: number) {
  return `${value.toLocaleString("ar-IQ")} د.ع`;
}

export function SchoolManagerComparisonChart({
  points,
}: {
  points: SchoolManagerChartPoint[];
}) {
  return (
    <div className="rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
      <div className="mb-5">
        <h2 className="text-2xl font-black text-[var(--text-primary)]">رسم بياني</h2>
        <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
          مقارنة مباشرة بين الرسوم بعد التخفيض، المبالغ المدفوعة، المبالغ المتبقية، والمصروفات لكل فرع.
        </p>
      </div>

      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} barGap={10}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="branchName" tickLine={false} axisLine={false} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => value.toLocaleString("ar-IQ")}
            />
            <Tooltip
              formatter={(value) =>
                typeof value === "number" ? formatCurrency(value) : String(value ?? "")
              }
              contentStyle={{
                borderRadius: 18,
                border: "1px solid var(--border)",
                background: "var(--surface)",
              }}
            />
            <Legend />
            <Bar dataKey="totalFeesAfterDiscount" name="الرسوم بعد التخفيض" fill="#2446e8" radius={[10, 10, 0, 0]} />
            <Bar dataKey="totalPaid" name="المبلغ المدفوع" fill="#00a871" radius={[10, 10, 0, 0]} />
            <Bar dataKey="totalRemaining" name="المبلغ المتبقي" fill="#f59e0b" radius={[10, 10, 0, 0]} />
            <Bar dataKey="totalExpenses" name="إجمالي المصروفات" fill="#ef4444" radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
