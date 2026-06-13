"use client";

import { TrendingUp, ArrowLeftRight, DollarSign } from "lucide-react";
import { formatNumber } from "@/lib/formatting";
import type { StudentsMetaPayload } from "../_types";

interface Props {
  studentsMeta: StudentsMetaPayload;
}

export function StudentsInsights({ studentsMeta }: Props) {
  const s = studentsMeta.summary;

  const chips: { icon: React.ReactNode; text: string; color: string }[] = [];

  if (s.totalRemaining > 0) {
    chips.push({
      icon: <DollarSign size={13} />,
      text: `متبقٍ ${formatNumber(s.totalRemaining)} د.ع من الرسوم`,
      color: "var(--danger)",
    });
  }

  if (s.transferredCount > 0) {
    chips.push({
      icon: <ArrowLeftRight size={13} />,
      text: `${s.transferredCount} طالب منقول`,
      color: "var(--warning)",
    });
  }

  if (s.totalStudents > 0 && s.totalFee > 0) {
    const pct = Math.round((s.totalPaid / s.totalFee) * 100);
    chips.push({
      icon: <TrendingUp size={13} />,
      text: `نسبة التحصيل: ${pct}%`,
      color: "var(--success)",
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-3 flex gap-2 overflow-x-auto">
      {chips.map((chip, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0"
          style={{
            background: `color-mix(in srgb, ${chip.color} 12%, transparent)`,
            color: chip.color,
            border: `1px solid color-mix(in srgb, ${chip.color} 25%, transparent)`,
          }}
        >
          {chip.icon}
          {chip.text}
        </span>
      ))}
    </div>
  );
}
