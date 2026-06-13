"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import type { TimeSlot, WorkingDay } from "./useTimeSlotsSettings";

export type { TimeSlot, WorkingDay };

export type ScheduleEntry = {
  day_of_week: string;
  period_number: number;
  time_slot_id: string | null;
  is_locked: boolean;
  subject: string;
  teacher_name: string | null;
};

// Grid keyed by [day_key][slot_id] — slot_id can be a time_slot_id UUID or period_number string
export type ScheduleGrid = Record<string, Record<string, { subject: string; teacher_name: string | null; is_locked: boolean }>>;

export const SCHEDULE_DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday"] as const;
export const SCHEDULE_PERIODS = [1, 2, 3, 4, 5, 6] as const;

function buildGrid(entries: ScheduleEntry[], timeSlots: TimeSlot[], workingDays: WorkingDay[]): ScheduleGrid {
  const grid: ScheduleGrid = {};

  // Use dynamic days/slots if provided, otherwise fall back to static defaults
  const days = workingDays.length > 0
    ? workingDays.filter((d) => d.is_active).map((d) => d.day_key)
    : [...SCHEDULE_DAYS];

  const slotKeys = timeSlots.length > 0
    ? timeSlots.filter((s) => s.is_active).map((s) => s.id)
    : SCHEDULE_PERIODS.map(String);

  for (const day of days) {
    grid[day] = {};
    for (const key of slotKeys) {
      grid[day][key] = { subject: "", teacher_name: null, is_locked: false };
    }
  }

  for (const entry of entries) {
    const dayKey = entry.day_of_week;
    if (!grid[dayKey]) continue;

    // Prefer time_slot_id match; fall back to period_number string key
    const slotKey = entry.time_slot_id ?? String(entry.period_number);
    if (grid[dayKey][slotKey] !== undefined) {
      grid[dayKey][slotKey] = {
        subject: entry.subject,
        teacher_name: entry.teacher_name,
        is_locked: entry.is_locked ?? false,
      };
    }
  }

  return grid;
}

export function useSchedule(
  schoolId: string | null,
  timeSlots: TimeSlot[] = [],
  workingDays: WorkingDay[] = [],
) {
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [grid, setGrid] = useState<ScheduleGrid | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchSchedule = useCallback(
    async (className: string, section: string) => {
      if (!schoolId || !className) return;
      setLoading(true);
      setError(null);
      setGrid(null);
      try {
        const params = new URLSearchParams({ schoolId, className });
        if (section) params.set("section", section);
        const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; schedule?: ScheduleEntry[]; message?: string }>(`/api/web/schedule?${params}`);
        if (response.ok && payload?.ok) {
          setGrid(buildGrid(payload.schedule ?? [], timeSlots, workingDays));
        } else {
          setError(payload?.message || "تعذر تحميل الجدول.");
        }
      } catch {
        setError("تعذر الاتصال بالخادم.");
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [schoolId, timeSlots, workingDays],
  );

  useEffect(() => {
    if (selectedClass) {
      void fetchSchedule(selectedClass, selectedSection);
    } else {
      setGrid(null);
    }
  }, [selectedClass, selectedSection, fetchSchedule]);

  // Rebuild grid when timeSlots/workingDays change but we already have entries
  useEffect(() => {
    if (grid && (timeSlots.length > 0 || workingDays.length > 0)) {
      void fetchSchedule(selectedClass, selectedSection);
    }
    // Only trigger on slot/day config changes, not grid itself
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeSlots, workingDays]);

  const updateCell = useCallback(
    (day: string, slotKey: string, subject: string, teacherName: string) => {
      setGrid((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          [day]: {
            ...prev[day],
            [slotKey]: { subject, teacher_name: teacherName || null, is_locked: prev[day]?.[slotKey]?.is_locked ?? false },
          },
        };
      });
    },
    [],
  );

  const clearCell = useCallback((day: string, slotKey: string) => {
    setGrid((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [day]: {
          ...prev[day],
          [slotKey]: { subject: "", teacher_name: null, is_locked: false },
        },
      };
    });
  }, []);

  const toggleLock = useCallback((day: string, slotKey: string) => {
    setGrid((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [day]: {
          ...prev[day],
          [slotKey]: { ...prev[day][slotKey], is_locked: !prev[day][slotKey]?.is_locked },
        },
      };
    });
  }, []);

  const swapCells = useCallback((from: { day: string; slotId: string }, to: { day: string; slotId: string }) => {
    setGrid((prev) => {
      if (!prev) return prev;
      const fromCell = prev[from.day]?.[from.slotId];
      const toCell = prev[to.day]?.[to.slotId];
      if (!fromCell) return prev;
      return {
        ...prev,
        [from.day]: { ...prev[from.day], [from.slotId]: toCell ?? { subject: "", teacher_name: null, is_locked: false } },
        [to.day]: { ...prev[to.day], [to.slotId]: fromCell },
      };
    });
  }, []);

  const saveSchedule = useCallback(async () => {
    if (!schoolId || !selectedClass || !grid) return;
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      const entries: ScheduleEntry[] = [];
      const activeDays = workingDays.length > 0
        ? workingDays.filter((d) => d.is_active).map((d) => d.day_key)
        : [...SCHEDULE_DAYS];
      const activeSlots = timeSlots.length > 0
        ? timeSlots.filter((s) => s.is_active)
        : SCHEDULE_PERIODS.map((p) => ({ id: String(p), slot_type: "period" as const, slot_order: p }));

      for (const day of activeDays) {
        for (const slot of activeSlots) {
          if (slot.slot_type === "break") continue;
          const cell = grid[day]?.[slot.id];
          if (cell?.subject?.trim()) {
            // Determine period_number for legacy API: use slot_order for period slots
            const periodNum = "slot_order" in slot ? (slot as { slot_order: number }).slot_order : 0;
            entries.push({
              day_of_week: day,
              period_number: periodNum,
              time_slot_id: slot.id.includes("-") ? slot.id : null, // UUID = real slot
              subject: cell.subject.trim(),
              teacher_name: cell.teacher_name?.trim() || null,
              is_locked: cell.is_locked ?? false,
            });
          }
        }
      }

      const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; message?: string }>("/api/web/schedule", {
        method: "PUT",
        headers: withJsonHeaders(),
        body: JSON.stringify({
          school_id: schoolId,
          class_name: selectedClass,
          section: selectedSection || "",
          entries,
        }),
      });
      if (response.ok && payload?.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError(payload?.message || "تعذر حفظ الجدول.");
      }
    } catch {
      setError("تعذر الاتصال بالخادم.");
    } finally {
      setSaving(false);
    }
  }, [schoolId, selectedClass, selectedSection, grid, timeSlots, workingDays]);

  return {
    selectedClass,
    setSelectedClass,
    selectedSection,
    setSelectedSection,
    grid,
    loading,
    saving,
    error,
    saveSuccess,
    updateCell,
    clearCell,
    toggleLock,
    swapCells,
    saveSchedule,
    refresh: () => void fetchSchedule(selectedClass, selectedSection),
  };
}
