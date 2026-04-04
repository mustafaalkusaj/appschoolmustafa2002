"use client";

import dynamic from "next/dynamic";
import { AnalysisSkeleton } from "@/components/skeleton";
import { formatNumber } from "@/lib/formatting";
import { BarChart3, TrendingUp, Wallet, Banknote, Tag, AlertTriangle } from "@/lib/icons";
import { DashboardTotals } from "./types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
  const totalFees = dashboardTotals.totalFees;
  const totalPaid = dashboardTotals.totalPaid;
  const totalDiscount = dashboardTotals.totalDiscount;
  const totalRemaining = dashboardTotals.totalRemaining;
  const afterDiscount = dashboardTotals.afterDiscount;
  const paidPct = dashboardTotals.paidPct;
  const remainingPct = dashboardTotals.remainingPct;

  const barData = [
    { name: "إجمالي الرسوم", value: totalFees, fill: "#6366f1" },
    { name: "بعد الخصم", value: afterDiscount, fill: "#3b82f6" },
    { name: "المدفوع", value: totalPaid, fill: "#10b981" },
    { name: "الخصم", value: totalDiscount, fill: "#f59e0b" },
    { name: "المتبقي", value: totalRemaining, fill: "#ef4444" },
  ];

  const pieData = [
    { name: "المدفوع", value: totalPaid, color: "#10b981" },
    { name: "المتبقي", value: totalRemaining, color: "#f59e0b" },
  ];

  const finCards = [
    { label: "إجمالي المبلغ المطلوب", value: totalFees, icon: Banknote, color: "#6366f1", bg: "bg-indigo-500/10" },
    { label: "إجمالي التخفيضات", value: totalDiscount, icon: Tag, color: "#f59e0b", bg: "bg-amber-500/10" },
    { label: "الواردات بعد التخفيض", value: afterDiscount, icon: TrendingUp, color: "#3b82f6", bg: "bg-blue-500/10" },
    { label: "المبالغ المحصلة", value: totalPaid, icon: Wallet, color: "#10b981", bg: "bg-emerald-500/10" },
    { label: "المبلغ المتبقي", value: totalRemaining, icon: AlertTriangle, color: "#ef4444", bg: "bg-rose-500/10" },
  ];

  return (
    <Card className="border-none shadow-md bg-white dark:bg-slate-900/50 mb-8">
      <CardHeader className="flex flex-row items-center gap-2 pb-6">
        <BarChart3 size={20} className="text-primary" />
        <CardTitle className="text-lg font-bold">لوحة التحليل المالي</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-8">
          {finCards.map((card, i) => (
            <div key={i} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("p-1.5 rounded-lg", card.bg)}>
                  <card.icon size={12} style={{ color: card.color }} />
                </div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{card.label}</div>
              </div>
              <div className="text-sm font-black text-slate-900 dark:text-slate-100">
                د.ع {formatNumber(card.value)}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-6 border border-slate-100 dark:border-slate-800">
          <DashboardFinanceCharts barData={barData} pieData={pieData} paidPct={paidPct} />
        </div>

        <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold mb-6">تقدم التحصيل المالي</h3>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-muted-foreground">المبالغ المحصلة</span>
                <span className="text-emerald-600 dark:text-emerald-400">{paidPct}% (د.ع {formatNumber(totalPaid)})</span>
              </div>
              <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                  style={{ width: `${paidPct}%` }} 
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-muted-foreground">المبالغ المتبقية</span>
                <span className="text-amber-600 dark:text-amber-400">{remainingPct}% (د.ع {formatNumber(totalRemaining)})</span>
              </div>
              <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 rounded-full transition-all duration-500" 
                  style={{ width: `${remainingPct}%` }} 
                />
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-primary/10 rounded-xl text-primary text-center text-sm font-black border border-primary/20">
            إجمالي المستحقات المطلوبة: د.ع {formatNumber(totalFees)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
