"use client";

import { useMemo } from "react";
import { cn } from "@/lib/brand/brand-utils";
import { AlertTriangle } from "@/lib/icons";
import { motion } from "framer-motion";

type ScheduleCell = {
  subject: string;
  teacher_name: string | null;
  is_locked: boolean;
};

type ScheduleGrid = Record<string, Record<string, ScheduleCell>>;

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
  grid: ScheduleGrid;
  timeSlots: TimeSlot[];
  workingDays: WorkingDay[];
};

function detectIssues(
  grid: ScheduleGrid,
  timeSlots: readonly TimeSlot[],
  workingDays: readonly WorkingDay[],
): string[] {
  const issues: string[] = [];
  const activeDays = workingDays.filter((d) => d.is_active);
  const activePeriods = timeSlots.filter(
    (s) => s.is_active && s.slot_type === "period",
  );

  for (const day of activeDays) {
    const dayRow = grid[day.day_key];
    if (!dayRow) continue;

    const subjectsInDay: string[] = [];

    for (const slot of activePeriods) {
      const cell = dayRow[slot.id];
      if (!cell) continue;

      const hasSubject = cell.subject.trim().length > 0;
      const hasTeacher =
        cell.teacher_name !== null && cell.teacher_name.trim().length > 0;

      // Partial fill: subject without teacher or teacher without subject
      if (hasSubject && !hasTeacher) {
        issues.push(
          `${day.name_ar} - ${slot.name_ar}: المادة "${cell.subject}" بدون معلم`,
        );
      }
      if (!hasSubject && hasTeacher) {
        issues.push(
          `${day.name_ar} - ${slot.name_ar}: المعلم "${cell.teacher_name}" بدون مادة`,
        );
      }

      // Track subjects for duplicate detection
      if (hasSubject) {
        subjectsInDay.push(cell.subject.trim());
      }
    }

    // Detect duplicate subjects in the same day (more than 2 occurrences is unusual)
    const subjectCounts = new Map<string, number>();
    for (const subj of subjectsInDay) {
      subjectCounts.set(subj, (subjectCounts.get(subj) ?? 0) + 1);
    }
    for (const [subj, count] of Array.from(subjectCounts)) {
      if (count > 2) {
        issues.push(
          `${day.name_ar}: المادة "${subj}" مكررة ${count} مرات في نفس اليوم`,
        );
      }
    }
  }

  return issues;
}

export function ConflictBanner({ grid, timeSlots, workingDays }: Props) {
  const issues = useMemo(
    () => detectIssues(grid, timeSlots, workingDays),
    [grid, timeSlots, workingDays],
  );

  if (issues.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "rounded-2xl border-2 border-amber-300 bg-amber-50/80 p-4",
        "dark:border-amber-500/40 dark:bg-amber-950/30",
      )}
      style={{ direction: "rtl" }}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            "bg-amber-200/60 dark:bg-amber-800/40",
          )}
        >
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">
            تنبيهات الجدول
          </h3>

          <ul className="mt-2 space-y-1">
            {issues.map((issue) => (
              <li
                key={issue}
                className="flex items-start gap-2 text-xs leading-relaxed text-amber-700 dark:text-amber-400/90"
              >
                <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400 dark:bg-amber-500" />
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

export default ConflictBanner;
