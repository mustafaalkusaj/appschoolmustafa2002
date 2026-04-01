"use client";

import { formatNumber } from "@/lib/formatting";
import { DashboardTotals } from "./types";

interface StatisticsCardsProps {
  dashboardTotals: DashboardTotals;
}

export function StatisticsCards({ dashboardTotals }: StatisticsCardsProps) {
  const totalFees = dashboardTotals.totalFees;
  const totalPaid = dashboardTotals.totalPaid;
  const totalRemaining = dashboardTotals.totalRemaining;

  return (
    <>
      {/* Row 1 - Primary stats */}
      <div className="row1">
        {([
          ["إجمالي الطلاب", formatNumber(dashboardTotals.studentsCount), "#EDE8FA", "#6C4AB6"],
          ["الطلاب المنقولون", formatNumber(dashboardTotals.transferredCount), "#DBEAFE", "#3B82F6"],
          ["إجمالي الرسوم", `د.ع ${formatNumber(totalFees)}`, "#FEF3C7", "#F59E0B"],
          ["المبلغ المدفوع", `د.ع ${formatNumber(totalPaid)}`, "#D1FAE5", "#10B981"],
        ] as [string, string, string, string][]).map(([label, value, bg, color], i) => (
          <div className="sc" key={i}>
            <div className="sc-ico" style={{ background: bg }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
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

      {/* Row 2 - Secondary stats */}
      <div className="row2">
        {([
          ["الرصيد المتبقي", `د.ع ${formatNumber(totalRemaining)}`, "#FEE2E2", "#EF4444"],
          ["رواتب هذا الشهر", "د.ع 0", "#EDE9FE", "#8B5CF6"],
        ] as [string, string, string, string][]).map(([label, value, bg, color], i) => (
          <div className="sc" key={i}>
            <div className="sc-ico" style={{ background: bg }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div>
              <div className="sc-label">{label}</div>
              <div className="sc-val">{value}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
