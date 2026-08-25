"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FileText, Clock, CheckCircle2 } from "lucide-react";
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

interface Assignment {
  id: string;
  title: string;
  subject: string | null;
  due_at: string;
  content_kind: string;
  description: string | null;
  created_at: string;
  is_past: boolean;
}

export default function StudentAssignmentsPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJsonWithAuthorizedSession("/api/student/assignments")
      .then((res) => {
        if (res.response.ok)
          setAssignments(
            ((res.payload as { data: Assignment[] })?.data ?? []),
          );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const upcoming = assignments.filter((a) => !a.is_past);
  const past = assignments.filter((a) => a.is_past);

  function daysUntil(dateStr: string) {
    return Math.ceil(
      (new Date(dateStr).getTime() - Date.now()) / 86400000,
    );
  }

  return (
    <StudentShell
      currentPath="/student/assignments"
      titleAr="واجباتي"
      titleEn="My Assignments"
    >
      <div className="space-y-6 max-w-4xl mx-auto">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse"
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
              "لم يتم تعيين واجبات لصفك بعد",
              "No assignments have been set for your class yet",
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
                    <CardTitle className="text-base">
                      {t("الواجبات القادمة", "Upcoming")} ({upcoming.length})
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcoming.map((a) => {
                      const days = daysUntil(a.due_at);
                      const urgent = days <= 2;
                      return (
                        <div
                          key={a.id}
                          className="rounded-xl border border-[var(--card-border)] p-4 hover:bg-[var(--surface-strong)] transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-[var(--text-primary)]">
                                {a.title}
                              </p>
                              <p className="text-xs text-[var(--text-muted)] mt-1">
                                {a.subject ?? a.content_kind} ·{" "}
                                {t("تاريخ التسليم:", "Due:")}{" "}
                                {a.due_at}
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
                    <CheckCircle2 className="h-5 w-5 text-[var(--text-muted)]" />
                    <CardTitle className="text-base text-[var(--text-muted)]">
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
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                              {a.title}
                            </p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                              {a.subject ?? a.content_kind} · {a.due_at}
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
    </StudentShell>
  );
}
