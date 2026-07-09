"use client";

import type { TeacherSubjectCount, BranchBreakdown } from "./types";

const SUBJECT_COLORS = [
  "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
  "#14b8a6", "#a855f7", "#0ea5e9", "#22c55e", "#e11d48",
];

interface DashboardTeacherSubjectsProps {
  teachersBySubject?: TeacherSubjectCount[];
  branchBreakdown?: BranchBreakdown[];
}

export function DashboardTeacherSubjects({
  teachersBySubject = [],
  branchBreakdown = [],
}: DashboardTeacherSubjectsProps) {
  if (teachersBySubject.length === 0 && branchBreakdown.length === 0) return null;

  const totalTeachers = teachersBySubject.reduce((s, t) => s + t.teacherCount, 0);
  const maxCount = Math.max(...teachersBySubject.map(t => t.teacherCount), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Teachers by Subject */}
      {teachersBySubject.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">المدرسين حسب المادة</h3>
            <span className="text-xs font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-2.5 py-1 rounded-full">
              {totalTeachers} مدرس
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {teachersBySubject.map((item, i) => {
              const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
              const pct = Math.round((item.teacherCount / maxCount) * 100);
              return (
                <div key={item.subjectName} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-xs font-semibold text-[var(--text-primary)]">{item.subjectName}</span>
                    </div>
                    <span className="text-xs font-bold tabular-nums" style={{ color }}>{item.teacherCount}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--surface-soft)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 group-hover:opacity-80"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Branch Quick Compare */}
      {branchBreakdown.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-5">مقارنة الفروع</h3>
          <div className="flex flex-col gap-4">
            {branchBreakdown.map((branch, i) => {
              const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
              return (
                <div key={branch.id} className="rounded-xl border border-[var(--border)] p-3 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[var(--text-primary)]">{branch.nameAr}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: color + "18", color }}>
                      {branch.paidPct}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--surface-soft)] overflow-hidden mb-2">
                    <div className="h-full rounded-full" style={{ width: `${branch.paidPct}%`, backgroundColor: color }} />
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-[var(--text-muted)]">
                    <span>{branch.studentsCount} طالب</span>
                    <span>{branch.teachersCount} مدرس</span>
                    <span className="text-emerald-600 font-semibold mr-auto">{new Intl.NumberFormat("ar-IQ", { notation: "compact" }).format(branch.totalPaid)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
