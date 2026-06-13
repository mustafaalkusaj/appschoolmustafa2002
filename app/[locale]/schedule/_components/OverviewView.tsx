"use client";
import { cn } from "@/lib/brand/brand-utils";
import type { TimeSlot } from "../_hooks/useTimeSlotsSettings";

type Entry = {
  day_of_week: string;
  time_slot_id: string | null;
  period_number: number;
  subject: string;
  teacher_name: string | null;
  class_name: string;
  section: string | null;
};

type Props = {
  entries: Entry[];
  timeSlots: TimeSlot[];
};

export function OverviewView({ entries, timeSlots }: Props) {
  const activeSlots = timeSlots
    .filter((s) => s.is_active)
    .sort((a, b) => a.slot_order - b.slot_order);

  // Get unique class+section combos
  const classRows = Array.from(
    new Map(
      entries.map((e) => {
        const key = `${e.class_name}__${e.section ?? ""}`;
        return [key, { class_name: e.class_name, section: e.section }] as const;
      }),
    ).values(),
  ).sort((a, b) =>
    `${a.class_name}${a.section ?? ""}`.localeCompare(`${b.class_name}${b.section ?? ""}`),
  );

  // Build lookup: class_section → slotId → entry
  const lookup: Record<string, Record<string, Entry>> = {};
  for (const e of entries) {
    const rowKey = `${e.class_name}__${e.section ?? ""}`;
    const slotKey = e.time_slot_id ?? String(e.period_number);
    if (!lookup[rowKey]) lookup[rowKey] = {};
    lookup[rowKey][slotKey] = e;
  }

  if (classRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--text-muted)]">
        <span className="text-3xl">📭</span>
        <p className="text-sm font-bold">لا توجد بيانات لهذا اليوم</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card-bg)]">
      <table className="w-full min-w-[640px] text-sm border-collapse">
        <thead>
          <tr>
            <th className="px-4 py-3 text-right font-semibold text-[var(--text-muted)] border-b border-[var(--border)] bg-[var(--surface-soft)] w-28 sticky end-0 z-10">
              الصف
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
                  <span className="text-xs font-bold">{slot.name_ar}</span>
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
          {classRows.map((row, idx) => {
            const rowKey = `${row.class_name}__${row.section ?? ""}`;
            return (
              <tr
                key={rowKey}
                className={cn(
                  "border-b border-[var(--border)] last:border-0",
                  idx % 2 === 0 ? "bg-[var(--card-bg)]" : "bg-[var(--surface-soft)]/30",
                )}
              >
                <td className="px-3 py-2 font-semibold text-[var(--text-primary)] border-e border-[var(--border)] sticky end-0 bg-inherit z-10 whitespace-nowrap">
                  <div className="text-sm font-bold leading-tight">{row.class_name}</div>
                  {row.section && (
                    <div className="text-[10px] text-[var(--text-muted)]">{row.section}</div>
                  )}
                </td>
                {activeSlots.map((slot) => {
                  if (slot.slot_type === "break") {
                    return (
                      <td
                        key={slot.id}
                        className="px-1 py-2 text-center w-16"
                        style={{
                          background:
                            "repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(251,191,36,0.08) 4px,rgba(251,191,36,0.08) 8px)",
                        }}
                      >
                        <span className="text-sm">☕</span>
                      </td>
                    );
                  }
                  const entry = lookup[rowKey]?.[slot.id];
                  return (
                    <td key={slot.id} className="px-1 py-1 text-center">
                      {entry ? (
                        <div className="rounded px-1.5 py-1 bg-[var(--primary)]/8 text-center">
                          <div className="font-bold text-[10px] text-[var(--primary)] leading-tight">
                            {entry.subject}
                          </div>
                          {entry.teacher_name && (
                            <div className="text-[9px] text-[var(--text-muted)] leading-tight">
                              {entry.teacher_name}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[var(--text-muted)] text-xs">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
