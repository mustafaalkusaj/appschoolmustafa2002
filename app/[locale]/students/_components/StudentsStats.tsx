"use client";

import { useTranslations } from "next-intl";
import { Users, UserCheck, UserMinus, DollarSign, Wallet, CheckCircle2, Banknote } from "lucide-react";
import { motion } from "framer-motion";
import { StatsCard, KPIGrid } from "@/components/ui/stats-card";
import { formatNumber } from "@/lib/formatting";
import type { StudentsMetaPayload } from "../_types";

interface StudentsStatsProps {
  studentsMeta: StudentsMetaPayload;
}

export function StudentsStats({ studentsMeta }: StudentsStatsProps) {
  const t = useTranslations("students.stats");
  const commonT = useTranslations("common");
  const s = studentsMeta.summary;

  const stats = [
    {
      label: t("total"),
      value: formatNumber(s.totalStudents),
      icon: Users,
      variant: "primary" as const,
    },
    {
      label: t("activeStudents"),
      value: formatNumber(s.activeStudents),
      icon: UserCheck,
      variant: "success" as const,
    },
    {
      label: t("transferredCount"),
      value: formatNumber(s.transferredCount),
      icon: UserMinus,
      variant: "warning" as const,
    },
    {
      label: t("totalFee"),
      value: `${commonT("currency")} ${formatNumber(s.totalFee)}`,
      icon: DollarSign,
      variant: "info" as const,
    },
    {
      label: t("totalPaid"),
      value: `${commonT("currency")} ${formatNumber(s.totalPaid)}`,
      icon: CheckCircle2,
      variant: "success" as const,
    },
    {
      label: t("transferredPaid"),
      value: `${commonT("currency")} ${formatNumber(s.transferredPaid)}`,
      icon: Wallet,
      variant: "warning" as const,
    },
    {
      label: t("totalFeesWithTransferred"),
      value: `${commonT("currency")} ${formatNumber(s.totalFeesWithTransferred)}`,
      icon: Banknote,
      variant: "info" as const,
    },
    {
      label: t("totalRemaining"),
      value: `${commonT("currency")} ${formatNumber(s.totalRemaining)}`,
      icon: Wallet,
      variant: "danger" as const,
    },
  ];

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.08, duration: 0.4 },
    }),
  };

  return (
    <KPIGrid className="grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          custom={index}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <StatsCard
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            variant={stat.variant}
          />
        </motion.div>
      ))}
    </KPIGrid>
  );
}
