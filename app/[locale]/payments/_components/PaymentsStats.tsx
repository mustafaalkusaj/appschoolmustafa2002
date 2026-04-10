"use client";

import { useTranslations } from "next-intl";
import { formatNumber } from "@/lib/formatting";
import { StatsCard, KPIGrid } from "@/components/ui/stats-card";
import { PaymentsSummary } from "../_types";
import { Wallet, CheckCircle, DollarSign, TrendingUp } from "lucide-react";

interface PaymentsStatsProps {
  summary: PaymentsSummary;
  loading: boolean;
}

export function PaymentsStats({ summary, loading }: PaymentsStatsProps) {
  const t = useTranslations();

  return (
    <KPIGrid>
      <StatsCard
        label={t("payments.stats.totalFees")}
        value={loading ? "..." : `${t("common.currency")} ${formatNumber(summary.totalFee)}`}
        icon={Wallet}
        variant="primary"
      />
      <StatsCard
        label={t("payments.stats.totalPaid")}
        value={loading ? "..." : `${t("common.currency")} ${formatNumber(summary.totalPaid)}`}
        icon={CheckCircle}
        variant="success"
      />
      <StatsCard
        label={t("payments.stats.totalRemaining")}
        value={loading ? "..." : `${t("common.currency")} ${formatNumber(summary.totalRemaining)}`}
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
  );
}
