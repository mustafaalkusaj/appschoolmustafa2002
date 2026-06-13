"use client";

import { cn } from "@/lib/brand/brand-utils";
import { MONTHS_AR } from "../_types";

interface CalendarSectionProps {
  calYear: number;
  calMonth: number;
  calLectureDates: string[];
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
}

const DAY_NAMES_SHORT = ["الأح", "الاث", "الث", "الأر", "الخ", "الج", "الس"];

export function CalendarSection({
  calYear,
  calMonth,
  calLectureDates,
  onYearChange,
  onMonthChange,
}: CalendarSectionProps) {
  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();
  const today = new Date();

  const handlePrev = () => {
    let m = calMonth - 1;
    let y = calYear;
    if (m < 0) {
      m = 11;
      y--;
    }
    onMonthChange(m);
    onYearChange(y);
  };

  const handleNext = () => {
    let m = calMonth + 1;
    let y = calYear;
    if (m > 11) {
      m = 0;
      y++;
    }
    onMonthChange(m);
    onYearChange(y);
  };

  const lectureDayCount = calLectureDates.filter((d) => {
    const [y, mo] = d.split("-").map(Number);
    return y === calYear && mo === calMonth + 1;
  }).length;

  return (
    <div className="max-w-lg mx-auto">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-sm space-y-5">
        {/* Navigation Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            className={cn(
              "w-10 h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)]",
              "flex items-center justify-center text-[var(--text-secondary)]",
              "hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all"
            )}
            aria-label="الشهر السابق"
          >
            ‹
          </button>
          <div className="text-xl font-black text-[var(--text-primary)]">
            {MONTHS_AR[calMonth]} {calYear}
          </div>
          <button
            onClick={handleNext}
            className={cn(
              "w-10 h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)]",
              "flex items-center justify-center text-[var(--text-secondary)]",
              "hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all"
            )}
            aria-label="الشهر التالي"
          >
            ›
          </button>
        </div>

        {/* Day Names */}
        <div className="grid grid-cols-7 gap-1">
          {DAY_NAMES_SHORT.map((d) => (
            <div
              key={d}
              className="text-center text-xs font-bold text-[var(--text-muted)] py-1.5"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: firstDayOfMonth(calYear, calMonth) }).map((_, i) => (
            <div key={`e-${i}`} className="aspect-square" />
          ))}
          {Array.from({ length: daysInMonth(calYear, calMonth) }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const hasLecture = calLectureDates.includes(dateStr);
            const isToday =
              day === today.getDate() &&
              calMonth === today.getMonth() &&
              calYear === today.getFullYear();

            return (
              <div
                key={day}
                className={cn(
                  "aspect-square rounded-xl flex items-center justify-center",
                  "text-sm font-semibold cursor-default transition-colors",
                  hasLecture && "bg-[var(--success)] text-white shadow-sm font-bold",
                  !hasLecture && "hover:bg-[var(--surface-soft)] text-[var(--text-primary)]",
                  isToday && !hasLecture && "ring-2 ring-[var(--primary)] ring-offset-1 text-[var(--primary)]",
                  isToday && hasLecture && "ring-2 ring-white ring-offset-1 ring-offset-[var(--success)]"
                )}
              >
                {day}
              </div>
            );
          })}
        </div>

        {/* Lecture count badge */}
        {lectureDayCount > 0 && (
          <div className="flex justify-center">
            <span
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold"
              style={{
                background: "color-mix(in srgb,var(--success) 12%,transparent)",
                color: "var(--success)",
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: "var(--success)" }}
              />
              {lectureDayCount} يوم دوام
            </span>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 text-xs pt-1 border-t border-[var(--border)]">
          <span className="flex items-center gap-2 text-[var(--text-secondary)]">
            <span
              className="w-4 h-4 rounded-lg"
              style={{ background: "var(--success)" }}
            />
            يوم دوام
          </span>
          <span className="flex items-center gap-2 text-[var(--text-secondary)]">
            <span
              className="w-4 h-4 rounded-lg ring-2 ring-[var(--primary)]"
              style={{ background: "var(--card-bg)" }}
            />
            اليوم الحالي
          </span>
          <span className="flex items-center gap-2 text-[var(--text-secondary)]">
            <span
              className="w-4 h-4 rounded-lg"
              style={{ background: "var(--surface-soft)" }}
            />
            لا يوجد سجل
          </span>
        </div>
      </div>
    </div>
  );
}
