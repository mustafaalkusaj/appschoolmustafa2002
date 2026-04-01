"use client";

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
    <div className="cal-wrap" style={{ maxWidth: 520 }}>
      <div className="cal-header">
        <button className="cal-nav" onClick={handlePrev}>{"<"}</button>
        <div className="cal-title">{MONTHS_AR[calMonth]} {calYear}</div>
        <button className="cal-nav" onClick={handleNext}>{">"}</button>
      </div>
      <div className="cal-days-header">
        {dayNames.map((d) => (
          <div key={d} className="cal-day-name">{d}</div>
        ))}
      </div>
      <div className="cal-grid">
        {Array.from({ length: firstDayOfMonth(calYear, calMonth) }).map((_, i) => (
          <div key={`e-${i}`} className="cal-cell empty" />
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
              className={`cal-cell${hasLecture ? " has-lecture" : " normal"}${isToday ? " today" : ""}`}
            >
              {day}
            </div>
          );
        })}
      </div>
      <div className="cal-legend">
        <span>
          <span className="cal-dot" style={{ background: "#10B981", display: "inline-block" }}></span>
          دوام
        </span>
        <span>
          <span className="cal-dot" style={{ background: "#E5E7EB", display: "inline-block" }}></span>
          لا يوجد سجل
        </span>
      </div>
    </div>
  );
}
