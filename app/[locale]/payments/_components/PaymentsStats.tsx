"use client";

import { useTranslations } from "next-intl";
import { formatNumber } from "@/lib/formatting";
import { StatsCard, KPIGrid } from "@/components/ui/stats-card";
import { PaymentsSummary } from "../_types";
import { Wallet, CheckCircle, DollarSign, TrendingUp, Tag, Banknote } from "lucide-react";

interface PaymentsStatsProps {
  summary: PaymentsSummary;
  loading: boolean;
}

export function PaymentsStats({ summary, loading }: PaymentsStatsProps) {
  const t = useTranslations();
  const cur = t("common.currency");
  const v = (n: number) => loading ? "..." : `${cur} ${formatNumber(n)}`;

  return (
    <div className="space-y-4">
      <KPIGrid>
        <StatsCard
          label={t("payments.stats.totalFees")}
          value={v(summary.totalFee)}
          icon={Wallet}
          variant="primary"
        />
        <StatsCard
          label={t("payments.stats.totalPaid")}
          value={v(summary.totalPaid)}
          icon={CheckCircle}
          variant="success"
        />
        <StatsCard
          label={t("payments.stats.totalRemaining")}
          value={v(summary.totalRemaining)}
          icon={DollarSign}
          variant="danger"
        />
        <StatsCard
          label={t("payments.stats.settledCount")}
          value={
            loading
              ? "..."
              : `${formatNumber(summary.collectedCount)} / ${formatNumber(summary.totalStudents)}`
          }
          icon={TrendingUp}
          variant="info"
        />
      </KPIGrid>
      <KPIGrid className="grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label={t("payments.stats.paidWithTransferred")}
          value={v(summary.totalPaid + summary.transferredPaid)}
          icon={CheckCircle}
          variant="success"
          description={t("payments.stats.paidWithTransferredDesc")}
        />
        <StatsCard
          label={t("payments.stats.totalDiscount")}
          value={v(summary.totalDiscount)}
          icon={Tag}
          variant="warning"
          description={t("payments.stats.totalDiscountDesc")}
        />
        <StatsCard
          label={t("payments.stats.feesAfterDiscount")}
          value={v(summary.afterDiscount)}
          icon={Banknote}
          variant="info"
          description={t("payments.stats.feesAfterDiscountDesc")}
        />
        <StatsCard
          label={t("payments.stats.totalFeesWithTransferred")}
          value={v(summary.totalFeesWithTransferred)}
          icon={Banknote}
          variant="info"
          description={t("payments.stats.totalFeesWithTransferredDesc")}
        />
      </KPIGrid>
    </div>
  );
}
