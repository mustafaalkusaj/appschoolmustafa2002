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
  return value.toLocaleString("en-US") + " IQD";
}
function fmtNum(value: number) {
  return value.toLocaleString("en-US");
}

const CARD = "rounded-xl border border-gray-100 bg-gray-50 p-4";

export function SchoolManagerComparisonChart({ points, totals }: Props) {
  const remainingPercentage =
    totals.totalFeesAfterDiscount > 0
      ? Math.round(
          ((totals.totalFeesAfterDiscount - totals.totalPaid) /
            totals.totalFeesAfterDiscount) *
            100,
        )
      : 0;

  const paidPct = Math.min(100, Math.max(0, totals.paidPercentage));
  const remPct = Math.min(100, Math.max(0, remainingPercentage));

  const pieData = [
    { name: "مدفوع", value: totals.totalPaid, color: GREEN },
    { name: "المتبقي", value: totals.totalRemaining, color: AMBER },
  ];

  const tooltipStyle = {
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    fontSize: 12,
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
  };

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      {/* Section title */}
      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-lg font-black text-gray-800">لوحة التحليل المالي</h2>
        <div className="w-5 h-5 text-gray-400">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Bar chart: إجمالي المبيع حسب الفرع */}
        <div className={CARD}>
          <h3 className="mb-3 text-sm font-black text-gray-600 text-right">
            إجمالي المبالغ حسب الفرع
          </h3>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={points} barGap={4}>
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="branchName"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={fmtNum}
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  width={70}
                />
                <Tooltip
                  formatter={(value) =>
                    typeof value === "number" ? fmtCurrency(value) : String(value ?? "")
                  }
                  contentStyle={tooltipStyle}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="totalFeesAfterDiscount"
                  name="الرسوم بعد الخصم"
                  fill={BLUE}
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="totalPaid"
                  name="المبلغ المدفوع"
                  fill={GREEN}
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="totalRemaining"
                  name="المبلغ المتبقي"
                  fill={AMBER}
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="totalExpenses"
                  name="المصروفات"
                  fill={RED}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Progress bars: تقدم الدفع */}
        <div className={CARD}>
          <h3 className="mb-4 text-sm font-black text-gray-600 text-right">تقدم الدفع</h3>

          <div className="space-y-5">
            {/* Paid */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-gray-500">
                <span>{fmtCurrency(totals.totalPaid)}</span>
                <span>المبلغ المدفوع</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${paidPct}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] text-gray-400">{fmtNum(paidPct)}%</div>
            </div>

            {/* Remaining */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-gray-500">
                <span>{fmtCurrency(totals.totalRemaining)}</span>
                <span>المبلغ المتبقي</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all"
                  style={{ width: `${remPct}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] text-gray-400">{fmtNum(remPct)}%</div>
            </div>

            {/* Total required */}
            <div className="mt-3 rounded-xl border border-purple-100 bg-purple-50 px-4 py-3 text-right">
              <div className="text-xs font-bold text-gray-500">إجمالي المبلغ المطلوب</div>
              <div className="mt-1 text-xl font-black" style={{ color: PURPLE }}>
                {fmtCurrency(totals.totalFeesAfterDiscount)}
              </div>
            </div>
          </div>
        </div>

        {/* Donut chart: إحصائيات الدفع */}
        <div className={CARD}>
          <h3 className="mb-3 text-sm font-black text-gray-600 text-right">إحصائيات الدفع</h3>
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
                  contentStyle={tooltipStyle}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold text-gray-400">الإجمالي</span>
              <span className="text-xs font-black text-gray-900">
                {fmtNum(totals.totalFeesAfterDiscount)}
              </span>
              <span className="text-[9px] text-gray-400">IQD</span>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className={CARD}>
          <h3 className="mb-4 text-sm font-black text-gray-600 text-right">إحصائيات سريعة</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm font-black text-gray-900">
                {fmtNum(points.length)}
              </span>
              <span className="text-xs text-gray-500">إجمالي الفروع</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm font-black text-gray-900">
                {fmtNum(totals.studentsCount)}
              </span>
              <span className="text-xs text-gray-500">إجمالي الطلاب</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm font-black text-gray-900">
                {fmtCurrency(totals.totalFeesAfterDiscount)}
              </span>
              <span className="text-xs text-gray-500">الرسوم بعد الخصم</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 rounded-full bg-emerald-500"
                  style={{ width: `${Math.max(4, paidPct * 0.6)}px` }}
                />
                <span className="text-sm font-black text-emerald-600">{fmtNum(paidPct)}%</span>
              </div>
              <span className="text-xs text-gray-500">نسبة السداد</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
