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

type Props = {
  points: SchoolManagerChartPoint[];
  totals: {
    totalFeesAfterDiscount: number;
    totalPaid: number;
    totalRemaining: number;
    totalExpenses: number;
    studentsCount: number;
    paidPercentage: number;
  };
};

const BLUE = "#3b82f6";
const GREEN = "#10b981";
const AMBER = "#f59e0b";
const RED = "#ef4444";
const PURPLE = "#8b5cf6";

function fmtCurrency(value: number) {
  return `${value.toLocaleString("en-US")} IQD`;
}

function fmtNum(value: number) {
  return value.toLocaleString("en-US");
}

export function SchoolManagerComparisonChart({ points, totals }: Props) {
  const remainingPercentage = totals.totalFeesAfterDiscount > 0
    ? Math.round(((totals.totalFeesAfterDiscount - totals.totalPaid) / totals.totalFeesAfterDiscount) * 100)
    : 0;

  const paidPct = Math.min(100, Math.max(0, totals.paidPercentage));
  const remPct = Math.min(100, Math.max(0, remainingPercentage));

  const pieData = [
    { name: "مدفوع", value: totals.totalPaid, color: GREEN },
    { name: "المتبقي", value: totals.totalRemaining, color: AMBER },
  ];

  const quadrantClass =
    "rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] p-4";

  return (
    <div className="rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
      <h2 className="mb-6 text-2xl font-black text-[var(--text-primary)]">لوحة التحليل المالي</h2>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Row 1 Left – Bar chart: تفصيل المبالغ المالية */}
        <div className={quadrantClass}>
          <h3 className="mb-3 text-sm font-black text-[var(--text-secondary)]">تفصيل المبالغ المالية</h3>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={points} barGap={4}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="branchName" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={fmtNum}
                  tick={{ fontSize: 10 }}
                  width={70}
                />
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
                <Bar dataKey="totalExpenses" name="إجمالي المصروفات" fill={RED} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 1 Right – Pie chart: حالة الدفع */}
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
                  outerRadius={90}
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

        {/* Row 2 Left – Donut chart: إحصائيات الدفع */}
        <div className={quadrantClass}>
          <h3 className="mb-3 text-sm font-black text-[var(--text-secondary)]">إحصائيات الدفع</h3>
          <div className="relative" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
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
            {/* Center label */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)]">الإجمالي</span>
              <span className="text-xs font-black text-[var(--text-primary)]">
                {fmtNum(totals.totalFeesAfterDiscount)}
              </span>
              <span className="text-[9px] text-[var(--text-tertiary)]">IQD</span>
            </div>
          </div>
        </div>

        {/* Row 2 Right – Progress bars: تقدم الدفع */}
        <div className={quadrantClass}>
          <h3 className="mb-4 text-sm font-black text-[var(--text-secondary)]">تقدم الدفع</h3>

          <div className="space-y-5">
            {/* Paid */}
            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-bold text-[var(--text-secondary)]">
                <span>{fmtCurrency(totals.totalPaid)}</span>
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

            {/* Remaining */}
            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-bold text-[var(--text-secondary)]">
                <span>{fmtCurrency(totals.totalRemaining)}</span>
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

            {/* Total */}
            <div className="mt-2 rounded-[16px] border border-[#8b5cf620] bg-[#8b5cf610] px-4 py-3 text-center">
              <div className="text-xs font-bold text-[var(--text-secondary)]">إجمالي المبلغ المطلوب</div>
              <div className="mt-1 text-xl font-black" style={{ color: PURPLE }}>
                {fmtCurrency(totals.totalFeesAfterDiscount)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
