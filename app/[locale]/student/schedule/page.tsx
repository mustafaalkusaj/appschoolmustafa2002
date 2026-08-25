"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Calendar, User, MapPin } from "lucide-react";
import { StudentShell } from "@/components/StudentShell";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

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

const DAY_ORDER = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "saturday",
];

const JS_DAY_MAP: Record<number, string> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

export default function StudentSchedulePage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const todayKey = JS_DAY_MAP[new Date().getDay()] ?? "";

  useEffect(() => {
    fetchJsonWithAuthorizedSession("/api/student/schedule")
      .then((res) => {
        if (res.response.ok)
          setSlots((res.payload as any)?.data?.slots ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const grouped = DAY_ORDER.reduce<Record<string, ScheduleSlot[]>>(
    (acc, day) => {
      const daySlots = slots.filter(
        (s) => s.day_of_week.toLowerCase() === day,
      );
      if (daySlots.length > 0) {
        acc[day] = daySlots.sort((a, b) =>
          a.start_time.localeCompare(b.start_time),
        );
      }
      return acc;
    },
    {},
  );

  return (
    <StudentShell
      currentPath="/student/schedule"
      titleAr="جدولي"
      titleEn="My Schedule"
    >
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-[160px] rounded-[var(--card-radius)] bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse"
              />
            ))}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <EmptyState
            icon={
              <Calendar className="h-12 w-12 text-[var(--text-tertiary)]" />
            }
            title={t("لا يوجد جدول حالياً", "No schedule available")}
          />
        ) : (
          Object.entries(grouped).map(([day, daySlots]) => {
            const label = DAY_LABELS[day];
            const isToday = day === todayKey;
            return (
              <Card
                key={day}
                className={
                  isToday
                    ? "ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--bg-primary)]"
                    : ""
                }
              >
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Calendar
                      className={`h-5 w-5 ${isToday ? "text-[var(--primary)]" : "text-[var(--text-muted)]"}`}
                    />
                    <CardTitle className="text-sm sm:text-base">
                      {label ? (isAr ? label.ar : label.en) : day}
                    </CardTitle>
                    {isToday && (
                      <Badge variant="primary" size="sm">
                        {t("اليوم", "Today")}
                      </Badge>
                    )}
                    <span className="text-xs text-[var(--text-muted)] ms-auto">
                      {daySlots.length}{" "}
                      {t("حصص", "classes")}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {daySlots.map((slot, idx) => (
                      <div
                        key={slot.id}
                        className={`flex items-center gap-2 sm:gap-3 rounded-lg p-2.5 sm:p-3 ${
                          isToday
                            ? "border border-[var(--primary)]/15 bg-[var(--primary)]/[0.04]"
                            : "border border-[var(--card-border)]"
                        } hover:bg-[var(--card-bg)] active:scale-[0.98] transition-all`}
                      >
                        <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-[var(--primary)]/10">
                          <span className="text-xs font-bold text-[var(--primary)]">
                            {idx + 1}
                          </span>
                        </div>

                        <div className="shrink-0 text-center min-w-[70px]">
                          <p className="text-xs font-mono font-semibold text-[var(--text-primary)]">
                            {slot.start_time?.slice(0, 5)}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)]">
                            {slot.end_time?.slice(0, 5)}
                          </p>
                        </div>

                        <div className="h-8 w-px bg-[var(--border)]" />

                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-[var(--text-primary)] truncate">
                            {slot.subject_name}
                          </p>
                          {slot.teacher_name && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <User className="h-3 w-3 text-[var(--text-muted)]" />
                              <p className="text-xs text-[var(--text-muted)] truncate">
                                {slot.teacher_name}
                              </p>
                            </div>
                          )}
                        </div>

                        {slot.room && (
                          <div className="flex items-center gap-1 shrink-0">
                            <MapPin className="h-3 w-3 text-[var(--text-muted)]" />
                            <Badge variant="neutral" size="sm">
                              {slot.room}
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </StudentShell>
  );
}
