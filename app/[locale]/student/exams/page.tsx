"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  GraduationCap,
  CalendarDays,
  Clock,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { StudentShell } from "@/components/StudentShell";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { StatsCard, KPIGrid } from "@/components/ui/stats-card";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

interface ExamRecord {
  id: string;
  subject_name: string;
  exam_date: string;
  exam_type: string | null;
  max_score: number | null;
  room: string | null;
}

export default function StudentExamsPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJsonWithAuthorizedSession("/api/student/exams")
      .then((res) => {
        if (res.response.ok)
          setExams((res.payload as any)?.data?.exams ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const now = new Date().toISOString().slice(0, 10);
  const upcoming = exams.filter((e) => e.exam_date >= now);
  const past = exams.filter((e) => e.exam_date < now);

  return (
    <StudentShell
      currentPath="/student/exams"
      titleAr="امتحاناتي"
      titleEn="My Exams"
    >
      <div className="space-y-4 sm:space-y-6">
        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[100px] rounded-[var(--card-radius)] bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse"
                />
              ))}
            </div>
            <div className="h-[300px] rounded-[var(--card-radius)] bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse" />
          </div>
        ) : exams.length === 0 ? (
          <EmptyState
            icon={
              <GraduationCap className="h-12 w-12 text-[var(--text-tertiary)]" />
            }
            title={t("لا توجد امتحانات", "No exams scheduled")}
          />
        ) : (
          <>
            <KPIGrid>
              <StatsCard
                label={t("امتحانات قادمة", "Upcoming")}
                value={String(upcoming.length)}
                icon={Clock}
                variant="info"
                description={
                  upcoming[0]
                    ? `${t("التالي:", "Next:")} ${upcoming[0].exam_date}`
                    : undefined
                }
              />
              <StatsCard
                label={t("امتحانات سابقة", "Completed")}
                value={String(past.length)}
                icon={CheckCircle2}
                variant="success"
              />
            </KPIGrid>

            <Tabs defaultValue="upcoming">
              <TabsList>
                <TabsTrigger value="upcoming">
                  {t("القادمة", "Upcoming")} ({upcoming.length})
                </TabsTrigger>
                <TabsTrigger value="past">
                  {t("السابقة", "Past")} ({past.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming">
                {upcoming.length === 0 ? (
                  <EmptyState
                    icon={
                      <CalendarDays className="h-10 w-10 text-[var(--text-tertiary)]" />
                    }
                    title={t(
                      "لا توجد امتحانات قادمة",
                      "No upcoming exams",
                    )}
                    className="py-8"
                  />
                ) : (
                  <div className="space-y-3 mt-4">
                    {upcoming.map((exam) => (
                      <ExamCard
                        key={exam.id}
                        exam={exam}
                        isAr={isAr}
                        t={t}
                        upcoming
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="past">
                {past.length === 0 ? (
                  <EmptyState
                    icon={
                      <CheckCircle2 className="h-10 w-10 text-[var(--text-tertiary)]" />
                    }
                    title={t("لا توجد امتحانات سابقة", "No past exams")}
                    className="py-8"
                  />
                ) : (
                  <div className="space-y-3 mt-4">
                    {past.map((exam) => (
                      <ExamCard
                        key={exam.id}
                        exam={exam}
                        isAr={isAr}
                        t={t}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </StudentShell>
  );
}

function ExamCard({
  exam,
  isAr,
  t,
  upcoming,
}: {
  exam: ExamRecord;
  isAr: boolean;
  t: (ar: string, en: string) => string;
  upcoming?: boolean;
}) {
  const daysLeft = upcoming
    ? Math.ceil(
        (new Date(exam.exam_date).getTime() - Date.now()) / 86400000,
      )
    : null;

  return (
    <Card
      className={
        upcoming
          ? "border-[var(--info)]/30"
          : ""
      }
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {upcoming && daysLeft != null ? (
            <div className="shrink-0 flex flex-col items-center justify-center rounded-xl bg-[var(--info)]/[0.08] px-4 py-2 min-w-[64px]">
              <span className="text-xl sm:text-2xl font-bold text-[var(--info)]">
                {daysLeft}
              </span>
              <span className="text-[10px] font-medium text-[var(--info)]">
                {t("يوم", "days")}
              </span>
            </div>
          ) : (
            <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--success)]/[0.08]">
              <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] truncate">
              {exam.subject_name}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              <div className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3 text-[var(--text-muted)]" />
                <span className="text-xs text-[var(--text-muted)]">
                  {exam.exam_date}
                </span>
              </div>
              {exam.exam_type && (
                <Badge variant="neutral" size="sm">
                  {exam.exam_type}
                </Badge>
              )}
              {exam.max_score && (
                <span className="text-xs text-[var(--text-muted)]">
                  {t("من", "out of")} {exam.max_score}
                </span>
              )}
            </div>
          </div>

          {exam.room && (
            <div className="flex items-center gap-1 shrink-0">
              <MapPin className="h-3 w-3 text-[var(--text-muted)]" />
              <Badge variant="neutral" size="sm">
                {exam.room}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
