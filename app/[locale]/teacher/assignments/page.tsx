"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FileText, Clock, Plus, BookOpen } from "lucide-react";
import { TeacherShell } from "@/components/TeacherShell";
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

interface Assignment {
  id: string;
  title: string;
  class_name: string | null;
  subject: string | null;
  due_date: string;
  description: string | null;
  created_at: string;
  status: string | null;
}

export default function TeacherAssignmentsPage() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJsonWithAuthorizedSession("/api/teacher/assignments")
      .then((res) => {
        if (res.response.ok)
          setAssignments(
            ((res.payload as { data: Assignment[] })?.data ?? []),
          );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function daysUntil(dateStr: string) {
    return Math.ceil(
      (new Date(dateStr).getTime() - Date.now()) / 86400000,
    );
  }

  const upcoming = assignments.filter((a) => {
    const days = daysUntil(a.due_date);
    return days >= 0;
  });
  const past = assignments.filter((a) => {
    const days = daysUntil(a.due_date);
    return days < 0;
  });

  return (
    <TeacherShell
      currentPath="/teacher/assignments"
      titleAr="الواجبات"
      titleEn="Assignments"
      actions={
        <button
          onClick={() => router.push(`/${locale}/teacher/assignments/new`)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--card-radius)] bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          {t("اضافة واجب", "Add Assignment")}
        </button>
      }
    >
      <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 rounded-xl sm:rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse"
              />
            ))}
          </div>
        ) : assignments.length === 0 ? (
          <EmptyState
            icon={
              <FileText className="h-12 w-12 text-[var(--text-tertiary)]" />
            }
            title={t("لا توجد واجبات", "No assignments")}
            description={t(
              "لم تقم باضافة اي واجب بعد",
              "You haven't added any assignments yet",
            )}
          />
        ) : (
          <>
            {upcoming.length > 0 && (
              <Card className="rounded-2xl">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Clock
                      className="h-5 w-5"
                      style={{ color: "#8b5cf6" }}
                    />
                    <CardTitle className="text-sm sm:text-base">
                      {t("الواجبات القادمة", "Upcoming")} ({upcoming.length})
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcoming.map((a) => {
                      const days = daysUntil(a.due_date);
                      const urgent = days <= 2;
                      return (
                        <div
                          key={a.id}
                          className="rounded-xl border border-[var(--card-border)] p-4 hover:bg-[var(--surface-strong)] active:scale-[0.98] transition-all"
                        >
                          <div className="flex items-start justify-between gap-2 sm:gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                                {a.title}
                              </p>
                              <p className="text-xs text-[var(--text-muted)] mt-1">
                                {a.class_name && (
                                  <span>{a.class_name} · </span>
                                )}
                                {a.subject && <span>{a.subject} · </span>}
                                {t("تاريخ التسليم:", "Due:")}{" "}
                                {a.due_date}
                              </p>
                              {a.description && (
                                <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2">
                                  {a.description}
                                </p>
                              )}
                            </div>
                            <Badge
                              variant={urgent ? "danger" : "warning"}
                              size="sm"
                            >
                              {days <= 0
                                ? t("اليوم", "Today")
                                : `${days} ${t("يوم", "days")}`}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {past.length > 0 && (
              <Card className="rounded-2xl">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-[var(--text-muted)]" />
                    <CardTitle className="text-sm sm:text-base text-[var(--text-muted)]">
                      {t("واجبات سابقة", "Past")} ({past.length})
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {past.map((a) => (
                      <div
                        key={a.id}
                        className="rounded-xl border border-[var(--card-border)] p-4 opacity-60"
                      >
                        <div className="flex items-start justify-between gap-2 sm:gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-[var(--text-primary)]">
                              {a.title}
                            </p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                              {a.class_name && (
                                <span>{a.class_name} · </span>
                              )}
                              {a.subject && <span>{a.subject} · </span>}
                              {a.due_date}
                            </p>
                          </div>
                          <Badge variant="info" size="sm">
                            {t("انتهى", "Past")}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </TeacherShell>
  );
}
