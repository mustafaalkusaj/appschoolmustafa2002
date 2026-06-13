"use client";

import { CalendarEvent, EVENT_TYPE_CONFIG } from "../_hooks/useCalendarEvents";

const DAYS = [
  { full: "الأحد",    weekend: false },
  { full: "الاثنين", weekend: false },
  { full: "الثلاثاء",weekend: false },
  { full: "الأربعاء",weekend: false },
  { full: "الخميس",  weekend: false },
  { full: "الجمعة",  weekend: true  },
  { full: "السبت",   weekend: true  },
];

type Props = {
  year: number;
  month: number;
  eventsByDate: Record<string, CalendarEvent[]>;
  onDayClick: (date: string, events: CalendarEvent[]) => void;
  selectedDate?: string | null;
};

export function CalendarGrid({ year, month, eventsByDate, onDayClick, selectedDate }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  type Cell = { day: number | null; dateStr: string | null };
  const cells: Cell[] = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: null, dateStr: null });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      dateStr: `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, dateStr: null });

  const rows: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-[var(--border)]">
        {DAYS.map((d, i) => (
          <div
            key={i}
            className={`py-3 text-center ${d.weekend ? "bg-[var(--danger)]/[0.03]" : ""}`}
          >
            <span className={`text-[11px] font-black tracking-wide ${d.weekend ? "text-[var(--danger)]/70" : "text-[var(--text-muted)]"}`}>
              {d.full}
            </span>
          </div>
        ))}
      </div>

      {/* Rows */}
      <div>
        {rows.map((row, rowIdx) => (
          <div
            key={rowIdx}
            className={`grid grid-cols-7 ${rowIdx < rows.length - 1 ? "border-b border-[var(--border)]" : ""}`}
          >
            {row.map((cell, colIdx) => {
              const isWeekend = colIdx === 5 || colIdx === 6;

              if (!cell.day || !cell.dateStr) {
                return (
                  <div
                    key={`e-${rowIdx}-${colIdx}`}
                    className={[
                      "min-h-[115px]",
                      colIdx < 6 ? "border-r border-[var(--border)]" : "",
                      isWeekend ? "bg-[var(--danger)]/[0.02]" : "bg-[var(--surface-soft)]/40",
                    ].join(" ")}
                  />
                );
              }

              const isToday = cell.dateStr === today;
              const isSelected = cell.dateStr === selectedDate;
              const dayEvents = eventsByDate[cell.dateStr] ?? [];
              const isHoliday = dayEvents.some((e) =>
                ["holiday", "religious", "national", "vacation"].includes(e.type),
              );

              let cellBg = "";
              if (isSelected) cellBg = "bg-[var(--primary)]/[0.06]";
              else if (isToday) cellBg = "bg-[var(--primary)]/[0.03]";
              else if (isHoliday) cellBg = "bg-[var(--success)]/[0.025]";
              else if (isWeekend) cellBg = "bg-[var(--danger)]/[0.02]";

              return (
                <button
                  key={cell.dateStr}
                  onClick={() => onDayClick(cell.dateStr!, dayEvents)}
                  className={[
                    "group relative min-h-[115px] p-2.5 text-start transition-all duration-150 focus:outline-none",
                    colIdx < 6 ? "border-r border-[var(--border)]" : "",
                    cellBg,
                    isSelected
                      ? "ring-2 ring-inset ring-[var(--primary)]/40 hover:bg-[var(--primary)]/[0.09]"
                      : isToday
                        ? "ring-1 ring-inset ring-[var(--primary)]/20 hover:bg-[var(--primary)]/[0.07]"
                        : isHoliday
                          ? "hover:bg-[var(--success)]/[0.06]"
                          : isWeekend
                            ? "hover:bg-[var(--danger)]/[0.05]"
                            : "hover:bg-[var(--surface-soft)]",
                  ].filter(Boolean).join(" ")}
                >
                  {/* Day number */}
                  <div className="flex items-start justify-between mb-1.5">
                    <span
                      className={[
                        "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-black transition-transform group-hover:scale-105",
                        isSelected
                          ? "text-white"
                          : isToday
                            ? "text-white"
                            : isWeekend
                              ? "text-[var(--danger)]/80"
                              : "text-[var(--text-secondary)]",
                      ].join(" ")}
                      style={
                        isSelected
                          ? { background: "var(--primary)", boxShadow: "0 2px 10px color-mix(in srgb, var(--primary) 45%, transparent)" }
                          : isToday
                            ? { background: "var(--primary)", boxShadow: "0 2px 8px color-mix(in srgb, var(--primary) 40%, transparent)" }
                            : {}
                      }
                    >
                      {cell.day}
                    </span>

                    {/* Event count dot */}
                    {dayEvents.length > 0 && !isSelected && !isToday && (
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5 opacity-80"
                        style={{ background: EVENT_TYPE_CONFIG[dayEvents[0]!.type]?.color ?? "#6b7280" }}
                      />
                    )}
                    {dayEvents.length > 0 && (isSelected || isToday) && (
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5 bg-white/70"
                      />
                    )}
                  </div>

                  {/* Event pills */}
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map((ev) => {
                      const cfg = EVENT_TYPE_CONFIG[ev.type];
                      return (
                        <div
                          key={ev.id}
                          className="flex items-center gap-1 rounded-md px-1.5 py-[3px] text-[10px] font-bold truncate"
                          style={{
                            background: cfg.bg,
                            color: cfg.color,
                            borderInlineStart: `2.5px solid ${cfg.color}`,
                          }}
                        >
                          <span className="truncate">{ev.title}</span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <div className="text-[9px] font-black text-[var(--text-muted)] ps-1 pt-0.5">
                        +{dayEvents.length - 2} أحداث
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
