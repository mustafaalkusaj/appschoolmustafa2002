"use client";

import { formatNumber } from "@/lib/formatting";

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
  const stats = [
    ["عدد المدرسين", formatNumber(activeTeachers), "#EDF6FF", "#4F8CFF"],
    ["إجمالي الرواتب", `د.ع ${formatNumber(totalBaseSalaries)}`, "#D1FAE5", "#10B981"],
    ["مدفوع هذا الشهر", `د.ع ${formatNumber(totalPaidThisMonth)}`, "#DBEAFE", "#3B82F6"],
    ["غير مدفوع", `${formatNumber(unpaidCount)} مدرس`, "#FEE2E2", "#EF4444"],
  ] as const;

  return (
    <div className="stats">
      {stats.map(([label, value, bg, color], i) => (
        <div className="sc" key={i}>
          <div className="sc-ico" style={{ background: bg }}>
            <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <div>
            <div className="sc-label">{label}</div>
            <div className="sc-val">{value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
