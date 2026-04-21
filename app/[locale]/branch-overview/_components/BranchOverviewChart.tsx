"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type BranchChartProps = {
  totalFeesAfterDiscount: number;
  totalPaid: number;
  totalRemaining: number;
  totalExpenses: number;
  paidPercentage: number;
};

const BLUE = "#3b82f6";
const GREEN = "#10b981";
const AMBER = "#f59e0b";
const RED = "#ef4444";

function fmtCurrency(value: number) {
  return `${value.toLocaleString("en-US")} IQD`;
}

function fmtNum(value: number) {
  return value.toLocaleString("en-US");
}

export function BranchOverviewChart({
  totalFeesAfterDiscount,
  totalPaid,
  totalRemaining,
  totalExpenses,
  paidPercentage,
}: BranchChartProps) {
  const barData = [
    {
      name: "الفرع",
      totalFeesAfterDiscount,
      totalPaid,
      totalRemaining,
      totalExpenses,
    },
  ];

  const pieData = [
    { name: "مدفوع", value: totalPaid, color: GREEN },
    { name: "المتبقي", value: totalRemaining, color: AMBER },
  ];

  const paidPct = Math.min(100, Math.max(0, paidPercentage));
  const remPct = Math.min(100, Math.max(0, 100 - paidPct));

  const quadrantClass =
    "rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] p-4";

  return (
    <div className="rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
      <h2 className="mb-6 text-xl font-black text-[var(--text-primary)]">التحليل المالي للفرع</h2>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Bar chart */}
        <div className={quadrantClass}>
          <h3 className="mb-3 text-sm font-black text-[var(--text-secondary)]">توزيع المبالغ</h3>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barGap={4}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
                <Tooltip
                  formatter={(value) =>
                    typeof value === "number" ? fmtCurrency(value) : String(value ?? "")
                  }
                  contentStyle={{
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="totalFeesAfterDiscount" name="الرسوم بعد التخفيض" fill={BLUE} radius={[6, 6, 0, 0]} />
                <Bar dataKey="totalPaid" name="المبلغ المدفوع" fill={GREEN} radius={[6, 6, 0, 0]} />
                <Bar dataKey="totalRemaining" name="المبلغ المتبقي" fill={AMBER} radius={[6, 6, 0, 0]} />
                <Bar dataKey="totalExpenses" name="المصروفات" fill={RED} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie chart */}
        <div className={quadrantClass}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-black text-[var(--text-secondary)]">حالة الدفع</h3>
            <span className="rounded-full bg-[#10b98120] px-3 py-1 text-xs font-black text-[#065f46]">
              {fmtNum(paidPct)}% مدفوع
            </span>
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) =>
                    typeof value === "number" ? fmtCurrency(value) : String(value ?? "")
                  }
                  contentStyle={{
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Progress bars */}
        <div className={`${quadrantClass} md:col-span-2`}>
          <h3 className="mb-4 text-sm font-black text-[var(--text-secondary)]">تقدم السداد</h3>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-bold text-[var(--text-secondary)]">
                <span>{fmtCurrency(totalPaid)}</span>
                <span>المبلغ المدفوع</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--border)]">
                <div
                  className="h-full rounded-full bg-[#10b981] transition-all"
                  style={{ width: `${paidPct}%` }}
                />
              </div>
              <div className="mt-1 text-left text-[10px] text-[var(--text-tertiary)]">{fmtNum(paidPct)}%</div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-bold text-[var(--text-secondary)]">
                <span>{fmtCurrency(totalRemaining)}</span>
                <span>المبلغ المتبقي</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--border)]">
                <div
                  className="h-full rounded-full bg-[#f59e0b] transition-all"
                  style={{ width: `${remPct}%` }}
                />
              </div>
              <div className="mt-1 text-left text-[10px] text-[var(--text-tertiary)]">{fmtNum(remPct)}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
