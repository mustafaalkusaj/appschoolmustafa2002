"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";

export type TimeSlot = {
  id: string;
  slot_order: number;
  slot_type: "period" | "break";
  name_ar: string;
  name_en: string | null;
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

type SlotsApiResponse = { ok: boolean; slots?: TimeSlot[]; message?: string };
type DaysApiResponse = { ok: boolean; days?: WorkingDay[]; message?: string };
type SimpleApiResponse = { ok: boolean; message?: string };

export function useTimeSlotsSettings(schoolId: string | null) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [workingDays, setWorkingDays] = useState<WorkingDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSlots = useCallback(async () => {
    if (!schoolId) return;
    const params = new URLSearchParams({ schoolId });
    const { response, payload } = await fetchJsonWithAuthorizedSession<SlotsApiResponse>(
      `/api/web/schedule/time-slots?${params}`,
    );
    if (response.ok && payload?.ok) {
      setSlots(payload.slots ?? []);
    } else {
      setError((payload as any)?.error?.message || payload?.message || "تعذر تحميل الحصص.");
    }
  }, [schoolId]);

  const fetchWorkingDays = useCallback(async () => {
    if (!schoolId) return;
    const params = new URLSearchParams({ schoolId });
    const { response, payload } = await fetchJsonWithAuthorizedSession<DaysApiResponse>(
      `/api/web/schedule/working-days?${params}`,
    );
    if (response.ok && payload?.ok) {
      setWorkingDays(payload.days ?? []);
    } else {
      setError((payload as any)?.error?.message || payload?.message || "تعذر تحميل أيام الدوام.");
    }
  }, [schoolId]);

  const fetchAll = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchSlots(), fetchWorkingDays()]);
    } catch {
      setError("تعذر الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  }, [schoolId, fetchSlots, fetchWorkingDays]);

  useEffect(() => {
    if (schoolId) {
      void fetchAll();
    } else {
      setSlots([]);
      setWorkingDays([]);
    }
  }, [schoolId, fetchAll]);

  const addSlot = useCallback(
    async (type: "period" | "break") => {
      if (!schoolId) return;
      setSaving(true);
      setError(null);
      try {
        const isPeriod = type === "period";
        const periodCount = slots.filter((s) => s.slot_type === "period").length + (isPeriod ? 1 : 0);
        const breakCount = slots.filter((s) => s.slot_type === "break").length + (isPeriod ? 0 : 1);
        const { response, payload } = await fetchJsonWithAuthorizedSession<SimpleApiResponse>(
          "/api/web/schedule/time-slots",
          {
            method: "POST",
            headers: withJsonHeaders(),
            body: JSON.stringify({
              school_id: schoolId,
              slot_type: type,
              name_ar: isPeriod ? `الحصة ${periodCount}` : `الاستراحة ${breakCount}`,
              name_en: isPeriod ? `Period ${periodCount}` : `Break ${breakCount}`,
              start_time: "08:00",
              end_time: "08:45",
              duration_minutes: isPeriod ? 45 : 15,
            }),
          },
        );
        if (response.ok && payload?.ok) {
          await fetchSlots();
        } else {
          setError((payload as any)?.error?.message || payload?.message || "تعذر إضافة الحصة.");
        }
      } catch {
        setError("تعذر الاتصال بالخادم.");
      } finally {
        setSaving(false);
      }
    },
    [schoolId, slots, fetchSlots],
  );

  const updateSlot = useCallback((id: string, fields: Partial<TimeSlot>) => {
    setSlots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...fields } : s)),
    );
  }, []);

  const saveSlots = useCallback(async () => {
    if (!schoolId || slots.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const updates = slots.map((s) => ({
        id: s.id,
        name_ar: s.name_ar,
        name_en: s.name_en,
        start_time: s.start_time,
        end_time: s.end_time,
        duration_minutes: s.duration_minutes,
        is_active: s.is_active,
      }));
      const { response, payload } = await fetchJsonWithAuthorizedSession<SimpleApiResponse>(
        "/api/web/schedule/time-slots",
        {
          method: "PUT",
          headers: withJsonHeaders(),
          body: JSON.stringify({ school_id: schoolId, updates }),
        },
      );
      if (!response.ok || !payload?.ok) {
        setError((payload as any)?.error?.message || payload?.message || "تعذر حفظ الحصص.");
      }
    } catch {
      setError("تعذر الاتصال بالخادم.");
    } finally {
      setSaving(false);
    }
  }, [schoolId, slots]);

  const deleteSlot = useCallback(
    async (id: string) => {
      if (!schoolId) return;
      setSaving(true);
      setError(null);
      try {
        const params = new URLSearchParams({ id, schoolId });
        const { response, payload } = await fetchJsonWithAuthorizedSession<SimpleApiResponse>(
          `/api/web/schedule/time-slots?${params}`,
          { method: "DELETE" },
        );
        if (response.ok && payload?.ok) {
          await fetchSlots();
        } else {
          setError((payload as any)?.error?.message || payload?.message || "تعذر حذف الحصة.");
        }
      } catch {
        setError("تعذر الاتصال بالخادم.");
      } finally {
        setSaving(false);
      }
    },
    [schoolId, fetchSlots],
  );

  const reorderSlots = useCallback(
    async (newSlots: TimeSlot[]) => {
      if (!schoolId) return;
      setError(null);
      // Optimistic update
      setSlots(newSlots);
      try {
        const order = newSlots.map((s) => s.id);
        const params = new URLSearchParams({ action: "reorder" });
        const { response, payload } = await fetchJsonWithAuthorizedSession<SimpleApiResponse>(
          `/api/web/schedule/time-slots?${params}`,
          {
            method: "PUT",
            headers: withJsonHeaders(),
            body: JSON.stringify({ school_id: schoolId, order }),
          },
        );
        if (!response.ok || !payload?.ok) {
          setError((payload as any)?.error?.message || payload?.message || "تعذر إعادة الترتيب.");
          await fetchSlots(); // revert
        }
      } catch {
        setError("تعذر الاتصال بالخادم.");
        await fetchSlots(); // revert
      }
    },
    [schoolId, fetchSlots],
  );

  const toggleDay = useCallback((dayKey: string) => {
    setWorkingDays((prev) =>
      prev.map((d) => (d.day_key === dayKey ? { ...d, is_active: !d.is_active } : d)),
    );
  }, []);

  const saveWorkingDays = useCallback(async () => {
    if (!schoolId || workingDays.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const days = workingDays.map((d) => ({
        day_key: d.day_key,
        is_active: d.is_active,
        day_order: d.day_order,
      }));
      const { response, payload } = await fetchJsonWithAuthorizedSession<SimpleApiResponse>(
        "/api/web/schedule/working-days",
        {
          method: "PUT",
          headers: withJsonHeaders(),
          body: JSON.stringify({ school_id: schoolId, days }),
        },
      );
      if (!response.ok || !payload?.ok) {
        setError((payload as any)?.error?.message || payload?.message || "تعذر حفظ أيام الدوام.");
      }
    } catch {
      setError("تعذر الاتصال بالخادم.");
    } finally {
      setSaving(false);
    }
  }, [schoolId, workingDays]);

  /**
   * Auto-fill: recalculates start/end times for all slots sequentially.
   * Pure client-side — no API call. User must call saveSlots() after.
   */
  const autoFill = useCallback(
    (startTime: string, periodDuration: number, breakDuration: number) => {
      if (!startTime || periodDuration <= 0) return;

      const [startH, startM] = startTime.split(":").map(Number);
      let currentMinutes = startH * 60 + startM;

      const toHHMM = (minutes: number): string => {
        const h = Math.floor(minutes / 60) % 24;
        const m = minutes % 60;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      };

      setSlots((prev) =>
        prev.map((slot) => {
          const duration = slot.slot_type === "period" ? periodDuration : breakDuration;
          const slotStart = currentMinutes;
          const slotEnd = currentMinutes + duration;
          currentMinutes = slotEnd;
          return {
            ...slot,
            start_time: toHHMM(slotStart),
            end_time: toHHMM(slotEnd),
            duration_minutes: duration,
          };
        }),
      );
    },
    [],
  );

  return {
    slots,
    workingDays,
    loading,
    saving,
    error,
    fetchAll,
    fetchSlots,
    fetchWorkingDays,
    addSlot,
    updateSlot,
    saveSlots,
    deleteSlot,
    reorderSlots,
    toggleDay,
    saveWorkingDays,
    autoFill,
  };
}
