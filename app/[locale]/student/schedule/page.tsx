"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { StudentShell } from "@/components/StudentShell";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";

interface ScheduleSlot {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  subject_name: string;
  teacher_name: string | null;
  room: string | null;
}

const DAY_LABELS: Record<string, { ar: string; en: string }> = {
  sunday: { ar: "الأحد", en: "Sunday" },
  monday: { ar: "الاثنين", en: "Monday" },
  tuesday: { ar: "الثلاثاء", en: "Tuesday" },
  wednesday: { ar: "الأربعاء", en: "Wednesday" },
  thursday: { ar: "الخميس", en: "Thursday" },
  saturday: { ar: "السبت", en: "Saturday" },
};

const DAY_ORDER = ["sunday", "monday", "tuesday", "wednesday", "thursday", "saturday"];

export default function StudentSchedulePage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJsonWithAuthorizedSession("/api/student/schedule")
      .then((res) => {
        if (res.response.ok) setSlots((res.payload as any)?.data?.slots ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const grouped = DAY_ORDER.reduce<Record<string, ScheduleSlot[]>>((acc, day) => {
    const daySlots = slots.filter((s) => s.day_of_week.toLowerCase() === day);
    if (daySlots.length > 0) {
      acc[day] = daySlots.sort((a, b) => a.start_time.localeCompare(b.start_time));
    }
    return acc;
  }, {});

  return (
    <StudentShell
      currentPath="/student/schedule"
      titleAr="جدولي"
      titleEn="My Schedule"
    >
      <div className="space-y-6">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="rounded-xl border p-8 text-center text-muted-foreground">
            <p className="text-4xl mb-2">🗓️</p>
            <p>{isAr ? "لا يوجد جدول حالياً" : "No schedule available"}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([day, daySlots]) => {
              const label = DAY_LABELS[day];
              return (
                <div key={day} className="rounded-xl border overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2.5 font-semibold text-sm">
                    {label ? (isAr ? label.ar : label.en) : day}
                  </div>
                  <div className="divide-y">
                    {daySlots.map((slot) => (
                      <div key={slot.id} className="flex items-center gap-4 px-4 py-3">
                        <div className="text-xs font-mono text-muted-foreground whitespace-nowrap min-w-[90px]">
                          {slot.start_time} – {slot.end_time}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{slot.subject_name}</p>
                          {slot.teacher_name && (
                            <p className="text-xs text-muted-foreground truncate">{slot.teacher_name}</p>
                          )}
                        </div>
                        {slot.room && (
                          <span className="text-xs bg-muted px-2 py-1 rounded-md whitespace-nowrap">
                            {slot.room}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </StudentShell>
  );
}
