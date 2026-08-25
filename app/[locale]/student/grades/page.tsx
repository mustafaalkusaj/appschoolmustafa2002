"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { TrendingUp, BookOpen, Award } from "lucide-react";
import { StudentShell } from "@/components/StudentShell";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { StatsCard, KPIGrid } from "@/components/ui/stats-card";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";

interface GradeRecord {
  id: string;
  subject_name: string;
  exam_name: string | null;
  score: number;
  max_score: number;
  percentage: number;
  date: string | null;
  type: string | null;
}

export default function StudentGradesPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJsonWithAuthorizedSession("/api/student/grades")
      .then((res) => {
        if (res.response.ok)
          setGrades((res.payload as any)?.data?.grades ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalGrades = grades.length;
  const avgPercentage =
    totalGrades > 0
      ? Math.round(grades.reduce((s, g) => s + g.percentage, 0) / totalGrades)
      : 0;
  const highestGrade =
    totalGrades > 0 ? Math.max(...grades.map((g) => g.percentage)) : 0;

  const subjectGroups = grades.reduce<Record<string, GradeRecord[]>>(
    (acc, g) => {
      const key = g.subject_name;
      if (!acc[key]) acc[key] = [];
      acc[key].push(g);
      return acc;
    },
    {},
  );

  return (
    <StudentShell
      currentPath="/student/grades"
      titleAr="درجاتي"
      titleEn="My Grades"
    >
      <div className="space-y-4 sm:space-y-6">
        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[100px] rounded-[var(--card-radius)] bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse"
                />
              ))}
            </div>
            <div className="h-[300px] rounded-[var(--card-radius)] bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse" />
          </div>
        ) : grades.length === 0 ? (
          <EmptyState
            icon={
              <TrendingUp className="h-12 w-12 text-[var(--text-tertiary)]" />
            }
            title={t("لا توجد درجات مسجلة", "No grades recorded")}
          />
        ) : (
          <>
            <KPIGrid>
              <StatsCard
                label={t("عدد الدرجات", "Total Grades")}
                value={String(totalGrades)}
                icon={BookOpen}
                variant="info"
              />
              <StatsCard
                label={t("المعدل العام", "Average")}
                value={`${avgPercentage}%`}
                icon={TrendingUp}
                variant={
                  avgPercentage >= 80
                    ? "success"
                    : avgPercentage >= 50
                      ? "warning"
                      : "danger"
                }
              />
              <StatsCard
                label={t("أعلى درجة", "Highest")}
                value={`${highestGrade}%`}
                icon={Award}
                variant="success"
              />
            </KPIGrid>

            {Object.entries(subjectGroups).map(([subject, subGrades]) => {
              const subAvg = Math.round(
                subGrades.reduce((s, g) => s + g.percentage, 0) /
                  subGrades.length,
              );
              return (
                <Card key={subject}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm sm:text-base">{subject}</CardTitle>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--text-muted)]">
                          {t("المعدل", "Avg")}
                        </span>
                        <Badge
                          variant={
                            subAvg >= 80
                              ? "success"
                              : subAvg >= 50
                                ? "warning"
                                : "danger"
                          }
                          size="sm"
                        >
                          {subAvg}%
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {subGrades.map((g) => (
                        <div key={g.id} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs sm:text-sm text-[var(--text-primary)] truncate">
                                {g.exam_name ?? g.type ?? t("اختبار", "Exam")}
                              </span>
                              {g.date && (
                                <span className="text-xs text-[var(--text-muted)] shrink-0">
                                  {g.date}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                                {g.score}/{g.max_score}
                              </span>
                              <Badge
                                variant={
                                  g.percentage >= 80
                                    ? "success"
                                    : g.percentage >= 50
                                      ? "warning"
                                      : "danger"
                                }
                                size="sm"
                              >
                                {g.percentage}%
                              </Badge>
                            </div>
                          </div>
                          <Progress
                            value={g.percentage}
                            className="h-1.5"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}
      </div>
    </StudentShell>
  );
}
