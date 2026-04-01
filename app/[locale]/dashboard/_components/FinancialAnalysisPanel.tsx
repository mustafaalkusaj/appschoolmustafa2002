"use client";

import dynamic from "next/dynamic";
import { AppIcon } from "@/components/AppIcon";
import { AnalysisSkeleton } from "@/components/skeleton";
import { formatNumber } from "@/lib/formatting";
import { DashboardTotals } from "./types";

const DashboardFinanceCharts = dynamic(
  () => import("@/components/DashboardFinanceCharts").then((module) => module.DashboardFinanceCharts),
  {
    ssr: false,
    loading: () => <AnalysisSkeleton />,
  },
);

interface FinancialAnalysisPanelProps {
  dashboardTotals: DashboardTotals;
}

export function FinancialAnalysisPanel({ dashboardTotals }: FinancialAnalysisPanelProps) {
  const totalFees = dashboardTotals.totalFees;
  const totalPaid = dashboardTotals.totalPaid;
  const totalDiscount = dashboardTotals.totalDiscount;
  const totalRemaining = dashboardTotals.totalRemaining;
  const afterDiscount = dashboardTotals.afterDiscount;
  const paidPct = dashboardTotals.paidPct;
  const remainingPct = dashboardTotals.remainingPct;

  const barData = [
    { name: "إجمالي الرسوم", value: totalFees, fill: "#6C4AB6" },
    { name: "الواردات بعد الخصم", value: afterDiscount, fill: "#3B82F6" },
    { name: "المدفوع", value: totalPaid, fill: "#10B981" },
    { name: "الخصم", value: totalDiscount, fill: "#F59E0B" },
    { name: "المتبقي", value: totalRemaining, fill: "#EF4444" },
  ];

  const pieData = [
    { name: "المدفوع", value: totalPaid, color: "#10B981" },
    { name: "المتبقي", value: totalRemaining, color: "#F59E0B" },
  ];

  return (
    <div className="analysis-section">
      <div className="section-header">
        <div className="section-title" style={{ display: "flex", alignItems: "center", gap: ".35rem" }}>
          <AppIcon token="📊" size={16} />
          لوحة التحليل المالي الكلي
        </div>
      </div>
      <div className="fin-stats">
        {([
          ["إجمالي المبلغ المطلوب", totalFees, "#EDE8FA", "#4C2F9E"],
          ["التخفيض", totalDiscount, "#FEF3C7", "#F59E0B"],
          ["الواردات بعد التخفيض", afterDiscount, "#DBEAFE", "#3B82F6"],
          ["المبالغ المستحصلة", totalPaid, "#D1FAE5", "#10B981"],
          ["المبلغ المتبقي", totalRemaining, "#FEE2E2", "#EF4444"],
        ] as [string, number, string, string][]).map(([label, value, bg, color], i) => (
          <div className="fin-card" key={i} style={{ background: bg }}>
            <div className="fin-label" style={{ color }}>{label}</div>
            <div className="fin-val" style={{ color }}>د.ع {formatNumber(value)}</div>
          </div>
        ))}
      </div>
      <DashboardFinanceCharts barData={barData} pieData={pieData} paidPct={paidPct} />
      <div className="progress-section">
        <div className="progress-title">تقدم الدفع</div>
        <div className="prog-row">
          <span className="prog-label">المبلغ المدفوع</span>
          <div className="prog-bar">
            <div className="prog-fill" style={{ width: `${paidPct}%`, background: "#10B981" }} />
          </div>
          <span className="prog-val" style={{ color: "#10B981" }}>د.ع {formatNumber(totalPaid)}</span>
        </div>
        <div className="prog-row">
          <span className="prog-label">المبلغ المتبقي</span>
          <div className="prog-bar">
            <div className="prog-fill" style={{ width: `${remainingPct}%`, background: "#F59E0B" }} />
          </div>
          <span className="prog-val" style={{ color: "#F59E0B" }}>د.ع {formatNumber(totalRemaining)}</span>
        </div>
        <div className="prog-total">إجمالي المبلغ المطلوب: د.ع {formatNumber(totalFees)}</div>
      </div>
    </div>
  );
}
