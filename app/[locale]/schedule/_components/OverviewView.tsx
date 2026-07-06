"use client";

import { useMemo } from "react";
import { cn } from "@/lib/brand/brand-utils";
import { School } from "@/lib/icons";
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

type Props = {
  entries: ScheduleEntry[];
  timeSlots: TimeSlot[];
};

const SUBJECT_PALETTE = [
  "59, 130, 246",   // blue
  "16, 185, 129",   // emerald
  "245, 158, 11",   // amber
  "139, 92, 246",   // violet
  "236, 72, 153",   // pink
  "6, 182, 212",    // cyan
  "249, 115, 22",   // orange
  "168, 85, 247",   // purple
  "234, 88, 12",    // deep orange
  "20, 184, 166",   // teal
];

function hashSubject(subject: string): number {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = (hash * 31 + subject.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % SUBJECT_PALETTE.length;
}

function getSubjectColor(subject: string): string {
  return SUBJECT_PALETTE[hashSubject(subject)];
}

function buildClassLabel(className: string, section: string | null): string {
  return section ? `${className} - ${section}` : className;
}

const cellVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.02, duration: 0.25, ease: [0.16, 1, 0.3, 1] },
  }),
} as Variants;

export function OverviewView({ entries, timeSlots }: Props) {
  const activeSlots = useMemo(
    () =>
      timeSlots
        .filter((s) => s.is_active && s.slot_type === "period")
        .sort((a, b) => a.slot_order - b.slot_order),
    [timeSlots],
  );

  const classGroups = useMemo(() => {
    const groupMap = new Map<string, Map<string, ScheduleEntry>>();

    for (const entry of entries) {
      if (!entry.time_slot_id) continue;
      const label = buildClassLabel(entry.class_name, entry.section);
      if (!groupMap.has(label)) {
        groupMap.set(label, new Map());
      }
      groupMap.get(label)!.set(entry.time_slot_id, entry);
    }

    return Array.from(groupMap.entries())
      .sort(([a], [b]) => a.localeCompare(b, "ar"))
      .map(([label, slotMap]) => ({ label, slotMap }));
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 py-16 rounded-2xl"
        style={{ background: "var(--surface-strong)" }}
      >
        <School size={36} className="text-[var(--text-muted)]" style={{ opacity: 0.4 }} />
        <p className="text-sm font-bold text-[var(--text-muted)]">
          لا توجد بيانات لهذا اليوم
        </p>
      </div>
    );
  }

  let cellIndex = 0;

  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table
        className="w-full border-separate"
        style={{ borderSpacing: "3px", minWidth: activeSlots.length * 120 + 120 }}
        dir="rtl"
      >
        <thead>
          <tr>
            <th
              className="sticky start-0 z-20 rounded-xl p-3 text-center text-[10px] font-black uppercase tracking-widest"
              style={{
                background: "var(--surface-strong)",
                color: "var(--text-muted)",
                minWidth: 110,
              }}
            >
              الصف / الحصة
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
          {classGroups.map(({ label, slotMap }) => (
            <tr key={label}>
              <td
                className="sticky start-0 z-10 rounded-xl p-3 text-center"
                style={{
                  background: "var(--surface-strong)",
                  borderInlineStart: "3px solid var(--primary)",
                }}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <School size={13} className="shrink-0 text-[var(--primary)]" style={{ opacity: 0.7 }} />
                  <span className="text-sm font-black text-[var(--text-primary)] line-clamp-1">
                    {label}
                  </span>
                </div>
              </td>

              {activeSlots.map((slot) => {
                const entry = slotMap.get(slot.id);
                const isFilled = Boolean(entry);
                const idx = cellIndex++;
                const accent = isFilled ? getSubjectColor(entry!.subject) : "";

                return (
                  <td key={slot.id} className="rounded-xl">
                    <motion.div
                      custom={idx}
                      variants={cellVariants}
                      initial="hidden"
                      animate="visible"
                      className={cn(
                        "rounded-xl min-h-[72px] flex flex-col justify-center p-2.5 transition-colors duration-150",
                        isFilled ? "hover:brightness-[0.97]" : "",
                      )}
                      style={
                        isFilled
                          ? {
                              background: `rgba(${accent}, 0.06)`,
                              border: `1px solid rgba(${accent}, 0.15)`,
                              borderTop: `3px solid rgba(${accent}, 0.6)`,
                            }
                          : {
                              border: "1.5px dashed var(--border)",
                            }
                      }
                    >
                      {isFilled ? (
                        <>
                          <span
                            className="text-xs font-black leading-tight line-clamp-2 mb-0.5"
                            style={{ color: `rgb(${accent})` }}
                          >
                            {entry!.subject}
                          </span>
                          {entry!.teacher_name && (
                            <span className="text-[10px] font-bold text-[var(--text-muted)] line-clamp-1 mt-auto">
                              {entry!.teacher_name}
                            </span>
                          )}
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

export default OverviewView;
