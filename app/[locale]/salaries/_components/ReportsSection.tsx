"use client";

import { AppIcon } from "@/components/AppIcon";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatNumber } from "@/lib/formatting";
import { cn } from "@/lib/brand/brand-utils";
import type { Teacher, DailyLecture, ReportSummary, ReportTotals } from "../_types";

interface ReportsSectionProps {
  reportView: "summary" | "details";
  reportTeacher: string;
  reportLoading: boolean;
  reportSummary: ReportSummary[];
  reportTotals: ReportTotals;
  dailyLectures: DailyLecture[];
  teachers: Teacher[];
  locale: "ar" | "en";
  onViewChange: (view: "summary" | "details") => void;
  onTeacherChange: (id: string) => void;
  onPrintReport: () => void;
}

export function ReportsSection({
  reportView,
  reportTeacher,
  reportLoading,
  reportSummary,
  reportTotals,
  dailyLectures,
  teachers,
  locale,
  onViewChange,
  onTeacherChange,
  onPrintReport,
}: ReportsSectionProps) {
  const isEn = locale === "en";
  const cur = isEn ? "IQD" : "د.ع";
  const txt = isEn ? {
    summary: "Summary",
    details: "Detailed records",
    printReport: "Print report",
    loading: "Loading...",
    noLectures: "No lectures recorded",
    noLecturesDesc: "No lectures have been recorded yet",
    lectureCount: "Lectures:",
    salaryPaid: "Salary paid:",
    salaryPending: "Salary pending:",
    totalLectures: "Total lectures:",
    totalSalaryPaid: "Total salaries paid:",
    totalSalaryPending: "Total salaries pending:",
    allTeachers: "All teachers",
    noRecords: "No records",
    noRecordsDesc: "No lectures recorded for the selected period",
    colDate: "Date",
    colGrade: "Grade",
    colSection: "Section",
    colLesson: "Lesson",
    colType: "Type",
    colPrice: "Price",
    lessonN: "Lesson",
    morning: "Morning",
    afternoon: "Afternoon",
  } : {
    summary: "ملخص",
    details: "تفاصيل السجلات",
    printReport: "طباعة التقرير",
    loading: "جارٍ التحميل...",
    noLectures: "لا توجد محاضرات مسجلة",
    noLecturesDesc: "لم يتم تسجيل أي محاضرات بعد",
    lectureCount: "عدد المحاضرات:",
    salaryPaid: "الراتب المدفوع:",
    salaryPending: "الراتب المعلق:",
    totalLectures: "إجمالي جميع المحاضرات:",
    totalSalaryPaid: "إجمالي الرواتب المدفوعة:",
    totalSalaryPending: "إجمالي الرواتب المعلقة:",
    allTeachers: "كل الأساتذة",
    noRecords: "لا توجد سجلات",
    noRecordsDesc: "لا توجد محاضرات مسجلة للفترة المحددة",
    colDate: "التاريخ",
    colGrade: "الصف",
    colSection: "الشعبة",
    colLesson: "الدرس",
    colType: "النوع",
    colPrice: "السعر",
    lessonN: "الدرس",
    morning: "صباحي",
    afternoon: "ظهري",
  };
  return (
    <div className="space-y-6">
      {/* Header with tabs and print button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex p-1 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)]">
          <button
            onClick={() => onViewChange("summary")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
              reportView === "summary"
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            {txt.summary}
          </button>
          <button
            onClick={() => onViewChange("details")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
              reportView === "details"
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            {txt.details}
          </button>
        </div>
        <Button onClick={onPrintReport}>
          <AppIcon token="🖨️" size={14} />
          {txt.printReport}
        </Button>
      </div>

      {/* Summary View */}
      {reportView === "summary" && (
        <div className="space-y-4">
          {reportLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="h-10 w-10 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
              <span className="text-sm font-medium text-[var(--text-muted)]">{txt.loading}</span>
            </div>
          ) : reportSummary.length === 0 ? (
            <EmptyState
              title={txt.noLectures}
              description={txt.noLecturesDesc}
            />
          ) : (
            <>
              {reportSummary.map((t) => (
                <div
                  key={t.teacher_id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-sm"
                >
                  <div className="flex flex-wrap justify-between gap-4">
                    <div>
                      <div className="text-base font-bold text-[var(--text-primary)]">
                        {t.full_name}
                      </div>
                      <div className="text-sm text-[var(--text-muted)]">
                        {t.subject || "—"} • {teachers.find((teacher) => teacher.id === t.teacher_id)?.job_title || ""}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {Object.entries(t.byGrade).map(([grade, count]) => (
                          <Badge key={grade} variant="primary" size="sm">
                            {grade}: {count as number}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-start space-y-1">
                      <div className="text-xs text-[var(--text-muted)]">
                        {txt.lectureCount} <strong className="text-[var(--text-primary)]">{t.lectureCount}</strong>
                      </div>
                      <div className="text-lg font-bold text-[var(--success)]">
                        {cur} {formatNumber(t.lectureTotal)}
                      </div>
                      {(t.salaryPaid > 0 || t.salaryPending > 0) && (
                        <div className="flex flex-wrap gap-3 pt-1 border-t border-[var(--border)]">
                          {t.salaryPaid > 0 && (
                            <div className="text-xs">
                              <span className="text-[var(--text-muted)]">{txt.salaryPaid} </span>
                              <strong className="text-[var(--success)]">{cur} {formatNumber(t.salaryPaid)}</strong>
                            </div>
                          )}
                          {t.salaryPending > 0 && (
                            <div className="text-xs">
                              <span className="text-[var(--text-muted)]">{txt.salaryPending} </span>
                              <strong className="text-[var(--warning)]">{cur} {formatNumber(t.salaryPending)}</strong>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Totals Card */}
              <div className="rounded-xl bg-[var(--primary)] p-5 text-white space-y-3">
                <div className="flex flex-wrap justify-between items-center gap-4">
                  <span className="font-semibold">
                    {txt.totalLectures} {reportTotals.lectureCount}
                  </span>
                  <span className="text-xl font-bold">
                    {cur} {formatNumber(reportTotals.total)}
                  </span>
                </div>
                {(reportTotals.salaryPaid > 0 || reportTotals.salaryPending > 0) && (
                  <div className="flex flex-wrap gap-6 pt-3 border-t border-white/20">
                    {reportTotals.salaryPaid > 0 && (
                      <div className="text-sm">
                        <span className="text-white/70">{txt.totalSalaryPaid} </span>
                        <strong>{cur} {formatNumber(reportTotals.salaryPaid)}</strong>
                      </div>
                    )}
                    {reportTotals.salaryPending > 0 && (
                      <div className="text-sm">
                        <span className="text-white/70">{txt.totalSalaryPending} </span>
                        <strong className="text-yellow-200">{cur} {formatNumber(reportTotals.salaryPending)}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Details View */}
      {reportView === "details" && (
        <div className="space-y-4">
          <Select
            value={reportTeacher}
            onChange={(e) => onTeacherChange(e.target.value)}
            className="max-w-xs"
          >
            <option value="">{txt.allTeachers}</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.full_name}</option>
            ))}
          </Select>

          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            {reportLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="h-10 w-10 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
              </div>
            ) : (() => {
              const filtered = reportTeacher
                ? dailyLectures.filter((l) => l.teacher_id === reportTeacher)
                : dailyLectures;
              return filtered.length === 0 ? (
                <EmptyState
                  title={txt.noRecords}
                  description={txt.noRecordsDesc}
                />
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-[var(--surface-muted)] border-b border-[var(--border)]">
                      <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">#</th>
                      <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{txt.colDate}</th>
                      <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{txt.colGrade}</th>
                      <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{txt.colSection}</th>
                      <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{txt.colLesson}</th>
                      <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{txt.colType}</th>
                      <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{txt.colPrice}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filtered.map((l, i) => (
                      <tr key={l.id} className="hover:bg-[var(--surface-muted)]/50 transition-colors">
                        <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{i + 1}</td>
                        <td className="px-4 py-3 text-sm">{l.lecture_date}</td>
                        <td className="px-4 py-3 text-sm font-semibold">{l.grade}</td>
                        <td className="px-4 py-3 text-sm">({l.section})</td>
                        <td className="px-4 py-3 text-sm">{txt.lessonN} {l.period}</td>
                        <td className="px-4 py-3">
                          <Badge variant={l.session_type === "morning" ? "info" : "warning"} size="sm">
                            {l.session_type === "morning" ? txt.morning : txt.afternoon}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-[var(--primary)]">
                          {cur} {formatNumber(l.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
