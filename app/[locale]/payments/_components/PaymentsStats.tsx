"use client";

import { formatNumber } from "@/lib/formatting";
import { PaymentsSummary } from "../_types";

interface PaymentsStatsProps {
  summary: PaymentsSummary;
  loading: boolean;
}

export function PaymentsStats({ summary, loading }: PaymentsStatsProps) {
  const stats = [
    ["إجمالي الرسوم", loading ? "..." : `د.ع ${formatNumber(summary.totalFee)}`],
    ["إجمالي المدفوع", loading ? "..." : `د.ع ${formatNumber(summary.totalPaid)}`],
    ["إجمالي المتبقي", loading ? "..." : `د.ع ${formatNumber(summary.totalRemaining)}`],
    [
      "المسددة بالكامل",
      loading ? "..." : `${formatNumber(summary.collectedCount)} / ${formatNumber(summary.totalStudents)}`,
    ],
  ] as const;

  return (
    <div className="stats">
      {stats.map(([label, value], i) => (
        <div className="sc" key={i}>
          <div className="sc-label">{label}</div>
          <div className="sc-val">{value}</div>
        </div>
      ))}
    </div>
  );
}
