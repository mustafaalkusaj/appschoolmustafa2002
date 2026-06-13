"use client";

import { useMemo } from "react";
import { GraduationCap, Hash } from "lucide-react";
import type { GradeEntry } from "../_types";
import { GRADE_LABELS } from "@/lib/grades/types";

interface TeacherSubmissionsPanelProps {
  entries: GradeEntry[];
  loading: boolean;
}

interface TeacherRow {
  teacherName: string;
  total: number;
  draft: number;
  confirmed: number;
  locked: number;
  avgPct: number;
}

function getPctColor(pct: number) {
  for (const g of GRADE_LABELS) {
    if (pct >= g.minPercent && pct <= g.maxPercent) return g.color;
  }
  return "text-[var(--text-muted)]";
}

export function TeacherSubmissionsPanel({ entries, loading }: TeacherSubmissionsPanelProps) {
  const teachers = useMemo<TeacherRow[]>(() => {
    if (!entries.length) return [];

    const map = new Map<string, { entries: GradeEntry[] }>();

    for (const e of entries) {
      const name = e.teacher_name?.trim() || "غير محدد";
      if (!map.has(name)) map.set(name, { entries: [] });
      map.get(name)!.entries.push(e);
    }

    return Array.from(map.entries())
      .map(([teacherName, { entries: te }]) => ({
        teacherName,
        total: te.length,
        draft: te.filter((e) => e.status === "draft").length,
        confirmed: te.filter((e) => e.status === "confirmed").length,
        locked: te.filter((e) => e.status === "locked").length,
        avgPct: Math.round(te.reduce((s, e) => s + (e.percentage ?? 0), 0) / te.length),
      }))
      .sort((a, b) => b.total - a.total);
  }, [entries]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 space-y-3">
        <div className="h-4 w-32 rounded bg-[var(--surface-soft)] animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-[var(--surface-soft)] animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
        ))}
      </div>
    );
  }

  if (!teachers.length) return null;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[var(--border)]">
        <div className="h-7 w-7 rounded-lg bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] flex items-center justify-center flex-shrink-0">
          <GraduationCap size={14} className="text-[var(--primary)]" />
        </div>
        <div>
          <p className="text-sm font-black text-[var(--text-primary)]">الأساتذة الذين أدخلوا درجات</p>
          <p className="text-[10px] text-[var(--text-muted)]">{teachers.length} أستاذ · {entries.length} درجة مجموع</p>
        </div>
      </div>

      {/* Teacher rows */}
      <div className="space-y-1.5">
        {teachers.map((t) => (
          <div
            key={t.teacherName}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-[var(--surface-soft)] hover:bg-[var(--surface-muted)] transition-colors"
          >
            {/* Avatar */}
            <div className="h-8 w-8 rounded-lg bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] flex items-center justify-center flex-shrink-0 text-[var(--primary)] font-black text-xs">
              {t.teacherName.charAt(0)}
            </div>

            {/* Name + breakdown */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[var(--text-primary)] truncate">{t.teacherName}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {t.draft > 0 && (
                  <span className="text-[10px] text-gray-500 font-medium">{t.draft} مسودة</span>
                )}
                {t.confirmed > 0 && (
                  <span className="text-[10px] text-blue-500 font-medium">{t.confirmed} مؤكد</span>
                )}
                {t.locked > 0 && (
                  <span className="text-[10px] text-amber-500 font-medium">{t.locked} مقفول</span>
                )}
              </div>
            </div>

            {/* Count badge */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`text-sm font-black ${getPctColor(t.avgPct)}`}>
                {t.avgPct}%
              </span>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]">
                <Hash size={10} className="text-[var(--primary)]" />
                <span className="text-xs font-black text-[var(--primary)]">{t.total}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
