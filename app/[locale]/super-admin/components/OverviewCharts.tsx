"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface PlanDatum {
  name: string;
  value: number;
  fill: string;
}

interface RoleDatum {
  name: string;
  value: number;
}

interface SubscriptionHealthDatum {
  name: string;
  value: number;
  fill: string;
}

export function PlanDistributionChart({ data }: { data: PlanDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="name" axisLine={false} tickLine={false} stroke="var(--text-tertiary)" />
        <YAxis allowDecimals={false} axisLine={false} tickLine={false} stroke="var(--text-tertiary)" />
        <Tooltip
          cursor={{ fill: "rgba(79,140,255,0.06)" }}
          contentStyle={{
            borderRadius: 18,
            border: "1px solid var(--border)",
            background: "var(--surface-strong)",
            boxShadow: "var(--shadow-sm)",
          }}
        />
        <Bar dataKey="value" radius={[14, 14, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RoleDistributionChart({ data }: { data: RoleDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="roleArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#4F8CFF" stopOpacity={0.42} />
            <stop offset="100%" stopColor="#4F8CFF" stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="name" axisLine={false} tickLine={false} stroke="var(--text-tertiary)" />
        <YAxis allowDecimals={false} axisLine={false} tickLine={false} stroke="var(--text-tertiary)" />
        <Tooltip
          contentStyle={{
            borderRadius: 18,
            border: "1px solid var(--border)",
            background: "var(--surface-strong)",
            boxShadow: "var(--shadow-sm)",
          }}
        />
        <Area type="monotone" dataKey="value" stroke="#4F8CFF" fill="url(#roleArea)" strokeWidth={3} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SubscriptionHealthPieChart({
  data,
}: {
  data: SubscriptionHealthDatum[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={58}
          outerRadius={92}
          paddingAngle={4}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: 18,
            border: "1px solid var(--border)",
            background: "var(--surface-strong)",
            boxShadow: "var(--shadow-sm)",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
