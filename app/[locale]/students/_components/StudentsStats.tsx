"use client";

import { useTranslations } from "next-intl";
import { Users, UserCheck, DollarSign, Wallet } from "lucide-react";
import { StatsCard, KPIGrid } from "@/components/ui/stats-card";
import { formatNumber } from "@/lib/formatting";
import type { StudentsMetaPayload } from "../_types";

interface StudentsStatsProps {
  studentsMeta: StudentsMetaPayload;
}

export function StudentsStats({ studentsMeta }: StudentsStatsProps) {
  const t = useTranslations("students.stats");
  const commonT = useTranslations("common");

  const stats = [
    {
      label: t("total"),
      value: formatNumber(studentsMeta.summary.totalStudents),
      icon: Users,
      variant: "primary" as const,
    },
    {
      label: t("activeStudents"),
      value: formatNumber(studentsMeta.summary.activeStudents),
      icon: UserCheck,
      variant: "success" as const,
    },
    {
      label: t("totalFee"),
      value: `${commonT("currency")} ${formatNumber(studentsMeta.summary.totalFee)}`,
      icon: DollarSign,
      variant: "info" as const,
    },
    {
      label: t("totalRemaining"),
      value: `${commonT("currency")} ${formatNumber(studentsMeta.summary.totalRemaining)}`,
      icon: Wallet,
      variant: "warning" as const,
    },
  ];

  return (
    <KPIGrid>
      {stats.map((stat) => (
        <StatsCard
          key={stat.label}
          label={stat.label}
          value={stat.value}
          icon={stat.icon}
          variant={stat.variant}
        />
      ))}
    </KPIGrid>
  );
}
