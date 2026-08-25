"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Share2,
  ClipboardCheck,
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
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";

interface GradeItem {
  subject_name: string;
  percentage: number;
  grade_label: string;
  exam_title: string | null;
}

interface AttendanceData {
  present: number;
  absent: number;
  late: number;
  total: number;
  rate: number;
}

export default function StudentReportPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchJsonWithAuthorizedSession("/api/student/grades"),
      fetchJsonWithAuthorizedSession("/api/student/attendance"),
    ])
      .then(([gradesRes, attendanceRes]) => {
        if (gradesRes.response.ok) {
          setGrades((gradesRes.payload as any)?.data ?? []);
        }
        if (attendanceRes.response.ok) {
          const d = (attendanceRes.payload as any)?.data;
          if (d?.summary) {
            setAttendance({
              present: d.summary.present ?? 0,
              absent: d.summary.absent ?? 0,
              late: d.summary.late ?? 0,
              total: d.summary.total_days ?? 0,
              rate: d.summary.rate ?? 0,
            });
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalGrades = grades.length;
  const gpa =
    totalGrades > 0
      ? Math.round(grades.reduce((s, g) => s + g.percentage, 0) / totalGrades)
      : 0;

  function gpaColor(pct: number): string {
    if (pct >= 80) return "var(--success)";
    if (pct >= 50) return "var(--warning)";
    return "var(--danger)";
  }

  function gpaVariant(pct: number): "success" | "warning" | "danger" {
    if (pct >= 80) return "success";
    if (pct >= 50) return "warning";
    return "danger";
  }

  async function handleShare() {
    const lines: string[] = [];
    lines.push(t("--- التقرير الأكاديمي ---", "--- Academic Report ---"));
    lines.push("");

    if (totalGrades > 0) {
      lines.push(`${t("المعدل العام:", "Overall GPA:")} ${gpa}%`);
      lines.push("");
      lines.push(t("الدرجات:", "Grades:"));
      for (const g of grades) {
        lines.push(
          `  ${g.subject_name}: ${g.percentage}% (${g.grade_label})`,
        );
      }
      lines.push("");
    }

    if (attendance) {
      lines.push(t("الحضور:", "Attendance:"));
      lines.push(
        `  ${t("حضور:", "Present:")} ${attendance.present} | ${t("غياب:", "Absent:")} ${attendance.absent} | ${t("تأخر:", "Late:")} ${attendance.late}`,
      );
      lines.push(
        `  ${t("نسبة الحضور:", "Attendance Rate:")} ${attendance.rate}%`,
      );
    }

    const text = lines.join("\n");

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: t("تقريري", "My Report"), text });
        return;
      } catch {
        // user cancelled or share failed, fall through to clipboard
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch {
        // clipboard failed silently
      }
    }
  }

  const hasData = totalGrades > 0 || attendance != null;

  return (
    <StudentShell
      currentPath="/student/report"
      titleAr="تقريري"
      titleEn="My Report"
    >
      <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
        {loading ? (
          <div className="space-y-4">
            <div className="h-[140px] rounded-[var(--card-radius)] bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse" />
            <div className="h-[100px] rounded-[var(--card-radius)] bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse" />
            <div className="h-[250px] rounded-[var(--card-radius)] bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse" />
          </div>
        ) : !hasData ? (
          <EmptyState
            icon={
              <TrendingUp className="h-12 w-12 text-[var(--text-tertiary)]" />
            }
            title={t("لا توجد بيانات بعد", "No data yet")}
            description={t(
              "لم يتم تسجيل درجات أو حضور بعد",
              "No grades or attendance recorded yet",
            )}
          />
        ) : (
          <>
            {/* GPA Card */}
            {totalGrades > 0 && (
              <Card>
                <CardContent className="pt-[var(--card-padding)]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs sm:text-sm font-medium text-[var(--text-secondary)]">
                      {t("المعدل العام", "Overall GPA")}
                    </span>
                    <Badge variant={gpaVariant(gpa)} size="sm">
                      {gpa >= 80
                        ? t("ممتاز", "Excellent")
                        : gpa >= 50
                          ? t("جيد", "Good")
                          : t("ضعيف", "Needs Improvement")}
                    </Badge>
                  </div>
                  <div className="flex items-end gap-3">
                    <span
                      className="text-4xl sm:text-5xl font-bold tabular-nums"
                      style={{ color: gpaColor(gpa) }}
                    >
                      {gpa}
                    </span>
                    <span
                      className="text-lg sm:text-xl font-semibold mb-1"
                      style={{ color: gpaColor(gpa) }}
                    >
                      %
                    </span>
                  </div>
                  <Progress
                    value={gpa}
                    className="h-2 mt-3"
                  />
                </CardContent>
              </Card>
            )}

            {/* Attendance Summary */}
            {attendance && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-[var(--primary)]" />
                    <CardTitle className="text-sm sm:text-base">
                      {t("ملخص الحضور", "Attendance Summary")}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-[var(--text-muted)]">
                      {t("نسبة الحضور", "Attendance Rate")}
                    </span>
                    <span
                      className={`text-lg sm:text-xl font-bold ${
                        attendance.rate >= 80
                          ? "text-[var(--success)]"
                          : attendance.rate >= 60
                            ? "text-[var(--warning)]"
                            : "text-[var(--danger)]"
                      }`}
                    >
                      {attendance.rate}%
                    </span>
                  </div>
                  <Progress value={attendance.rate} className="h-2 mb-4" />
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="flex flex-col items-center gap-1 rounded-xl p-2.5 sm:p-3 bg-[var(--success)]/[0.06]">
                      <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
                      <span className="text-base sm:text-lg font-bold text-[var(--success)]">
                        {attendance.present}
                      </span>
                      <span className="text-[10px] sm:text-xs text-[var(--text-muted)]">
                        {t("حضور", "Present")}
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1 rounded-xl p-2.5 sm:p-3 bg-[var(--danger)]/[0.06]">
                      <XCircle className="h-4 w-4 text-[var(--danger)]" />
                      <span className="text-base sm:text-lg font-bold text-[var(--danger)]">
                        {attendance.absent}
                      </span>
                      <span className="text-[10px] sm:text-xs text-[var(--text-muted)]">
                        {t("غياب", "Absent")}
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1 rounded-xl p-2.5 sm:p-3 bg-[var(--warning)]/[0.06]">
                      <Clock className="h-4 w-4 text-[var(--warning)]" />
                      <span className="text-base sm:text-lg font-bold text-[var(--warning)]">
                        {attendance.late}
                      </span>
                      <span className="text-[10px] sm:text-xs text-[var(--text-muted)]">
                        {t("تأخر", "Late")}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Subject Grades Table */}
            {totalGrades > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-[var(--primary)]" />
                    <CardTitle className="text-sm sm:text-base">
                      {t("درجات المواد", "Subject Grades")}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {grades.map((g, idx) => (
                      <div key={`${g.subject_name}-${idx}`} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs sm:text-sm font-medium text-[var(--text-primary)] truncate">
                              {g.subject_name}
                            </span>
                            {g.exam_title && (
                              <span className="text-xs text-[var(--text-muted)] truncate hidden sm:inline">
                                {g.exam_title}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                              {g.percentage}%
                            </span>
                            <Badge
                              variant={gpaVariant(g.percentage)}
                              size="sm"
                            >
                              {g.grade_label}
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
            )}

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl p-3 sm:p-4 font-medium text-sm sm:text-base transition-all active:scale-[0.98]"
              style={{
                backgroundColor: shared
                  ? "var(--success)"
                  : "var(--primary)",
                color: "#fff",
              }}
            >
              {shared ? (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  {t("تم النسخ!", "Copied!")}
                </>
              ) : (
                <>
                  <Share2 className="h-5 w-5" />
                  {t("مشاركة التقرير", "Share Report")}
                </>
              )}
            </button>
          </>
        )}
      </div>
    </StudentShell>
  );
}
