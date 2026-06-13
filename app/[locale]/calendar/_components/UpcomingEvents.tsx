"use client";

import { CalendarEvent, EVENT_TYPE_CONFIG } from "../_hooks/useCalendarEvents";
import { CalendarDays } from "@/lib/icons";
import { motion } from "framer-motion";

const MONTHS_SHORT = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const DAYS_SHORT   = ["أحد","اثنين","ثلاثاء","أربعاء","خميس","جمعة","سبت"];

function getDaysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function UpcomingEvents({ events }: { events: CalendarEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="h-20 w-20 rounded-3xl flex items-center justify-center"
          style={{ background: "var(--surface-muted)" }}>
          <CalendarDays size={32} className="text-[var(--text-muted)]" />
        </div>
        <div className="text-center">
          <p className="font-black text-[var(--text-secondary)] mb-1">لا توجد أحداث قادمة</p>
          <p className="text-xs text-[var(--text-muted)]">ستظهر الأحداث القادمة هنا</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {events.map((ev, index) => {
        const cfg = EVENT_TYPE_CONFIG[ev.type];
        const daysUntil = getDaysUntil(ev.date);
        const dateObj   = new Date(ev.date);
        const dayNum    = dateObj.getDate();
        const monthName = MONTHS_SHORT[dateObj.getMonth()];
        const dayName   = DAYS_SHORT[dateObj.getDay()];

        const isToday    = daysUntil === 0;
        const isTomorrow = daysUntil === 1;
        const isSoon     = daysUntil <= 7;

        return (
          <motion.div key={ev.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.2 }}
            className="group flex items-stretch gap-0 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden hover:shadow-md hover:-translate-y-px transition-all duration-200"
          >
            {/* Date box with left color accent */}
            <div className="flex flex-col items-center justify-center w-16 flex-shrink-0 py-3 gap-0.5"
              style={{ background: cfg.bg, borderInlineEnd: `3px solid ${cfg.color}` }}>
              <span className="text-[10px] font-black" style={{ color: cfg.color, opacity: 0.65 }}>{monthName}</span>
              <span className="text-2xl font-black leading-none" style={{ color: cfg.color }}>{dayNum}</span>
              <span className="text-[9px] font-bold" style={{ color: cfg.color, opacity: 0.55 }}>{dayName}</span>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center gap-3 px-4 py-3 min-w-0">
              <div className="flex-1 min-w-0">
                <p className="font-black text-[var(--text-primary)] text-sm truncate">{ev.title}</p>
                {ev.hijri_date && (
                  <p className="text-[11px] mt-0.5 font-bold truncate" style={{ color: cfg.color, opacity: 0.7 }}>
                    {ev.hijri_date}
                  </p>
                )}
                <span className="inline-flex items-center mt-1 text-[10px] font-black px-2 py-0.5 rounded-full"
                  style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                  {cfg.label}
                </span>
              </div>

              {/* Countdown */}
              <div className="flex-shrink-0 text-end">
                {isToday && (
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
                    <span className="text-xs font-black text-[var(--success)]">اليوم</span>
                  </div>
                )}
                {isTomorrow && (
                  <span className="text-xs font-black text-amber-500">غداً</span>
                )}
                {!isToday && !isTomorrow && isSoon && (
                  <span className="text-xs font-black text-[var(--primary)]">بعد {daysUntil} أيام</span>
                )}
                {!isToday && !isTomorrow && !isSoon && (
                  <span className="text-xs font-bold text-[var(--text-muted)]">{daysUntil} يوم</span>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
