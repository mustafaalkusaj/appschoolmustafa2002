"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Clock,
  BookOpen,
  Star,
  Wallet,
  TrendingUp,
  Award,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { StudentShell } from "@/components/StudentShell";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { useRole } from "@/hooks/useRole";
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

interface ScheduleSlot {
  id: string;
  start_time: string;
  end_time: string;
  subject_name: string;
  teacher_name: string | null;
  room: string | null;
}

interface RecentGrade {
  id: string;
  subject_name: string;
  exam_type: string | null;
  score: number;
  max_score: number;
  percentage: number;
  date: string;
}

interface RecentBehavior {
  id: string;
  type: "positive" | "negative";
  points: number;
  reason: string | null;
  date: string;
}

interface UpcomingExam {
  id: string;
  subject_name: string;
  exam_date: string;
  exam_type: string | null;
}

interface DashboardData {
  student_name: string | null;
  class_name: string | null;
  attendance_rate: number | null;
  attendance_total: number;
  attendance_present: number;
  attendance_absent: number;
  upcoming_exams_count: number;
  upcoming_exams: UpcomingExam[];
  behavior_points: number | null;
  total_fee: number;
  total_paid: number;
  remaining_balance: number | null;
  today_schedule: ScheduleSlot[];
  recent_grades: RecentGrade[];
  recent_behavior: RecentBehavior[];
}

export default function StudentDashboardPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const { profile } = useRole();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJsonWithAuthorizedSession("/api/student/dashboard")
      .then((res) => {
        if (res.response.ok) setData((res.payload as any)?.data ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const greeting = isAr
    ? `مرحباً، ${profile?.full_name ?? "طالب"}`
    : `Welcome, ${profile?.full_name ?? "Student"}`;

  const t = (ar: string, en: string) => (isAr ? ar : en);
  const Arrow = isAr ? ChevronLeft : ChevronRight;

  return (
    <StudentShell currentPath="/student" titleAr="الرئيسية" titleEn="Home">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {greeting}
          </h1>
          {data?.class_name && (
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {t("الصف:", "Class:")} {data.class_name}
            </p>
          )}
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[120px] rounded-[var(--card-radius)] bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse"
                />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[200px] rounded-[var(--card-radius)] bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse"
                />
              ))}
            </div>
          </div>
        ) : data ? (
          <>
            {/* KPI Cards */}
            <KPIGrid>
              <StatsCard
                label={t("نسبة الحضور", "Attendance")}
                value={
                  data.attendance_rate != null ? `${data.attendance_rate}%` : "—"
                }
                icon={CheckCircle2}
                variant="success"
                description={t(
                  `${data.attendance_present} من ${data.attendance_total} يوم`,
                  `${data.attendance_present} of ${data.attendance_total} days`,
                )}
              />
              <StatsCard
                label={t("امتحانات قادمة", "Upcoming Exams")}
                value={String(data.upcoming_exams_count)}
                icon={GraduationCap}
                variant="info"
                description={
                  data.upcoming_exams[0]
                    ? `${t("التالي:", "Next:")} ${data.upcoming_exams[0].subject_name}`
                    : undefined
                }
              />
              <StatsCard
                label={t("نقاط السلوك", "Behavior")}
                value={
                  data.behavior_points != null
                    ? data.behavior_points > 0
                      ? `+${data.behavior_points}`
                      : String(data.behavior_points)
                    : "—"
                }
                icon={Award}
                variant={
                  (data.behavior_points ?? 0) >= 0 ? "success" : "danger"
                }
              />
              <StatsCard
                label={t("الرصيد المتبقي", "Balance")}
                value={
                  data.remaining_balance != null
                    ? `${data.remaining_balance.toLocaleString()}`
                    : "—"
                }
                icon={Wallet}
                variant={
                  (data.remaining_balance ?? 0) > 0 ? "warning" : "success"
                }
                description={
                  data.total_fee > 0
                    ? `${t("من", "of")} ${data.total_fee.toLocaleString()} IQD`
                    : undefined
                }
              />
            </KPIGrid>

            {/* Payment Progress */}
            {data.total_fee > 0 && (
              <Card>
                <CardContent className="pt-[var(--card-padding)]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[var(--text-secondary)]">
                      {t("تقدم الدفع", "Payment Progress")}
                    </span>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      {Math.round((data.total_paid / data.total_fee) * 100)}%
                    </span>
                  </div>
                  <Progress
                    value={Math.round(
                      (data.total_paid / data.total_fee) * 100,
                    )}
                    className="h-2.5"
                  />
                  <div className="flex justify-between mt-2 text-xs text-[var(--text-muted)]">
                    <span>
                      {t("المدفوع:", "Paid:")}{" "}
                      {data.total_paid.toLocaleString()} IQD
                    </span>
                    <span>
                      {t("المتبقي:", "Remaining:")}{" "}
                      {(data.remaining_balance ?? 0).toLocaleString()} IQD
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Two-column: Today's Schedule + Upcoming Exams */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Today's Schedule */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-[var(--primary)]" />
                    <CardTitle className="text-base">
                      {t("جدول اليوم", "Today's Schedule")}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {data.today_schedule.length === 0 ? (
                    <EmptyState
                      icon={
                        <CalendarDays className="h-10 w-10 text-[var(--text-tertiary)]" />
                      }
                      title={t("لا توجد حصص اليوم", "No classes today")}
                      className="py-6 min-h-0"
                    />
                  ) : (
                    <div className="space-y-2">
                      {data.today_schedule.map((slot) => (
                        <div
                          key={slot.id}
                          className="flex items-center gap-3 rounded-lg border border-[var(--card-border)] p-3 hover:bg-[var(--card-bg)] transition-colors"
                        >
                          <div className="shrink-0 text-center min-w-[70px]">
                            <p className="text-xs font-mono font-semibold text-[var(--primary)]">
                              {slot.start_time?.slice(0, 5)}
                            </p>
                            <p className="text-[10px] text-[var(--text-muted)]">
                              {slot.end_time?.slice(0, 5)}
                            </p>
                          </div>
                          <div className="h-8 w-px bg-[var(--border)]" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                              {slot.subject_name}
                            </p>
                            {slot.teacher_name && (
                              <p className="text-xs text-[var(--text-muted)] truncate">
                                {slot.teacher_name}
                              </p>
                            )}
                          </div>
                          {slot.room && (
                            <Badge variant="neutral" size="sm">
                              {slot.room}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Upcoming Exams */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-[var(--info)]" />
                    <CardTitle className="text-base">
                      {t("الامتحانات القادمة", "Upcoming Exams")}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {data.upcoming_exams.length === 0 ? (
                    <EmptyState
                      icon={
                        <GraduationCap className="h-10 w-10 text-[var(--text-tertiary)]" />
                      }
                      title={t(
                        "لا توجد امتحانات قادمة",
                        "No upcoming exams",
                      )}
                      className="py-6 min-h-0"
                    />
                  ) : (
                    <div className="space-y-2">
                      {data.upcoming_exams.map((exam) => {
                        const daysLeft = Math.ceil(
                          (new Date(exam.exam_date).getTime() - Date.now()) /
                            86400000,
                        );
                        return (
                          <div
                            key={exam.id}
                            className="flex items-center gap-3 rounded-lg border border-[var(--card-border)] p-3"
                          >
                            <div className="shrink-0 flex flex-col items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--info)_8%,transparent)] px-3 py-1.5 min-w-[56px]">
                              <span className="text-lg font-bold text-[var(--info)]">
                                {daysLeft}
                              </span>
                              <span className="text-[10px] text-[var(--info)]">
                                {t("يوم", "days")}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                                {exam.subject_name}
                              </p>
                              <p className="text-xs text-[var(--text-muted)]">
                                {exam.exam_date}
                                {exam.exam_type ? ` · ${exam.exam_type}` : ""}
                              </p>
                            </div>
                            <Arrow className="h-4 w-4 text-[var(--text-muted)]" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Two-column: Recent Grades + Recent Behavior */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Recent Grades */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-[var(--success)]" />
                    <CardTitle className="text-base">
                      {t("آخر الدرجات", "Recent Grades")}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {data.recent_grades.length === 0 ? (
                    <EmptyState
                      icon={
                        <TrendingUp className="h-10 w-10 text-[var(--text-tertiary)]" />
                      }
                      title={t("لا توجد درجات بعد", "No grades yet")}
                      className="py-6 min-h-0"
                    />
                  ) : (
                    <div className="space-y-3">
                      {data.recent_grades.map((g) => (
                        <div key={g.id} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                              {g.subject_name}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                              {g.exam_type ?? ""} · {g.date}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-semibold text-[var(--text-primary)]">
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
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Behavior */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-[var(--warning)]" />
                    <CardTitle className="text-base">
                      {t("آخر السلوك", "Recent Behavior")}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {data.recent_behavior.length === 0 ? (
                    <EmptyState
                      icon={
                        <Star className="h-10 w-10 text-[var(--text-tertiary)]" />
                      }
                      title={t("لا توجد سجلات سلوك", "No behavior records")}
                      className="py-6 min-h-0"
                    />
                  ) : (
                    <div className="space-y-3">
                      {data.recent_behavior.map((b) => (
                        <div key={b.id} className="flex items-center gap-3">
                          <div
                            className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full ${
                              b.type === "positive"
                                ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)]"
                                : "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)]"
                            }`}
                          >
                            {b.type === "positive" ? (
                              <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-[var(--danger)]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                              {b.reason ?? t("بدون سبب", "No reason")}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                              {b.date}
                            </p>
                          </div>
                          <span
                            className={`text-sm font-bold ${
                              b.type === "positive"
                                ? "text-[var(--success)]"
                                : "text-[var(--danger)]"
                            }`}
                          >
                            {b.type === "positive"
                              ? `+${b.points}`
                              : `-${b.points}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <EmptyState
            title={t("لا توجد بيانات حالياً", "No data available")}
          />
        )}
      </div>
    </StudentShell>
  );
}
