"use client";

import { useTranslations } from "next-intl";
import { formatNumber } from "@/lib/formatting";
import { 
  Users, 
  CheckCircle2, 
  Banknote, 
  AlertTriangle,
  Wallet,
  TrendingUp
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
      <KPIGrid className="grid-cols-2 lg:grid-cols-4">
        <StatsCard 
          label={t("monitoring")}
          value={formatNumber(dashboardTotals.transferredCount)}
          icon={TrendingUp} 
          variant="warning" 
          description={t("teacherActivity")}
        />
        <StatsCard 
          label={t("feeAlerts")}
          value="02"
          icon={AlertTriangle} 
          variant="neutral" 
          description={t("pendingNotifications")}
        />
        <StatsCard 
          label={t("monthlySalaries")}
          value={`${commonT("currency")} 0`}
          icon={Wallet} 
          variant="info" 
          description={t("currentSalaries")}
          className="col-span-2"
        />
      </KPIGrid>
    </div>
  );
}
