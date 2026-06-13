"use client";
import { useEffect, useRef } from "react";
import type { TeacherScheduleEntry } from "../../../_hooks/useTeacherProfile";

interface Props {
  schedule: TeacherScheduleEntry[];
  scheduleLoading: boolean;
  fetchSchedule: () => Promise<void>;
  locale: "ar" | "en";
}

const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
const DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const DAYS_KEY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

// Consistent color per subject name
const SUBJECT_PALETTES = [
  { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8", dot: "#3b82f6" }, // blue
  { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d", dot: "#22c55e" }, // green
  { bg: "#fdf4ff", border: "#e9d5ff", text: "#7e22ce", dot: "#a855f7" }, // purple
  { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c", dot: "#f97316" }, // orange
  { bg: "#fefce8", border: "#fde68a", text: "#a16207", dot: "#eab308" }, // yellow
  { bg: "#f0fdfa", border: "#99f6e4", text: "#0f766e", dot: "#14b8a6" }, // teal
  { bg: "#fff1f2", border: "#fecdd3", text: "#be123c", dot: "#f43f5e" }, // rose
  { bg: "#f0f9ff", border: "#bae6fd", text: "#0369a1", dot: "#0ea5e9" }, // sky
];

function getSubjectPalette(subject: string) {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  return SUBJECT_PALETTES[Math.abs(hash) % SUBJECT_PALETTES.length]!;
}

export function ScheduleTab({ schedule, scheduleLoading, fetchSchedule, locale }: Props) {
  const isEn = locale === "en";
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      void fetchSchedule();
    }
  }, [fetchSchedule]);

  const days = isEn ? DAYS_EN : DAYS_AR;

  const getEntry = (dayIdx: number, period: number): TeacherScheduleEntry | undefined =>
    schedule.find((s) => s.day === DAYS_KEY[dayIdx] && s.period === period);

  const totalPeriods = schedule.length;
  const subjects = Array.from(new Set(schedule.map((s) => s.subject).filter(Boolean))) as string[];

  if (scheduleLoading) {
    return (
      <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] shadow-sm p-12 flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-[var(--text-muted)]">{isEn ? "Loading schedule..." : "جاري تحميل الجدول..."}</span>
      </div>
    );
  }

  if (schedule.length === 0) {
    return (
      <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] shadow-sm p-12 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-[var(--surface-soft)] flex items-center justify-center text-3xl">📅</div>
        <p className="font-semibold text-[var(--text-primary)]">{isEn ? "No schedule yet" : "لا يوجد جدول"}</p>
        <p className="text-sm text-[var(--text-muted)]">{isEn ? "No periods assigned to this teacher." : "لم تُسجَّل حصص لهذا المعلم."}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Stats strip */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
          <span className="text-xs font-bold text-[var(--text-secondary)]">
            {isEn ? "Total Periods" : "إجمالي الحصص"}
          </span>
          <span className="text-sm font-black text-[var(--text-primary)]">{totalPeriods}</span>
        </div>
        {subjects.map((sub) => {
          const p = getSubjectPalette(sub);
          const count = schedule.filter((s) => s.subject === sub).length;
          return (
            <div
              key={sub}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold"
              style={{ background: p.bg, borderColor: p.border, color: p.text }}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.dot }} />
              {sub} · {count}
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {/* Period label */}
                <th
                  className="px-4 py-3 text-xs font-bold text-white/70 whitespace-nowrap text-start border-e border-white/10 w-24"
                  style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)" }}
                >
                  {isEn ? "Day / Period" : "اليوم / الحصة"}
                </th>
                {PERIODS.map((p) => (
                  <th
                    key={p}
                    className="px-3 py-3 text-center whitespace-nowrap border-e border-white/10 last:border-0 min-w-[110px]"
                    style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)" }}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black"
                        style={{ background: "rgba(255,255,255,0.15)", color: "white" }}
                      >
                        {p}
                      </span>
                      <span className="text-[10px] font-bold text-white/80">
                        {isEn ? `Period ${p}` : `الحصة ${p === 1 ? "الأولى" : p === 2 ? "الثانية" : p === 3 ? "الثالثة" : p === 4 ? "الرابعة" : p === 5 ? "الخامسة" : p === 6 ? "السادسة" : p === 7 ? "السابعة" : "الثامنة"}`}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((day, dayIdx) => {
                const dayEntries = PERIODS.map((p) => getEntry(dayIdx, p));
                const hasAny = dayEntries.some(Boolean);
                return (
                  <tr
                    key={day}
                    className="border-b border-[var(--card-border)] last:border-0"
                  >
                    {/* Day label */}
                    <td
                      className="px-4 py-3 text-sm font-black text-[var(--text-primary)] whitespace-nowrap border-e border-[var(--card-border)] bg-[var(--surface-soft)]"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-1.5 h-6 rounded-full flex-shrink-0"
                          style={{ background: hasAny ? "var(--primary)" : "var(--border)" }}
                        />
                        {day}
                      </div>
                    </td>

                    {PERIODS.map((period) => {
                      const entry = getEntry(dayIdx, period);
                      if (!entry) {
                        return (
                          <td
                            key={period}
                            className="px-2 py-2 text-center border-e border-[var(--card-border)] last:border-0"
                          >
                            <div className="flex items-center justify-center h-14 rounded-xl border border-dashed border-[var(--border)] text-[var(--border)]">
                              <span className="text-lg leading-none">—</span>
                            </div>
                          </td>
                        );
                      }
                      const palette = getSubjectPalette(entry.subject ?? "");
                      return (
                        <td
                          key={period}
                          className="px-2 py-2 border-e border-[var(--card-border)] last:border-0"
                        >
                          <div
                            className="rounded-xl border px-3 py-2 h-14 flex flex-col justify-center gap-0.5 transition-shadow hover:shadow-sm"
                            style={{ background: palette.bg, borderColor: palette.border }}
                          >
                            <div
                              className="text-xs font-black leading-tight truncate"
                              style={{ color: palette.text }}
                            >
                              {entry.subject ?? "—"}
                            </div>
                            {(entry.class || entry.section) && (
                              <div className="text-[10px] font-semibold text-[var(--text-muted)] truncate">
                                {[entry.class, entry.section].filter(Boolean).join(" / ")}
                              </div>
                            )}
                            {entry.room && (
                              <div className="text-[10px] text-[var(--text-muted)] truncate">
                                🏫 {entry.room}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
