"use client";
import type { ScheduleGrid } from "../_hooks/useSchedule";
import type { TimeSlot, WorkingDay } from "../_hooks/useTimeSlotsSettings";

type Conflict = { day: string; slotName: string; teacher: string; count: number; kind: "subject" | "teacher" };

function detectConflicts(
  grid: ScheduleGrid,
  timeSlots: TimeSlot[],
  workingDays: WorkingDay[],
): Conflict[] {
  const conflicts: Conflict[] = [];
  const activeDays = workingDays.filter((d) => d.is_active).map((d) => d.day_key);
  const activeSlots = timeSlots.filter((s) => s.is_active && s.slot_type === "period");

  for (const day of activeDays) {
    const subjectCounts: Record<string, number> = {};
    const teacherSlots: Record<string, number> = {};
    const dayLabel = workingDays.find((d) => d.day_key === day)?.name_ar ?? day;

    for (const slot of activeSlots) {
      const cell = grid[day]?.[slot.id];
      if (!cell) continue;

      // Count subject repetitions per day
      if (cell.subject) {
        subjectCounts[cell.subject] = (subjectCounts[cell.subject] ?? 0) + 1;
      }

      // Count teacher assignments per day to detect double-booking within this class
      if (cell.teacher_name) {
        teacherSlots[cell.teacher_name] = (teacherSlots[cell.teacher_name] ?? 0) + 1;
      }
    }

    // Flag same subject repeated more than 2 times on the same day
    for (const [subject, count] of Object.entries(subjectCounts)) {
      if (count > 2) {
        conflicts.push({ day: dayLabel, slotName: subject, teacher: subject, count, kind: "subject" });
      }
    }

    // Flag teacher assigned to more than one slot on the same day (double-booking)
    for (const [teacher, count] of Object.entries(teacherSlots)) {
      if (count > 1) {
        conflicts.push({ day: dayLabel, slotName: teacher, teacher, count, kind: "teacher" });
      }
    }
  }

  return conflicts;
}

type Props = {
  grid: ScheduleGrid;
  timeSlots: TimeSlot[];
  workingDays: WorkingDay[];
};

export function ConflictBanner({ grid, timeSlots, workingDays }: Props) {
  const conflicts = detectConflicts(grid, timeSlots, workingDays);
  if (conflicts.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[var(--warning)] font-black text-sm">
          ⚠️ تنبيهات ({conflicts.length})
        </span>
      </div>
      <ul className="space-y-1">
        {conflicts.map((c, i) => (
          <li key={i} className="text-xs text-[var(--text-primary)] font-medium">
            {c.kind === "teacher"
              ? `• الأستاذ ${c.teacher} مزدوج الحصص (${c.count} حصص) يوم ${c.day}`
              : `• ${c.teacher} مكررة ${c.count} مرات يوم ${c.day}`}
          </li>
        ))}
      </ul>
    </div>
  );
}
