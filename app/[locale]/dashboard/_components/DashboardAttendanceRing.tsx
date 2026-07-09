"use client";

import type { AttendanceSummary } from "./types";
import { EMPTY_ATTENDANCE } from "./types";

interface DashboardAttendanceRingProps {
  attendanceSummary?: AttendanceSummary;
  loading?: boolean;
}

const SEGMENTS = [
  { key: "present" as const, label: "حاضر", color: "#10b981" },
  { key: "absent" as const, label: "غائب", color: "#ef4444" },
  { key: "late" as const, label: "متأخر", color: "#f59e0b" },
];

function getCount(summary: AttendanceSummary, key: string): number {
  if (key === "present") return summary.presentCount;
  if (key === "absent") return summary.absentCount;
  return summary.lateCount;
}

export function DashboardAttendanceRing({
  attendanceSummary = EMPTY_ATTENDANCE,
  loading,
}: DashboardAttendanceRingProps) {
  if (loading) {
    return <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 h-72 animate-pulse" />;
  }

  if (attendanceSummary.totalToday === 0) return null;

  const total = attendanceSummary.totalToday;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const arcs = SEGMENTS.map(seg => {
    const count = getCount(attendanceSummary, seg.key);
    const pct = count / Math.max(total, 1);
    const dash = pct * circumference;
    const arc = { ...seg, count, pct, dash, offset };
    offset += dash;
    return arc;
  });

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
      <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">حضور اليوم</h3>
      <div className="flex items-center gap-6">
        {/* Donut */}
        <div className="relative w-36 h-36 flex-shrink-0">
          <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
            <circle cx="80" cy="80" r={radius} fill="none" stroke="var(--border)" strokeWidth="14" />
            {arcs.map(arc => (
              <circle
                key={arc.key}
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={arc.color}
                strokeWidth="14"
                strokeLinecap="butt"
                strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
                strokeDashoffset={-arc.offset}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-[var(--text-primary)] tabular-nums">{attendanceSummary.attendancePct}%</span>
            <span className="text-[9px] text-[var(--text-muted)]">حضور</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-3 flex-1">
          {arcs.map(arc => (
            <div key={arc.key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: arc.color }} />
                <span className="text-xs text-[var(--text-secondary)]">{arc.label}</span>
              </div>
              <div className="text-left">
                <span className="text-sm font-bold tabular-nums text-[var(--text-primary)]">{arc.count}</span>
                <span className="text-[10px] text-[var(--text-muted)] mr-1">({Math.round(arc.pct * 100)}%)</span>
              </div>
            </div>
          ))}
          <div className="border-t border-[var(--border)] pt-2 mt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-primary)]">الإجمالي</span>
              <span className="text-sm font-bold tabular-nums text-[var(--text-primary)]">{total}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
