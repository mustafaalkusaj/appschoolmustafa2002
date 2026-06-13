"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { resolveSchoolIdForProfile } from "@/lib/school/context";
import type { UserProfile } from "@/lib/auth";

export type TimeSlot = {
  id: string;
  slot_order: number;
  slot_type: "period" | "break";
  name_ar: string;
  name_en?: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  is_active: boolean;
};

export type WorkingDay = {
  id: string;
  day_key: string;
  name_ar: string;
  name_en: string;
  day_order: number;
  is_active: boolean;
};

export type ScheduleEntry = {
  id?: string;
  day_of_week: string;
  period_number: number;
  time_slot_id?: string | null;
  subject: string;
  teacher_name?: string | null;
  is_locked?: boolean;
  class_name?: string;
  section?: string;
};

// [day_key][period_number] -> entry
export type ScheduleGrid = Record<string, Record<number, ScheduleEntry>>;

export function useScheduleData({
  profile,
  selectedSchoolId,
  scopeLoading,
}: {
  profile: UserProfile | null;
  selectedSchoolId: string | null;
  scopeLoading: boolean;
}) {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [workingDays, setWorkingDays] = useState<WorkingDay[]>([]);
  const [scheduleGrid, setScheduleGrid] = useState<ScheduleGrid>({});
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedClass, setSelectedClassRaw] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [editMode, setEditMode] = useState(false);

  const getSchoolId = useCallback(async () => {
    return resolveSchoolIdForProfile(profile, { selectedSchoolId });
  }, [profile, selectedSchoolId]);

  const loadConfig = useCallback(async () => {
    if (!profile || scopeLoading) return;
    const schoolId = await getSchoolId();
    if (!schoolId) return;

    setConfigLoading(true);
    try {
      const [slotsResult, daysResult] = await Promise.all([
        fetchJsonWithAuthorizedSession<{ ok: boolean; slots: TimeSlot[] }>(
          `/api/web/schedule/time-slots?schoolId=${schoolId}`
        ),
        fetchJsonWithAuthorizedSession<{ ok: boolean; days: WorkingDay[] }>(
          `/api/web/schedule/working-days?schoolId=${schoolId}`
        ),
      ]);

      if (slotsResult.payload?.ok) setTimeSlots(slotsResult.payload.slots ?? []);
      if (daysResult.payload?.ok) setWorkingDays(daysResult.payload.days ?? []);
    } finally {
      setConfigLoading(false);
    }
  }, [profile, scopeLoading, getSchoolId]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const loadSchedule = useCallback(async (className: string, section: string) => {
    if (!className.trim()) return;
    const schoolId = await getSchoolId();
    if (!schoolId) return;

    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ schoolId, className: className.trim() });
      if (section.trim()) params.set("section", section.trim());

      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean;
        schedule: ScheduleEntry[];
      }>(`/api/web/schedule?${params}`);

      if (!response.ok) {
        setError("تعذر تحميل الجدول.");
        return;
      }

      const grid: ScheduleGrid = {};
      for (const entry of (payload?.schedule ?? [])) {
        if (!grid[entry.day_of_week]) grid[entry.day_of_week] = {};
        grid[entry.day_of_week][entry.period_number] = entry;
      }
      setScheduleGrid(grid);
    } finally {
      setLoading(false);
    }
  }, [getSchoolId]);

  useEffect(() => {
    if (selectedClass.trim()) {
      void loadSchedule(selectedClass, selectedSection);
    } else {
      setScheduleGrid({});
    }
  }, [selectedClass, selectedSection, loadSchedule]);

  const setSelectedClass = useCallback((v: string) => {
    setSelectedClassRaw(v);
    setEditMode(false);
  }, []);

  const updateCell = useCallback((
    dayKey: string,
    periodNumber: number,
    data: Partial<ScheduleEntry>
  ) => {
    setScheduleGrid(prev => ({
      ...prev,
      [dayKey]: {
        ...(prev[dayKey] ?? {}),
        [periodNumber]: {
          ...(prev[dayKey]?.[periodNumber] ?? { day_of_week: dayKey, period_number: periodNumber, subject: "" }),
          ...data,
        },
      },
    }));
  }, []);

  const clearCell = useCallback((dayKey: string, periodNumber: number) => {
    setScheduleGrid(prev => {
      const next = { ...prev };
      if (next[dayKey]) {
        const dayGrid = { ...next[dayKey] };
        delete dayGrid[periodNumber];
        next[dayKey] = dayGrid;
      }
      return next;
    });
  }, []);

  const save = useCallback(async () => {
    if (!selectedClass.trim()) return;
    const schoolId = await getSchoolId();
    if (!schoolId) return;

    setSaving(true);
    setError("");
    try {
      const entries: ScheduleEntry[] = [];
      for (const [day, periods] of Object.entries(scheduleGrid)) {
        for (const [period, entry] of Object.entries(periods)) {
          if (entry.subject?.trim()) {
            entries.push({
              day_of_week: day,
              period_number: Number(period),
              subject: entry.subject.trim(),
              teacher_name: entry.teacher_name?.trim() || null,
              time_slot_id: entry.time_slot_id ?? null,
              is_locked: entry.is_locked ?? false,
            });
          }
        }
      }

      const { response } = await fetchJsonWithAuthorizedSession("/api/web/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_id: schoolId,
          class_name: selectedClass.trim(),
          section: selectedSection.trim(),
          entries,
        }),
      });

      if (!response.ok) {
        setError("تعذر حفظ الجدول.");
      } else {
        setSuccess("تم حفظ الجدول بنجاح ✓");
        setEditMode(false);
        setTimeout(() => setSuccess(""), 3000);
      }
    } finally {
      setSaving(false);
    }
  }, [selectedClass, selectedSection, scheduleGrid, getSchoolId]);

  const activeDays = workingDays.filter(d => d.is_active);
  const periodSlots = timeSlots.filter(s => s.is_active && s.slot_type === "period");
  const filledCount = Object.values(scheduleGrid)
    .flatMap(d => Object.values(d))
    .filter(e => e.subject?.trim()).length;
  const totalCells = activeDays.length * periodSlots.length;

  return {
    timeSlots,
    workingDays,
    scheduleGrid,
    loading,
    configLoading,
    saving,
    error,
    success,
    selectedClass,
    setSelectedClass,
    selectedSection,
    setSelectedSection,
    editMode,
    setEditMode,
    updateCell,
    clearCell,
    save,
    filledCount,
    emptyCount: Math.max(0, totalCells - filledCount),
    totalCells,
    reload: () => { if (selectedClass.trim()) void loadSchedule(selectedClass, selectedSection); },
  };
}
