"use client";

import { useTranslations } from "next-intl";
import { formatNumber } from "@/lib/formatting";
import { motion } from "framer-motion";
import { containerVariants, cardVariants, usePrefersReducedMotion, getVariants } from "@/lib/motion-variants";
import { PaymentsSummary } from "../_types";
import { Wallet, CheckCircle, DollarSign, TrendingUp, Tag, Banknote } from "lucide-react";

interface PaymentsStatsProps {
  summary: PaymentsSummary;
  loading: boolean;
  currency?: string;
}

const colorMap = {
  primary: "var(--primary)",
  success: "var(--success)",
  danger: "var(--danger)",
  info: "var(--info)",
  warning: "var(--warning)",
};

interface StatCardDef {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  description?: string;
}

function StatCard({
  card,
  variants,
}: {
  card: StatCardDef;
  variants?: import("framer-motion").Variants;
}) {
  const Icon = card.icon;
  return (
    <motion.div
      variants={variants}
      className="group relative rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 overflow-hidden hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-200 cursor-default"
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
        style={{
          background: `radial-gradient(ellipse at top right, color-mix(in srgb, ${card.color} 8%, transparent), transparent 70%)`,
        }}
      />
      <div className="relative flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
            style={{
              background: `color-mix(in srgb, ${card.color} 12%, transparent)`,
              color: card.color,
            }}
          >
            <Icon size={20} />
          </div>
          <span className="text-2xl font-black leading-none tabular-nums text-[var(--text-primary)]">
            {card.value}
          </span>
        </div>
        <div>
          <div className="text-sm font-bold text-[var(--text-primary)]">{card.label}</div>
          {card.description && (
            <div className="text-xs text-[var(--text-muted)] mt-0.5">{card.description}</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function PaymentsStats({ summary, loading, currency }: PaymentsStatsProps) {
  const t = useTranslations();
  const reduced = usePrefersReducedMotion();
  const cur = currency ?? t("common.currency");
  const v = (n: number) => (loading ? "..." : `${cur} ${formatNumber(n)}`);

  const row1: StatCardDef[] = [
    {
      label: t("payments.stats.totalFees"),
      value: v(summary.totalFee),
      icon: Wallet,
      color: colorMap.primary,
    },
    {
      label: t("payments.stats.totalPaid"),
      value: v(summary.totalPaid),
      icon: CheckCircle,
      color: colorMap.success,
    },
    {
      label: t("payments.stats.totalRemaining"),
      value: v(summary.totalRemaining),
      icon: DollarSign,
      color: colorMap.danger,
    },
    {
      label: t("payments.stats.settledCount"),
      value: loading
        ? "..."
        : `${formatNumber(summary.collectedCount)} / ${formatNumber(summary.totalStudents)}`,
      icon: TrendingUp,
      color: colorMap.info,
    },
  ];

  const row2: StatCardDef[] = [
    {
      label: t("payments.stats.transferredPaid"),
      value: v(summary.transferredPaid),
      icon: CheckCircle,
      color: colorMap.success,
      description: t("payments.stats.transferredPaidDesc"),
    },
    {
      label: t("payments.stats.totalDiscount"),
      value: v(summary.totalDiscount),
      icon: Tag,
      color: colorMap.warning,
      description: t("payments.stats.totalDiscountDesc"),
    },
    {
      label: t("payments.stats.feesAfterDiscount"),
      value: v(summary.afterDiscount),
      icon: Banknote,
      color: colorMap.info,
      description: t("payments.stats.feesAfterDiscountDesc"),
    },
    {
      label: t("payments.stats.totalFeesWithTransferred"),
      value: v(summary.totalFeesWithTransferred),
      icon: Banknote,
      color: colorMap.info,
      description: t("payments.stats.totalFeesWithTransferredDesc"),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Row 1 - primary stats */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
        variants={getVariants(reduced, containerVariants(0.06))}
        initial="hidden"
        animate="visible"
      >
        {row1.map((card) => (
          <StatCard key={card.label} card={card} variants={getVariants(reduced, cardVariants)} />
        ))}
      </motion.div>

      {/* Row 2 - secondary stats with descriptions */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        variants={getVariants(reduced, containerVariants(0.06))}
        initial="hidden"
        animate="visible"
      >
        {row2.map((card) => (
          <StatCard key={card.label} card={card} variants={getVariants(reduced, cardVariants)} />
        ))}
      </motion.div>
    </div>
  );
}
