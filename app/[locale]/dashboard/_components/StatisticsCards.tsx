"use client";

import { formatNumber } from "@/lib/formatting";
import { 
  Users, 
  ArrowLeftRight, 
  Banknote, 
  CheckCircle2, 
  AlertTriangle, 
  Wallet
} from "@/lib/icons";
import { DashboardTotals } from "./types";
import { StatsCard, KPIGrid } from "@/components/ui/stats-card";

interface StatisticsCardsProps {
  dashboardTotals: DashboardTotals;
}

export function StatisticsCards({ dashboardTotals }: StatisticsCardsProps) {
  const totalFees = dashboardTotals.totalFees;
  const totalPaid = dashboardTotals.totalPaid;
  const totalRemaining = dashboardTotals.totalRemaining;

  return (
    <div className="space-y-6 mb-8">
      {/* Primary KPIs */}
      <KPIGrid>
        <StatsCard 
          label="إجمالي الطلاب" 
          value={formatNumber(dashboardTotals.studentsCount)} 
          icon={Users} 
          variant="primary" 
        />
        <StatsCard 
          label="الطلاب المنقولون" 
          value={formatNumber(dashboardTotals.transferredCount)} 
          icon={ArrowLeftRight} 
          variant="info" 
        />
        <StatsCard 
          label="إجمالي الرسوم" 
          value={`د.ع ${formatNumber(totalFees)}`} 
          icon={Banknote} 
          variant="warning" 
        />
        <StatsCard 
          label="المبلغ المدفوع" 
          value={`د.ع ${formatNumber(totalPaid)}`} 
          icon={CheckCircle2} 
          variant="success" 
        />
      </KPIGrid>

      {/* Secondary Financial Oversight */}
      <KPIGrid>
        <StatsCard 
          label="الرصيد المتبقي" 
          value={`د.ع ${formatNumber(totalRemaining)}`} 
          icon={AlertTriangle} 
          variant="danger" 
          className="lg:col-span-2"
        />
        <StatsCard 
          label="رواتب هذا الشهر" 
          value="د.ع 0" 
          icon={Wallet} 
          variant="neutral" 
          className="lg:col-span-2"
        />
      </KPIGrid>
    </div>
  );
}
