"use client";

import { useTranslations } from "next-intl";
import { Users, Wallet, Banknote, AlertCircle } from "@/lib/icons";
import { formatNumber } from "@/lib/formatting";
import { StatsCard, KPIGrid } from "@/components/ui/stats-card";

interface StatsCardsProps {
  activeTeachers: number;
  totalBaseSalaries: number;
  totalPaidThisMonth: number;
  unpaidCount: number;
  currency: string;
}

export function StatsCards({
  activeTeachers,
  totalBaseSalaries,
  totalPaidThisMonth,
  unpaidCount,
  currency,
}: StatsCardsProps) {
  const t = useTranslations("salaries.summary");
  return (
    <KPIGrid>
      <StatsCard
        label={t("activeTeachers")}
        value={activeTeachers}
        icon={Users}
        variant="primary"
      />
      <StatsCard
        label={t("totalBaseSalaries")}
        value={`${currency} ${formatNumber(totalBaseSalaries)}`}
        icon={Wallet}
        variant="info"
      />
      <StatsCard
        label={t("paidThisMonth")}
        value={`${currency} ${formatNumber(totalPaidThisMonth)}`}
        icon={Banknote}
        variant="success"
      />
      <StatsCard
        label={t("pendingPayout")}
        value={formatNumber(unpaidCount)}
        icon={AlertCircle}
        variant="warning"
      />
    </KPIGrid>
  );
}
