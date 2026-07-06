"use client";

import { useMemo } from "react";
import { cn } from "@/lib/brand/brand-utils";
import { BookOpen, Users } from "@/lib/icons";
import { motion, type Variants } from "framer-motion";

type ScheduleEntry = {
  day_of_week: string;
  time_slot_id: string | null;
  period_number: number;
  subject: string;
  teacher_name: string | null;
  class_name: string;
  section: string | null;
  is_locked: boolean;
};

type TimeSlot = {
  id: string;
  name_ar: string;
  start_time: string;
  end_time: string;
  slot_type: "period" | "break";
  slot_order: number;
  is_active: boolean;
};

type WorkingDay = {
  day_key: string;
  name_ar: string;
  day_order: number;
  is_active: boolean;
};

type Props = {
  entries: ScheduleEntry[];
  timeSlots: TimeSlot[];
  workingDays: WorkingDay[];
};

const cellVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.025, duration: 0.25, ease: [0.16, 1, 0.3, 1] },
  }),
} as Variants;

function buildLookup(entries: ScheduleEntry[]): Record<string, Record<string, ScheduleEntry>> {
  const lookup: Record<string, Record<string, ScheduleEntry>> = {};
  for (const entry of entries) {
    if (!entry.time_slot_id) continue;
    if (!lookup[entry.day_of_week]) {
      lookup[entry.day_of_week] = {};
    }
    lookup[entry.day_of_week][entry.time_slot_id] = entry;
  }
  return lookup;
}

export function TeacherView({ entries, timeSlots, workingDays }: Props) {
  const activeSlots = useMemo(
    () =>
      timeSlots
        .filter((s) => s.is_active && s.slot_type === "period")
        .sort((a, b) => a.slot_order - b.slot_order),
    [timeSlots],
  );

  const activeDays = useMemo(
    () =>
      workingDays
        .filter((d) => d.is_active)
        .sort((a, b) => a.day_order - b.day_order),
    [workingDays],
  );

  const lookup = useMemo(() => buildLookup(entries), [entries]);

  if (entries.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 py-16 rounded-2xl"
        style={{ background: "var(--surface-strong)" }}
      >
        <BookOpen size={36} className="text-[var(--text-muted)]" style={{ opacity: 0.4 }} />
        <p className="text-sm font-bold text-[var(--text-muted)]">
          لا توجد حصص مسجلة لهذا المعلم
        </p>
      </div>
    );
  }

  let cellIndex = 0;

  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table
        className="w-full border-separate"
        style={{ borderSpacing: "3px", minWidth: activeSlots.length * 120 + 100 }}
        dir="rtl"
      >
        <thead>
          <tr>
            <th
              className="sticky start-0 z-20 rounded-xl p-3 text-center text-[10px] font-black uppercase tracking-widest"
              style={{
                background: "var(--surface-strong)",
                color: "var(--text-muted)",
                minWidth: 90,
              }}
            >
              اليوم / الحصة
            </th>
            {activeSlots.map((slot) => (
              <th
                key={slot.id}
                className="rounded-xl p-2.5 text-center"
                style={{ background: "var(--surface-strong)", minWidth: 110 }}
              >
                <div className="text-xs font-black text-[var(--text-primary)]">
                  {slot.name_ar}
                </div>
                <div className="text-[10px] font-bold text-[var(--text-muted)] mt-0.5 tabular-nums direction-ltr">
                  {slot.start_time} - {slot.end_time}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {activeDays.map((day) => (
            <tr key={day.day_key}>
              <td
                className="sticky start-0 z-10 rounded-xl p-3 text-center"
                style={{
                  background: "var(--surface-strong)",
                  borderInlineStart: "3px solid var(--primary)",
                }}
              >
                <span className="text-sm font-black text-[var(--text-primary)]">
                  {day.name_ar}
                </span>
              </td>

              {activeSlots.map((slot) => {
                const entry = lookup[day.day_key]?.[slot.id];
                const isFilled = Boolean(entry);
                const idx = cellIndex++;

                const classLabel = entry
                  ? entry.section
                    ? `${entry.class_name} - ${entry.section}`
                    : entry.class_name
                  : "";

                return (
                  <td key={slot.id} className="rounded-xl">
                    <motion.div
                      custom={idx}
                      variants={cellVariants}
                      initial="hidden"
                      animate="visible"
                      className={cn(
                        "rounded-xl min-h-[72px] flex flex-col justify-center p-2.5 transition-colors duration-150",
                        isFilled
                          ? "hover:brightness-[0.97]"
                          : "",
                      )}
                      style={
                        isFilled
                          ? {
                              background: "rgba(var(--success-rgb, 34 197 94), 0.06)",
                              border: "1px solid rgba(var(--success-rgb, 34 197 94), 0.15)",
                              borderTop: "3px solid var(--success)",
                            }
                          : {
                              border: "1.5px dashed var(--border)",
                            }
                      }
                    >
                      {isFilled ? (
                        <>
                          <div className="flex items-center gap-1.5 mb-1">
                            <BookOpen
                              size={12}
                              className="shrink-0"
                              style={{ color: "var(--success)" }}
                            />
                            <span
                              className="text-xs font-black leading-tight line-clamp-2"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {entry!.subject}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-auto">
                            <Users
                              size={10}
                              className="shrink-0 text-[var(--text-muted)]"
                              style={{ opacity: 0.6 }}
                            />
                            <span className="text-[10px] font-bold text-[var(--text-muted)] line-clamp-1">
                              {classLabel}
                            </span>
                          </div>
                        </>
                      ) : (
                        <span className="text-center text-xs font-bold text-[var(--text-muted)]" style={{ opacity: 0.35 }}>
                          —
                        </span>
                      )}
                    </motion.div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TeacherView;
