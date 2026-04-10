"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/brand/brand-utils";
import { MONTHS_AR } from "../_types";

interface CalendarSectionProps {
  calYear: number;
  calMonth: number;
  calLectureDates: string[];
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
}

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

  const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="secondary" size="sm" onClick={handlePrev}>{"<"}</Button>
        <div className="text-lg font-bold text-[var(--text-primary)]">
          {MONTHS_AR[calMonth]} {calYear}
        </div>
        <Button variant="secondary" size="sm" onClick={handleNext}>{">"}</Button>
      </div>

      {/* Day Names */}
      <div className="grid grid-cols-7 gap-1">
        {dayNames.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-bold text-[var(--text-muted)] py-2"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
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
                "aspect-square rounded-lg flex items-center justify-center",
                "text-sm font-semibold cursor-default transition-colors",
                hasLecture && "bg-[var(--success)] text-white shadow-sm",
                !hasLecture && "bg-[var(--surface-soft)] text-[var(--text-primary)]",
                isToday && !hasLecture && "ring-2 ring-[var(--primary)] text-[var(--primary)]",
                isToday && hasLecture && "ring-2 ring-white"
              )}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[var(--success)]"></span>
          دوام
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[var(--surface-muted)]"></span>
          لا يوجد سجل
        </span>
      </div>
    </div>
  );
}
