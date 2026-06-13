"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { formatNumber } from "@/lib/formatting";
import {
  Users,
  CheckCircle2,
  Banknote,
  AlertTriangle,
  Wallet,
  ArrowUp,
  Tag,
} from "@/lib/icons";
import { DashboardTotals } from "./types";
import { StatsCard, KPIGrid } from "@/components/ui/stats-card";
import { StatCardSkeleton } from "@/components/skeleton";
import {
  containerVariants,
  cardVariants,
  usePrefersReducedMotion,
  getVariants,
} from "@/lib/motion-variants";

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
  const reduced = usePrefersReducedMotion();

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
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] flex flex-col items-center justify-center py-16 text-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-[var(--danger)]/10 text-[var(--danger)] flex items-center justify-center">
          <AlertTriangle size={22} />
        </div>
        <p className="text-sm font-bold text-[var(--text-primary)]">{dashboardT("errors.overviewTitle")}</p>
        <p className="text-xs text-[var(--text-muted)]">{dashboardT("errors.overviewDescription")}</p>
        {onRetry && (
          <button onClick={onRetry} className="inline-flex items-center h-8 px-3 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] transition-colors">
            {commonT("retry")}
          </button>
        )}
      </div>
    );
  }
  
  const totalFees = dashboardTotals.totalFees;
  const totalPaid = dashboardTotals.totalPaid;
  const totalRemaining = dashboardTotals.totalRemaining;

  return (
    <div className="space-y-6">
      {/* Primary KPI Grid */}
      <motion.div
        variants={getVariants(reduced, containerVariants(0.06))}
        initial="hidden"
        animate="visible"
      >
        <KPIGrid>
          <StatsCard
            variants={getVariants(reduced, cardVariants)}
            label={t("totalStudents")}
            value={formatNumber(dashboardTotals.studentsCount)}
            icon={Users}
            variant="primary"
            description={t("registeredStudents")}
          />
          <StatsCard
            variants={getVariants(reduced, cardVariants)}
            label={t("paidAmount")}
            value={`${commonT("currency")} ${formatNumber(totalPaid)}`}
            icon={CheckCircle2}
            variant="success"
            description={t("collectedFees")}
          />
          <StatsCard
            variants={getVariants(reduced, cardVariants)}
            label={t("totalFees")}
            value={`${commonT("currency")} ${formatNumber(totalFees)}`}
            icon={Banknote}
            variant="info"
            description={t("overallFees")}
          />
          <StatsCard
            variants={getVariants(reduced, cardVariants)}
            label={t("remainingBalance")}
            value={`${commonT("currency")} ${formatNumber(totalRemaining)}`}
            icon={AlertTriangle}
            variant="danger"
            description={t("outstandingDues")}
          />
        </KPIGrid>
      </motion.div>

      {/* Secondary Stats Grid */}
      <motion.div
        variants={getVariants(reduced, containerVariants(0.06))}
        initial="hidden"
        animate="visible"
      >
        <KPIGrid className="grid-cols-2 lg:grid-cols-3">
          <StatsCard
            variants={getVariants(reduced, cardVariants)}
            label={t("incomes")}
            value={`${commonT("currency")} ${formatNumber(dashboardTotals.totalIncomes)}`}
            icon={ArrowUp}
            variant="success"
            description={t("totalRevenue")}
          />
          <StatsCard
            variants={getVariants(reduced, cardVariants)}
            label={t("paidWithTransferred")}
            value={`${commonT("currency")} ${formatNumber(dashboardTotals.totalPaid + (dashboardTotals.totalFeesWithTransferred - dashboardTotals.totalFees))}`}
            icon={CheckCircle2}
            variant="success"
            description={t("paidWithTransferredDesc")}
          />
          <StatsCard
            variants={getVariants(reduced, cardVariants)}
            label={t("totalDiscount")}
            value={`${commonT("currency")} ${formatNumber(dashboardTotals.totalDiscount)}`}
            icon={Tag}
            variant="warning"
            description={t("totalDiscountDesc")}
          />
          <StatsCard
            variants={getVariants(reduced, cardVariants)}
            label={t("feesAfterDiscount")}
            value={`${commonT("currency")} ${formatNumber(dashboardTotals.afterDiscount)}`}
            icon={Banknote}
            variant="info"
            description={t("feesAfterDiscountDesc")}
          />
          <StatsCard
            variants={getVariants(reduced, cardVariants)}
            label={t("feeAlerts")}
            value={`${commonT("currency")} ${formatNumber(dashboardTotals.totalFeesWithTransferred)}`}
            icon={Banknote}
            variant="info"
            description={t("pendingNotifications")}
          />
          <StatsCard
            variants={getVariants(reduced, cardVariants)}
            label={t("monthlySalaries")}
            value={`${commonT("currency")} ${formatNumber(dashboardTotals.monthlySalaries)}`}
            icon={Wallet}
            variant="info"
            description={t("currentSalaries")}
          />
        </KPIGrid>
      </motion.div>
    </div>
  );
}
