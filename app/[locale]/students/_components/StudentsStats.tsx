"use client";

import { formatNumber } from "@/lib/formatting";
import type { StudentsMetaPayload } from "../_types";

interface StudentsStatsProps {
  studentsMeta: StudentsMetaPayload;
}

export function StudentsStats({ studentsMeta }: StudentsStatsProps) {
  return (
    <div className="stats">
      {([
        ["إجمالي الطلاب", formatNumber(studentsMeta.summary.totalStudents)],
        ["الطلاب النشطون", formatNumber(studentsMeta.summary.activeStudents)],
        ["إجمالي الرسوم", `د.ع ${formatNumber(studentsMeta.summary.totalFee)}`],
        ["الرصيد المتبقي", `د.ع ${formatNumber(studentsMeta.summary.totalRemaining)}`],
      ] as const).map(([label, value], i) => (
        <div className="sc" key={i}>
          <div className="sc-label">{label}</div>
          <div className="sc-val">{value}</div>
        </div>
      ))}
    </div>
  );
}
