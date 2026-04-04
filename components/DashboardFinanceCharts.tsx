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
        borderRadius: 12,
        padding: "0.75rem 1rem",
        fontSize: "0.75rem",
        boxShadow: "var(--shadow-md)",
        color: "var(--text-primary)"
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: "0.25rem" }}>{label}</div>
      <div style={{ fontWeight: 600, color: "var(--primary)" }}>د.ع {formatNumber(payload[0]?.value ?? 0)}</div>
    </div>
  );
}

export function DashboardFinanceCharts({
  barData,
  pieData,
  paidPct,
}: DashboardFinanceChartsProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
      <div style={{ 
        background: "var(--surface-soft)", 
        border: "1px solid var(--border)", 
        borderRadius: "16px", 
        padding: "1.25rem" 
      }}>
        <div style={{ fontSize: "0.875rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "1.25rem" }}>
          تحليل المبالغ المالية (دينار عراقي)
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 10, fill: "var(--text-tertiary)", fontWeight: 600 }} 
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: "var(--text-tertiary)", fontWeight: 600 }} 
              tickFormatter={(value: number) => `${(value / 1000000).toFixed(1)}M`} 
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--surface-hover)" }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={32}>
              {barData.map((entry, index) => (
                <Cell key={`${entry.name}-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ 
        background: "var(--surface-soft)", 
        border: "1px solid var(--border)", 
        borderRadius: "16px", 
        padding: "1.25rem" 
      }}>
        <div style={{ fontSize: "0.875rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "1.25rem" }}>
          توزيع حالة السداد
        </div>
        <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
          <span style={{ 
            padding: "0.25rem 0.75rem", 
            borderRadius: "999px", 
            background: "#10b98120", 
            color: "#10b981", 
            fontSize: "0.6875rem", 
            fontWeight: 800 
          }}>
            {paidPct}% تم تحصيله
          </span>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={75}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              stroke="none"
              paddingAngle={4}
            >
              {pieData.map((entry, index) => (
                <Cell key={`${entry.name}-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginLeft: "8px" }}>
                  {value}
                </span>
              )}
            />
            <Tooltip 
              contentStyle={{ borderRadius: 12, border: "1px solid var(--border-strong)", background: "var(--surface-strong)" }}
              itemStyle={{ fontSize: "0.75rem", fontWeight: 700 }}
              formatter={(value) => `د.ع ${formatNumber(Number(value))}`} 
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
