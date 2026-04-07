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

import { formatNumber } from "@/lib/formatting";

interface BarDatum {
  name: string;
  value: number;
  fill: string;
}

interface PieDatum {
  name: string;
  value: number;
  color: string;
}

interface DashboardFinanceChartsProps {
  barData: BarDatum[];
  pieData: PieDatum[];
  paidPct: number;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        background: "var(--surface-strong)",
        border: "1px solid var(--border-strong)",
        borderRadius: 8,
        padding: ".6rem .9rem",
        fontSize: ".78rem",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        color: "var(--text-primary)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: ".2rem" }}>{label}</div>
      <div style={{ color: "var(--primary)" }}>د.ع {formatNumber(payload[0]?.value ?? 0)}</div>
    </div>
  );
}

export function DashboardFinanceCharts({
  barData,
  pieData,
  paidPct,
}: DashboardFinanceChartsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="content-card p-4">
        <div className="content-card__title mb-3">تفصيل المبالغ المالية</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={barData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: "Cairo" }} angle={-20} textAnchor="end" height={40} />
            <YAxis tick={{ fontSize: 10, fontFamily: "Cairo" }} tickFormatter={(value: number) => `${(value / 1000000).toFixed(1)}M`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {barData.map((entry, index) => (
                <Cell key={`${entry.name}-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="content-card p-4">
        <div className="content-card__title mb-3 text-sm font-bold text-[var(--text-primary)]">حالة الدفع</div>
        <div style={{ textAlign: "center", marginBottom: ".4rem" }}>
          <span className="paid-badge">{paidPct}% مدفوع</span>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={70}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              {pieData.map((entry, index) => (
                <Cell key={`${entry.name}-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) => <span style={{ fontSize: ".72rem", fontFamily: "Cairo" }}>{value}</span>}
            />
            <Tooltip formatter={(value: number) => `د.ع ${formatNumber(value)}`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
