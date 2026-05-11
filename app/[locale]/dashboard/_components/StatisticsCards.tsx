"use client";

import { useTranslations } from "next-intl";
import { formatNumber } from "@/lib/formatting";
import {
  Users,
  CheckCircle2,
  Banknote,
  AlertTriangle,
  Wallet,
  TrendingUp,
  ArrowUp,
  Tag,
} from "@/lib/icons";
import { DashboardTotals } from "./types";
import { StatsCard, KPIGrid } from "@/components/ui/stats-card";
import { StatCardSkeleton } from "@/components/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";

interface StatisticsCardsProps {
  dashboardTotals: DashboardTotals;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function StatisticsCards({ dashboardTotals, loading, error, onRetry }: StatisticsCardsProps) {
  const t = useTranslations("dashboard.stats");
  const dashboardT = useTranslations("dashboard");
  const commonT = useTranslations("common");

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-0">
          <ErrorState
            title={dashboardT("errors.overviewTitle")}
            description={dashboardT("errors.overviewDescription")}
            onRetry={onRetry}
            retryLabel={commonT("retry")}
            className="min-h-[220px]"
          />
        </CardContent>
      </Card>
    );
  }
  
  const totalFees = dashboardTotals.totalFees;
  const totalPaid = dashboardTotals.totalPaid;
  const totalRemaining = dashboardTotals.totalRemaining;

  return (
    <div className="space-y-6">
      {/* Primary KPI Grid */}
      <KPIGrid>
        <StatsCard 
          label={t("totalStudents")}
          value={formatNumber(dashboardTotals.studentsCount)}
          icon={Users} 
          variant="primary" 
          description={t("registeredStudents")}
        />
        <StatsCard 
          label={t("paidAmount")}
          value={`${commonT("currency")} ${formatNumber(totalPaid)}`}
          icon={CheckCircle2} 
          variant="success" 
          description={t("collectedFees")}
        />
        <StatsCard 
          label={t("totalFees")}
          value={`${commonT("currency")} ${formatNumber(totalFees)}`}
          icon={Banknote} 
          variant="info" 
          description={t("overallFees")}
        />
        <StatsCard 
          label={t("remainingBalance")}
          value={`${commonT("currency")} ${formatNumber(totalRemaining)}`}
          icon={AlertTriangle} 
          variant="danger" 
          description={t("outstandingDues")}
        />
      </KPIGrid>

      {/* Secondary Stats Grid */}
      <KPIGrid className="grid-cols-2 lg:grid-cols-3">
        <StatsCard
          label={t("incomes")}
          value={`${commonT("currency")} ${formatNumber(dashboardTotals.totalIncomes)}`}
          icon={ArrowUp}
          variant="success"
          description={t("totalRevenue")}
        />
        <StatsCard
          label={t("paidWithTransferred")}
          value={`${commonT("currency")} ${formatNumber(dashboardTotals.totalPaid + (dashboardTotals.totalFeesWithTransferred - dashboardTotals.totalFees))}`}
          icon={CheckCircle2}
          variant="success"
          description={t("paidWithTransferredDesc")}
        />
        <StatsCard
          label={t("totalDiscount")}
          value={`${commonT("currency")} ${formatNumber(dashboardTotals.totalDiscount)}`}
          icon={Tag}
          variant="warning"
          description={t("totalDiscountDesc")}
        />
        <StatsCard
          label={t("feesAfterDiscount")}
          value={`${commonT("currency")} ${formatNumber(dashboardTotals.afterDiscount)}`}
          icon={Banknote}
          variant="info"
          description={t("feesAfterDiscountDesc")}
        />
        <StatsCard
          label={t("feeAlerts")}
          value={`${commonT("currency")} ${formatNumber(dashboardTotals.totalFeesWithTransferred)}`}
          icon={Banknote}
          variant="info"
          description={t("pendingNotifications")}
        />
        <StatsCard
          label={t("monthlySalaries")}
          value={`${commonT("currency")} ${formatNumber(dashboardTotals.monthlySalaries)}`}
          icon={Wallet}
          variant="info"
          description={t("currentSalaries")}
        />
      </KPIGrid>
    </div>
  );
}
