"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useLanguage } from "@/hooks/useLanguage";
import { formatCurrency, formatNumber } from "@/lib/i18n";
import type { MonthlyMetric, TopSchoolMetric } from "@/lib/types";

interface ChartsGridProps {
  monthlyMetrics: MonthlyMetric[];
  topSchools: TopSchoolMetric[];
}

const colors = ["#0ea5e9", "#14b8a6", "#f97316", "#22c55e", "#ef4444"];

export function ChartsGrid({ monthlyMetrics, topSchools }: ChartsGridProps) {
  const { language, t } = useLanguage();

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <article className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-900/70">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {t.superAdmin.charts.schoolGrowthTrend}
        </h3>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t.superAdmin.charts.schoolGrowthTrendHint}</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyMetrics}>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.25)" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} tickFormatter={(value) => formatNumber(Number(value), language)} />
              <Tooltip formatter={(value) => formatNumber(Number(value), language)} />
              <Line
                type="monotone"
                dataKey="schools"
                stroke="#0ea5e9"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-900/70">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t.superAdmin.charts.monthlyRevenue}</h3>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t.superAdmin.charts.monthlyRevenueHint}</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyMetrics}>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.25)" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} tickFormatter={(value) => formatNumber(Number(value), language)} />
              <Tooltip formatter={(value) => formatCurrency(Number(value), language)} />
              <Bar dataKey="revenue" radius={[8, 8, 0, 0]} fill="#14b8a6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-900/70 xl:col-span-2">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t.superAdmin.charts.topPayingSchools}</h3>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t.superAdmin.charts.topPayingSchoolsHint}</p>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topSchools} layout="vertical" margin={language === "ar" ? { right: 20 } : { left: 20 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.25)" />
              <XAxis type="number" stroke="#64748b" fontSize={12} tickFormatter={(value) => formatNumber(Number(value), language)} />
              <YAxis type="category" dataKey="school" stroke="#64748b" fontSize={12} width={180} />
              <Tooltip formatter={(value) => formatCurrency(Number(value), language)} />
              <Bar dataKey="revenue" radius={[0, 8, 8, 0]}>
                {topSchools.map((school, index) => (
                  <Cell key={school.school} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
    </section>
  );
}
