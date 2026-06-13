"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";

export type CalendarEvent = {
  id: string;
  title: string;
  title_en: string | null;
  date: string;
  end_date: string | null;
  type:
    | "holiday"
    | "religious"
    | "national"
    | "school"
    | "exam"
    | "vacation"
    | "custom";
  hijri_date: string | null;
  description: string | null;
  color: string | null;
  is_global: boolean;
  is_recurring: boolean;
  school_id: string | null;
  created_at: string;
};

export const EVENT_TYPE_CONFIG = {
  holiday: { label: "عطلة رسمية", color: "#ef4444", bg: "#fef2f2", border: "#fecaca" },
  religious: { label: "مناسبة دينية", color: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0" },
  national: { label: "يوم وطني", color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
  exam: { label: "امتحانات", color: "#f97316", bg: "#fff7ed", border: "#fed7aa" },
  vacation: { label: "إجازة مدرسية", color: "#a855f7", bg: "#faf5ff", border: "#e9d5ff" },
  school: { label: "حدث مدرسي", color: "#eab308", bg: "#fefce8", border: "#fef08a" },
  custom: { label: "مخصص", color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" },
} as const;

export function useCalendarEvents(schoolId: string | null | undefined) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1); // 1-12

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        year: year.toString(),
        month: month.toString(),
      });
      if (schoolId) {
        params.set("schoolId", schoolId);
      }

      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean;
        events: CalendarEvent[];
        error?: { message: string };
      }>(`/api/web/calendar/events?${params.toString()}`);

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "تعذر تحميل التقويم");
      }

      setEvents(payload?.events ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }, [schoolId, year, month]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  // Events grouped by date string "YYYY-MM-DD"
  const eventsByDate = events.reduce<Record<string, CalendarEvent[]>>((acc, ev) => {
    if (!acc[ev.date]) acc[ev.date] = [];
    acc[ev.date].push(ev);
    return acc;
  }, {});

  // Upcoming events (from today forward, sorted ascending)
  const today = new Date().toISOString().split("T")[0];
  const upcomingEvents = events
    .filter((ev) => ev.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  return {
    events,
    eventsByDate,
    upcomingEvents,
    loading,
    error,
    year,
    month,
    setYear,
    setMonth,
    refetch: fetchEvents,
  };
}
