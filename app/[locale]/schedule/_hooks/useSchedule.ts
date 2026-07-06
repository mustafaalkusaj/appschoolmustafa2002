"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import type { TimeSlot, WorkingDay } from "./useTimeSlotsSettings";

export type ScheduleCell = {
  subject: string;
  teacher_name: string | null;
  is_locked: boolean;
};

export type ScheduleGrid = Record<string, Record<string, ScheduleCell>>;

type ApiScheduleRow = {
  day: string;
  period: number;
  session_type: string;
  teacher_id: string | null;
};

type ApiScheduleResponse = {
  ok: boolean;
  schedule?: ApiScheduleRow[];
};

type SaveResponse = {
  ok: boolean;
  count?: number;
};

function buildEmptyGrid(
  timeSlots: TimeSlot[],
  workingDays: WorkingDay[],
): ScheduleGrid {
  const activeDays = workingDays.filter((d) => d.is_active);
  const activeSlots = timeSlots.filter((s) => s.is_active && s.slot_type === "period");

  const grid: ScheduleGrid = {};
  for (const day of activeDays) {
    const dayRow: Record<string, ScheduleCell> = {};
    for (const slot of activeSlots) {
      dayRow[slot.id] = { subject: "", teacher_name: null, is_locked: false };
    }
    grid[day.day_key] = dayRow;
  }
  return grid;
}

/**
 * Maps period numbers from API (1-based) to time slot IDs.
 * Period N maps to the Nth active period-type slot (sorted by slot_order).
 */
function buildPeriodToSlotMap(timeSlots: TimeSlot[]): Record<number, string> {
  const periodSlots = timeSlots
    .filter((s) => s.is_active && s.slot_type === "period")
    .sort((a, b) => a.slot_order - b.slot_order);

  const map: Record<number, string> = {};
  for (let i = 0; i < periodSlots.length; i++) {
    map[i + 1] = periodSlots[i].id;
  }
  return map;
}

/**
 * Inverse mapping: slot ID to period number (1-based).
 */
function buildSlotToPeriodMap(timeSlots: TimeSlot[]): Record<string, number> {
  const periodSlots = timeSlots
    .filter((s) => s.is_active && s.slot_type === "period")
    .sort((a, b) => a.slot_order - b.slot_order);

  const map: Record<string, number> = {};
  for (let i = 0; i < periodSlots.length; i++) {
    map[periodSlots[i].id] = i + 1;
  }
  return map;
}

function parseClassSelection(selectedClass: string): { grade: string; section: string } {
  return { grade: selectedClass, section: "" };
}

export function useSchedule(
  schoolId: string | null,
  timeSlots: TimeSlot[],
  workingDays: WorkingDay[],
) {
  const [grid, setGrid] = useState<ScheduleGrid | null>(null);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const saveSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the save success banner after 3 seconds
  useEffect(() => {
    if (saveSuccess) {
      saveSuccessTimerRef.current = setTimeout(() => {
        setSaveSuccess(false);
      }, 3_000);
    }
    return () => {
      if (saveSuccessTimerRef.current) {
        clearTimeout(saveSuccessTimerRef.current);
      }
    };
  }, [saveSuccess]);

  const fetchSchedule = useCallback(
    async (sid: string, grade: string, section: string) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ schoolId: sid, grade });
        if (section) {
          params.set("section", section);
        }

        const { response, payload } =
          await fetchJsonWithAuthorizedSession<ApiScheduleResponse>(
            `/api/web/salaries/schedule?${params}`,
          );

        const emptyGrid = buildEmptyGrid(timeSlots, workingDays);

        if (!response.ok || !payload?.ok || !payload.schedule) {
          setGrid(emptyGrid);
          return;
        }

        const periodToSlot = buildPeriodToSlotMap(timeSlots);
        const newGrid = { ...emptyGrid };

        for (const row of payload.schedule) {
          const dayKey = row.day;
          const slotId = periodToSlot[row.period];

          if (!slotId || !newGrid[dayKey]) continue;

          // Ensure we keep existing day row reference immutable
          newGrid[dayKey] = {
            ...newGrid[dayKey],
            [slotId]: {
              subject: row.session_type ?? "",
              teacher_name: row.teacher_id ?? null,
              is_locked: false,
            },
          };
        }

        setGrid(newGrid);
      } catch {
        setGrid(buildEmptyGrid(timeSlots, workingDays));
        setError("فشل تحميل الجدول");
      } finally {
        setLoading(false);
      }
    },
    [timeSlots, workingDays],
  );

  // Fetch whenever class/section/school changes
  useEffect(() => {
    if (!schoolId || !selectedClass || timeSlots.length === 0 || workingDays.length === 0) {
      if (!selectedClass) {
        setGrid(null);
      }
      return;
    }
    const { grade } = parseClassSelection(selectedClass);
    void fetchSchedule(schoolId, grade, selectedSection);
  }, [schoolId, selectedClass, selectedSection, fetchSchedule, timeSlots, workingDays]);

  const refresh = useCallback(async () => {
    if (!schoolId || !selectedClass) return;
    const { grade } = parseClassSelection(selectedClass);
    await fetchSchedule(schoolId, grade, selectedSection);
  }, [schoolId, selectedClass, selectedSection, fetchSchedule]);

  const updateCell = useCallback(
    (day: string, slotId: string, subject: string, teacher: string) => {
      setGrid((prev) => {
        if (!prev) return prev;
        const dayRow = prev[day];
        if (!dayRow) return prev;

        const existingCell = dayRow[slotId];
        if (existingCell?.is_locked) return prev;

        return {
          ...prev,
          [day]: {
            ...dayRow,
            [slotId]: {
              subject,
              teacher_name: teacher || null,
              is_locked: existingCell?.is_locked ?? false,
            },
          },
        };
      });
    },
    [],
  );

  const clearCell = useCallback((day: string, slotId: string) => {
    setGrid((prev) => {
      if (!prev) return prev;
      const dayRow = prev[day];
      if (!dayRow) return prev;

      const existingCell = dayRow[slotId];
      if (existingCell?.is_locked) return prev;

      return {
        ...prev,
        [day]: {
          ...dayRow,
          [slotId]: {
            subject: "",
            teacher_name: null,
            is_locked: false,
          },
        },
      };
    });
  }, []);

  const swapCells = useCallback(
    (day1: string, slot1: string, day2: string, slot2: string) => {
      setGrid((prev) => {
        if (!prev) return prev;

        const cell1 = prev[day1]?.[slot1];
        const cell2 = prev[day2]?.[slot2];
        if (!cell1 || !cell2) return prev;
        if (cell1.is_locked || cell2.is_locked) return prev;

        return {
          ...prev,
          [day1]: {
            ...prev[day1],
            [slot1]: { ...cell2 },
          },
          [day2]: {
            ...prev[day2],
            [slot2]: { ...cell1 },
          },
        };
      });
    },
    [],
  );

  const toggleLock = useCallback((day: string, slotId: string) => {
    setGrid((prev) => {
      if (!prev) return prev;
      const dayRow = prev[day];
      if (!dayRow) return prev;
      const cell = dayRow[slotId];
      if (!cell) return prev;

      return {
        ...prev,
        [day]: {
          ...dayRow,
          [slotId]: { ...cell, is_locked: !cell.is_locked },
        },
      };
    });
  }, []);

  const saveSchedule = useCallback(async () => {
    if (!schoolId || !selectedClass || !grid) return;

    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const slotToPeriod = buildSlotToPeriodMap(timeSlots);
      const rows: { day: string; period: number; session_type: string; teacher_id: string | null }[] = [];

      for (const [dayKey, dayRow] of Object.entries(grid)) {
        for (const [slotId, cell] of Object.entries(dayRow)) {
          const period = slotToPeriod[slotId];
          if (period == null) continue;
          if (!cell.subject) continue;

          rows.push({
            day: dayKey,
            period,
            session_type: cell.subject,
            teacher_id: cell.teacher_name ?? null,
          });
        }
      }

      const body = {
        school_id: schoolId,
        grade: selectedClass,
        section: selectedSection,
        rows,
      };

      const { response, payload } =
        await fetchJsonWithAuthorizedSession<SaveResponse>(
          `/api/web/salaries/schedule`,
          {
            method: "PUT",
            headers: withJsonHeaders(),
            body: JSON.stringify(body),
          },
        );

      if (!response.ok || !payload?.ok) {
        setError("فشل حفظ الجدول");
        return;
      }

      setSaveSuccess(true);
    } catch {
      setError("فشل حفظ الجدول");
    } finally {
      setSaving(false);
    }
  }, [schoolId, selectedClass, selectedSection, grid, timeSlots]);

  return {
    grid,
    selectedClass,
    setSelectedClass,
    selectedSection,
    setSelectedSection,
    loading,
    saving,
    error,
    saveSuccess,
    saveSchedule,
    updateCell,
    clearCell,
    swapCells,
    toggleLock,
    refresh,
  };
}

export default useSchedule;
