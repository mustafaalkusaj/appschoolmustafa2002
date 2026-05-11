"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { AnalysisSkeleton } from "@/components/skeleton";
import { formatNumber } from "@/lib/formatting";
import { BarChart3, TrendingUp, Wallet, Banknote, Tag, AlertTriangle, ArrowUp } from "@/lib/icons";
import { DashboardTotals } from "./types";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/brand/brand-utils";

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
  const t = useTranslations("dashboard.finance");
  const commonT = useTranslations("common");

  const totalFees = dashboardTotals.totalFees;
  const totalPaid = dashboardTotals.totalPaid;
  const totalDiscount = dashboardTotals.totalDiscount;
  const totalRemaining = dashboardTotals.totalRemaining;
  const afterDiscount = dashboardTotals.afterDiscount;
  const paidPct = dashboardTotals.paidPct;
  const remainingPct = dashboardTotals.remainingPct;

  const barData = [
    { name: t("totalFees"), value: totalFees, fill: "#6366f1" },
    { name: t("afterDiscountShort"), value: afterDiscount, fill: "#3b82f6" },
    { name: t("paid"), value: totalPaid, fill: "#10b981" },
    { name: t("discount"), value: totalDiscount, fill: "#f59e0b" },
    { name: t("remaining"), value: totalRemaining, fill: "#ef4444" },
  ];

  const pieData = [
    { name: t("paid"), value: totalPaid, color: "#10b981" },
    { name: t("remaining"), value: totalRemaining, color: "#f59e0b" },
  ];

  const finCards = [
    { label: t("totalRequested"), value: totalFees, icon: Banknote, variant: "info" as const },
    { label: t("totalDiscounts"), value: totalDiscount, icon: Tag, variant: "warning" as const },
    { label: t("afterDiscount"), value: afterDiscount, icon: TrendingUp, variant: "primary" as const },
    { label: t("collectedAmounts"), value: totalPaid, icon: Wallet, variant: "success" as const },
    { label: t("remainingAmount"), value: totalRemaining, icon: AlertTriangle, variant: "danger" as const },
    { label: t("incomes"), value: dashboardTotals.totalIncomes, icon: ArrowUp, variant: "success" as const },
  ];

  const variantStyles = {
    info: "bg-[color-mix(in_srgb,var(--info)_10%,transparent)] text-[var(--info)]",
    warning: "bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] text-[var(--warning)]",
    primary: "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]",
    success: "bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-[var(--success)]",
    danger: "bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] flex items-center justify-center text-[var(--primary)]">
            <BarChart3 size={22} />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight">{t("analysisTitle")}</h2>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {finCards.map((card, i) => (
          <div key={i} className="group relative p-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card-bg)] transition-all hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 h-full">
            <div className="flex flex-col gap-3 h-full">
              <div className={cn(
                "h-9 w-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 flex-shrink-0",
                variantStyles[card.variant]
              )}>
                <card.icon size={18} />
              </div>
              <div className="min-w-0 flex-1 flex flex-col">
                <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">{card.label}</div>
                <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)] whitespace-normal break-words overflow-visible" title={`${commonT("currency")} ${formatNumber(card.value)}`}>
                  {commonT("currency")} {formatNumber(card.value)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card className="bg-[var(--surface-muted)]/30">
          <CardContent className="p-6">
            <DashboardFinanceCharts barData={barData} pieData={pieData} paidPct={paidPct} />
          </CardContent>
        </Card>

        <div className="space-y-6 flex flex-col justify-center">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{t("collectedAmounts")}</span>
                  <span className="text-base font-bold text-[var(--success)]">{t("collectedPct", { pct: paidPct })}</span>
                </div>
                <span className="text-xs font-bold text-[var(--text-muted)]">{commonT("currency")} {formatNumber(totalPaid)}</span>
              </div>
              <div className="h-2 bg-[var(--surface-muted)] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[var(--success)] rounded-full transition-all duration-1000" 
                  style={{ width: `${paidPct}%` }} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{t("remainingAmount")}</span>
                  <span className="text-base font-bold text-[var(--warning)]">{t("remainingPct", { pct: remainingPct })}</span>
                </div>
                <span className="text-xs font-bold text-[var(--text-muted)]">{commonT("currency")} {formatNumber(totalRemaining)}</span>
              </div>
              <div className="h-2 bg-[var(--surface-muted)] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[var(--warning)] rounded-full transition-all duration-1000" 
                  style={{ width: `${remainingPct}%` }} 
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-strong)] rounded-[var(--radius-lg)] text-white shadow-lg shadow-[var(--primary)]/20">
            <div className="flex flex-col gap-1 items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">{t("totalRequired")}</span>
              <span className="text-xl font-bold">{commonT("currency")} {formatNumber(totalFees)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

