"use client";

import { Users, Wallet, Banknote, AlertCircle } from "@/lib/icons";
import { formatNumber } from "@/lib/formatting";
import { StatsCard, KPIGrid } from "@/components/ui/stats-card";

interface StatsCardsProps {
  activeTeachers: number;
  totalBaseSalaries: number;
  totalPaidThisMonth: number;
  unpaidCount: number;
}

export function StatsCards({
  activeTeachers,
  totalBaseSalaries,
  totalPaidThisMonth,
  unpaidCount,
}: StatsCardsProps) {
  return (
    <KPIGrid>
      <StatsCard
        label="الأساتذة النشطين"
        value={activeTeachers}
        icon={Users}
        variant="primary"
      />
      <StatsCard
        label="إجمالي الرواتب"
        value={`د.ع ${formatNumber(totalBaseSalaries)}`}
        icon={Wallet}
        variant="info"
      />
      <StatsCard
        label="مدفوع هذا الشهر"
        value={`د.ع ${formatNumber(totalPaidThisMonth)}`}
        icon={Banknote}
        variant="success"
      />
      <StatsCard
        label="غير مدفوع"
        value={`${formatNumber(unpaidCount)} مدرس`}
        icon={AlertCircle}
        variant="warning"
      />
    </KPIGrid>
  );
}
