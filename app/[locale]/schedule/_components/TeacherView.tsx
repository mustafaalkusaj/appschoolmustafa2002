"use client";
import { cn } from "@/lib/brand/brand-utils";
import type { TimeSlot, WorkingDay } from "../_hooks/useTimeSlotsSettings";

type Entry = {
  day_of_week: string;
  time_slot_id: string | null;
  period_number: number;
  subject: string;
  teacher_name: string | null;
  class_name: string;
  section: string | null;
  is_locked: boolean;
};

type Props = {
  entries: Entry[];
  timeSlots: TimeSlot[];
  workingDays: WorkingDay[];
};

export function TeacherView({ entries, timeSlots, workingDays }: Props) {
  const activeDays = workingDays
    .filter((d) => d.is_active)
    .sort((a, b) => a.day_order - b.day_order);
  const activeSlots = timeSlots
    .filter((s) => s.is_active)
    .sort((a, b) => a.slot_order - b.slot_order);

  // Build lookup: day → slotId → entry
  const lookup: Record<string, Record<string, Entry>> = {};
  for (const e of entries) {
    const slotKey = e.time_slot_id ?? String(e.period_number);
    if (!lookup[e.day_of_week]) lookup[e.day_of_week] = {};
    lookup[e.day_of_week][slotKey] = e;
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--text-muted)]">
        <span className="text-3xl">📭</span>
        <p className="text-sm font-bold">لا توجد حصص لهذا المعلم</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card-bg)]">
      <table className="w-full min-w-[640px] text-sm border-collapse">
        <thead>
          <tr>
            <th className="px-4 py-3 text-right font-semibold text-[var(--text-muted)] border-b border-[var(--border)] bg-[var(--surface-soft)] w-24 sticky end-0 z-10">
              الأيام
            </th>
            {activeSlots.map((slot) => (
              <th
                key={slot.id}
                className={cn(
                  "px-3 py-2 text-center font-semibold border-b border-[var(--border)]",
                  slot.slot_type === "break"
                    ? "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 w-16"
                    : "bg-[var(--surface-soft)] text-[var(--text-muted)]",
                )}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-xs font-bold leading-tight">{slot.name_ar}</span>
                  {slot.start_time && slot.end_time && (
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {slot.start_time}-{slot.end_time}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {activeDays.map((day, dayIdx) => (
            <tr
              key={day.day_key}
              className={cn(
                "border-b border-[var(--border)] last:border-0",
                dayIdx % 2 === 0 ? "bg-[var(--card-bg)]" : "bg-[var(--surface-soft)]/30",
              )}
            >
              <td className="px-4 py-3 font-semibold text-[var(--text-primary)] border-e border-[var(--border)] sticky end-0 bg-inherit z-10">
                {day.name_ar}
              </td>
              {activeSlots.map((slot) => {
                if (slot.slot_type === "break") {
                  return (
                    <td
                      key={slot.id}
                      className="px-2 py-2 text-center w-16"
                      style={{
                        background:
                          "repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(251,191,36,0.08) 4px,rgba(251,191,36,0.08) 8px)",
                      }}
                    >
                      <span className="text-base">☕</span>
                    </td>
                  );
                }
                const entry = lookup[day.day_key]?.[slot.id];
                return (
                  <td key={slot.id} className="px-2 py-2 text-center">
                    {entry ? (
                      <div className="rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/20 px-2 py-2 text-start">
                        <div className="font-bold text-xs text-[var(--primary)] leading-tight">
                          {entry.subject}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] leading-tight mt-0.5">
                          {entry.class_name}
                          {entry.section ? ` - ${entry.section}` : ""}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[var(--text-muted)] text-xs">—</span>
                    )}
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
