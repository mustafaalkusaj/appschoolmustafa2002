"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  BookOpen,
  GraduationCap,
} from "lucide-react";
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

interface AssignmentEvent {
  id: string;
  title: string;
  subject: string | null;
  due_at: string;
  content_kind: string;
  is_past: boolean;
}

interface ExamEvent {
  id: string;
  title: string;
  subject: string;
  date: string;
  total_marks: number | null;
}

interface CalendarEvent {
  id: string;
  title: string;
  subject: string;
  date: string;
  type: "assignment" | "exam";
  extra: string | null;
}

const MONTHS_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function parseMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
}

function formatMonthLabel(key: string, isAr: boolean): string {
  const [year, monthIdx] = key.split("-");
  const idx = parseInt(monthIdx, 10);
  const monthName = isAr ? MONTHS_AR[idx] : MONTHS_EN[idx];
  return `${monthName} ${year}`;
}

function formatDayLabel(dateStr: string, isAr: boolean): string {
  const d = new Date(dateStr);
  const day = d.getDate();
  const month = isAr ? MONTHS_AR[d.getMonth()] : MONTHS_EN[d.getMonth()];
  return `${day} ${month}`;
}

export default function StudentCalendarPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const combined: CalendarEvent[] = [];

    Promise.all([
      fetchJsonWithAuthorizedSession("/api/student/assignments"),
      fetchJsonWithAuthorizedSession("/api/student/exams"),
    ])
      .then(([assignRes, examRes]) => {
        if (assignRes.response.ok) {
          const assignments: AssignmentEvent[] =
            (assignRes.payload as { data: AssignmentEvent[] })?.data ?? [];
          for (const a of assignments) {
            combined.push({
              id: `a-${a.id}`,
              title: a.title,
              subject: a.subject ?? a.content_kind,
              date: a.due_at,
              type: "assignment",
              extra: null,
            });
          }
        }

        if (examRes.response.ok) {
          const exams: ExamEvent[] =
            (examRes.payload as { data: ExamEvent[] })?.data ?? [];
          for (const e of exams) {
            combined.push({
              id: `e-${e.id}`,
              title: e.title,
              subject: e.subject,
              date: e.date,
              type: "exam",
              extra:
                e.total_marks != null
                  ? `${t("من", "out of")} ${e.total_marks}`
                  : null,
            });
          }
        }

        combined.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
        setEvents(combined);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const grouped = events.reduce<Record<string, CalendarEvent[]>>(
    (acc, ev) => {
      const key = parseMonthKey(ev.date);
      if (!acc[key]) acc[key] = [];
      acc[key].push(ev);
      return acc;
    },
    {},
  );

  const monthKeys = Object.keys(grouped).sort();

  return (
    <StudentShell
      currentPath="/student/calendar"
      titleAr="تقويمي"
      titleEn="My Calendar"
    >
      <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <div className="h-8 w-40 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse" />
                <div className="h-20 rounded-xl sm:rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse" />
                <div className="h-20 rounded-xl sm:rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            icon={
              <CalendarDays className="h-12 w-12 text-[var(--text-tertiary)]" />
            }
            title={t("لا توجد أحداث", "No events")}
            description={t(
              "لا توجد واجبات أو امتحانات مجدولة",
              "No assignments or exams scheduled",
            )}
          />
        ) : (
          monthKeys.map((monthKey) => (
            <div key={monthKey} className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <CalendarDays className="h-4 w-4 text-[var(--primary)]" />
                <h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">
                  {formatMonthLabel(monthKey, isAr)}
                </h2>
                <span className="text-xs text-[var(--text-muted)]">
                  ({grouped[monthKey].length}{" "}
                  {t("حدث", grouped[monthKey].length === 1 ? "event" : "events")})
                </span>
              </div>

              <div className="space-y-2">
                {grouped[monthKey].map((ev) => {
                  const isExam = ev.type === "exam";
                  return (
                    <div
                      key={ev.id}
                      className="flex items-center gap-3 sm:gap-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3 sm:p-4 hover:bg-[var(--surface-soft)] active:scale-[0.98] transition-all"
                    >
                      <div
                        className="shrink-0 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl"
                        style={{
                          background: isExam
                            ? "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(167,139,250,0.18))"
                            : "linear-gradient(135deg, rgba(6,182,212,0.12), rgba(59,130,246,0.18))",
                        }}
                      >
                        {isExam ? (
                          <GraduationCap
                            className="h-5 w-5 sm:h-6 sm:w-6"
                            style={{ color: "#8b5cf6" }}
                          />
                        ) : (
                          <BookOpen
                            className="h-5 w-5 sm:h-6 sm:w-6"
                            style={{ color: "#0891b2" }}
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] truncate">
                              {ev.title}
                            </p>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">
                              {ev.subject}
                              {ev.extra ? ` · ${ev.extra}` : ""}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-xs font-medium text-[var(--text-secondary)]">
                              {formatDayLabel(ev.date, isAr)}
                            </span>
                            <Badge
                              variant={isExam ? "info" : "neutral"}
                              size="sm"
                            >
                              {isExam
                                ? t("امتحان", "Exam")
                                : t("واجب", "Assignment")}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </StudentShell>
  );
}
