"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";

export type TimeSlot = {
  id: string;
  name_ar: string;
  start_time: string;
  end_time: string;
  slot_type: "period" | "break";
  slot_order: number;
  is_active: boolean;
};

export type WorkingDay = {
  day_key: string;
  name_ar: string;
  day_order: number;
  is_active: boolean;
};

const DEFAULT_TIME_SLOTS: TimeSlot[] = [
  { id: "slot-1", name_ar: "الحصة الأولى", start_time: "07:30", end_time: "08:15", slot_type: "period", slot_order: 1, is_active: true },
  { id: "slot-2", name_ar: "الحصة الثانية", start_time: "08:15", end_time: "09:00", slot_type: "period", slot_order: 2, is_active: true },
  { id: "slot-3", name_ar: "استراحة", start_time: "09:00", end_time: "09:15", slot_type: "break", slot_order: 3, is_active: true },
  { id: "slot-4", name_ar: "الحصة الثالثة", start_time: "09:15", end_time: "10:00", slot_type: "period", slot_order: 4, is_active: true },
  { id: "slot-5", name_ar: "الحصة الرابعة", start_time: "10:00", end_time: "10:45", slot_type: "period", slot_order: 5, is_active: true },
  { id: "slot-6", name_ar: "استراحة", start_time: "10:45", end_time: "11:00", slot_type: "break", slot_order: 6, is_active: true },
  { id: "slot-7", name_ar: "الحصة الخامسة", start_time: "11:00", end_time: "11:45", slot_type: "period", slot_order: 7, is_active: true },
  { id: "slot-8", name_ar: "الحصة السادسة", start_time: "11:45", end_time: "12:30", slot_type: "period", slot_order: 8, is_active: true },
  { id: "slot-9", name_ar: "الحصة السابعة", start_time: "12:30", end_time: "13:15", slot_type: "period", slot_order: 9, is_active: true },
  { id: "slot-10", name_ar: "الحصة الثامنة", start_time: "13:15", end_time: "14:00", slot_type: "period", slot_order: 10, is_active: true },
];

const DEFAULT_WORKING_DAYS: WorkingDay[] = [
  { day_key: "sunday", name_ar: "الأحد", day_order: 0, is_active: true },
  { day_key: "monday", name_ar: "الاثنين", day_order: 1, is_active: true },
  { day_key: "tuesday", name_ar: "الثلاثاء", day_order: 2, is_active: true },
  { day_key: "wednesday", name_ar: "الأربعاء", day_order: 3, is_active: true },
  { day_key: "thursday", name_ar: "الخميس", day_order: 4, is_active: true },
];

export function useTimeSlotsSettings(schoolId: string | null) {
  const [slots, setSlots] = useState<TimeSlot[]>(DEFAULT_TIME_SLOTS);
  const [workingDays, setWorkingDays] = useState<WorkingDay[]>(DEFAULT_WORKING_DAYS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async (sid: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ schoolId: sid });

      const [slotsResult, daysResult] = await Promise.all([
        fetchJsonWithAuthorizedSession<{ ok: boolean; slots?: TimeSlot[] }>(
          `/api/web/schedule/time-slots?${params}`,
        ).catch(() => null),
        fetchJsonWithAuthorizedSession<{ ok: boolean; days?: WorkingDay[] }>(
          `/api/web/schedule/working-days?${params}`,
        ).catch(() => null),
      ]);

      if (
        slotsResult &&
        slotsResult.response.ok &&
        slotsResult.payload?.ok &&
        slotsResult.payload.slots &&
        slotsResult.payload.slots.length > 0
      ) {
        setSlots(slotsResult.payload.slots);
      } else {
        setSlots(DEFAULT_TIME_SLOTS);
      }

      if (
        daysResult &&
        daysResult.response.ok &&
        daysResult.payload?.ok &&
        daysResult.payload.days &&
        daysResult.payload.days.length > 0
      ) {
        setWorkingDays(daysResult.payload.days);
      } else {
        setWorkingDays(DEFAULT_WORKING_DAYS);
      }
    } catch {
      setSlots(DEFAULT_TIME_SLOTS);
      setWorkingDays(DEFAULT_WORKING_DAYS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!schoolId) {
      setSlots(DEFAULT_TIME_SLOTS);
      setWorkingDays(DEFAULT_WORKING_DAYS);
      return;
    }
    void fetchSettings(schoolId);
  }, [schoolId, fetchSettings]);

  const toggleDay = useCallback((dayKey: string) => {
    setWorkingDays((prev) =>
      prev.map((d) =>
        d.day_key === dayKey ? { ...d, is_active: !d.is_active } : d,
      ),
    );
  }, []);

  const saveWorkingDays = useCallback(async () => {
    if (!schoolId) return;
    setSaving(true);
    try {
      await fetchJsonWithAuthorizedSession(
        `/api/web/schedule/working-days`,
        {
          method: "PUT",
          headers: withJsonHeaders(),
          body: JSON.stringify({ school_id: schoolId, days: workingDays }),
        },
      );
    } catch {
      // endpoint may not exist yet — local state already updated
    } finally {
      setSaving(false);
    }
  }, [schoolId, workingDays]);

  return {
    slots,
    workingDays,
    loading,
    saving,
    toggleDay,
    saveWorkingDays,
  };
}

export default useTimeSlotsSettings;
