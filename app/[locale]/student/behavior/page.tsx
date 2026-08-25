"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Star,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Award,
} from "lucide-react";
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
import { EmptyState } from "@/components/ui/empty-state";

interface BehaviorRecord {
  id: string;
  date: string;
  type: "positive" | "negative";
  points: number;
  reason: string | null;
  teacher_name: string | null;
}

export default function StudentBehaviorPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [records, setRecords] = useState<BehaviorRecord[]>([]);
  const [totalPoints, setTotalPoints] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJsonWithAuthorizedSession("/api/student/behavior")
      .then((res) => {
        if (res.response.ok) {
          const d = (res.payload as any)?.data;
          setRecords(d?.records ?? []);
          setTotalPoints(d?.total_points ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const positiveCount = records.filter((r) => r.type === "positive").length;
  const negativeCount = records.filter((r) => r.type === "negative").length;
  const positivePoints = records
    .filter((r) => r.type === "positive")
    .reduce((s, r) => s + r.points, 0);
  const negativePoints = records
    .filter((r) => r.type === "negative")
    .reduce((s, r) => s + r.points, 0);

  return (
    <StudentShell
      currentPath="/student/behavior"
      titleAr="سلوكي"
      titleEn="My Behavior"
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
        ) : (
          <>
            {totalPoints != null && (
              <Card>
                <CardContent className="pt-[var(--card-padding)]">
                  <div className="flex flex-col items-center py-4">
                    <div
                      className={`flex items-center justify-center w-20 h-20 rounded-full mb-3 ${
                        totalPoints >= 0
                          ? "bg-[var(--success)]/[0.12]"
                          : "bg-[var(--danger)]/[0.12]"
                      }`}
                    >
                      <Award
                        className={`h-10 w-10 ${
                          totalPoints >= 0
                            ? "text-[var(--success)]"
                            : "text-[var(--danger)]"
                        }`}
                      />
                    </div>
                    <p className="text-sm text-[var(--text-muted)]">
                      {t("مجموع النقاط", "Total Points")}
                    </p>
                    <p
                      className={`text-4xl font-bold mt-1 ${
                        totalPoints >= 0
                          ? "text-[var(--success)]"
                          : "text-[var(--danger)]"
                      }`}
                    >
                      {totalPoints > 0
                        ? `+${totalPoints}`
                        : String(totalPoints)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <KPIGrid>
              <StatsCard
                label={t("نقاط إيجابية", "Positive Points")}
                value={`+${positivePoints}`}
                icon={TrendingUp}
                variant="success"
                description={`${positiveCount} ${t("سجل", "records")}`}
              />
              <StatsCard
                label={t("نقاط سلبية", "Negative Points")}
                value={`-${negativePoints}`}
                icon={TrendingDown}
                variant="danger"
                description={`${negativeCount} ${t("سجل", "records")}`}
              />
            </KPIGrid>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-[var(--warning)]" />
                  <CardTitle className="text-sm sm:text-base">
                    {t("سجل السلوك", "Behavior Log")}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {records.length === 0 ? (
                  <EmptyState
                    icon={
                      <Star className="h-10 w-10 text-[var(--text-tertiary)]" />
                    }
                    title={t(
                      "لا توجد سجلات سلوك",
                      "No behavior records",
                    )}
                    className="py-6 min-h-0"
                  />
                ) : (
                  <div className="space-y-3">
                    {records.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-start gap-2 sm:gap-3 rounded-lg border border-[var(--card-border)] p-2.5 sm:p-3"
                      >
                        <div
                          className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-full mt-0.5 ${
                            r.type === "positive"
                              ? "bg-[var(--success)]/[0.12]"
                              : "bg-[var(--danger)]/[0.12]"
                          }`}
                        >
                          {r.type === "positive" ? (
                            <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-[var(--danger)]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-[var(--text-primary)]">
                            {r.reason ?? t("بدون سبب", "No reason")}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                            <span className="text-xs text-[var(--text-muted)]">
                              {r.date}
                            </span>
                            {r.teacher_name && (
                              <>
                                <span className="text-xs text-[var(--text-muted)]">
                                  ·
                                </span>
                                <span className="text-xs text-[var(--text-muted)]">
                                  {r.teacher_name}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant={
                            r.type === "positive" ? "success" : "danger"
                          }
                          size="sm"
                          className="shrink-0 mt-0.5"
                        >
                          {r.type === "positive"
                            ? `+${r.points}`
                            : `-${r.points}`}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </StudentShell>
  );
}
