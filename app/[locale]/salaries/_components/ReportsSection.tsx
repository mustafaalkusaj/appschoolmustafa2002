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
  onViewChange,
  onTeacherChange,
  onPrintReport,
}: ReportsSectionProps) {
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
            ملخص
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
            تفاصيل السجلات
          </button>
        </div>
        <Button onClick={onPrintReport}>
          <AppIcon token="🖨️" size={14} />
          طباعة التقرير
        </Button>
      </div>

      {/* Summary View */}
      {reportView === "summary" && (
        <div className="space-y-4">
          {reportLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="h-10 w-10 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
              <span className="text-sm font-medium text-[var(--text-muted)]">جارٍ التحميل...</span>
            </div>
          ) : reportSummary.length === 0 ? (
            <EmptyState
              title="لا توجد محاضرات مسجلة"
              description="لم يتم تسجيل أي محاضرات بعد"
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
                    <div className="text-start">
                      <div className="text-xs text-[var(--text-muted)] mb-1">
                        عدد المحاضرات: <strong className="text-[var(--text-primary)]">{t.lectureCount}</strong>
                      </div>
                      <div className="text-lg font-bold text-[var(--success)]">
                        د.ع {formatNumber(t.lectureTotal)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Totals Card */}
              <div className="rounded-xl bg-[var(--primary)] p-5 text-white flex flex-wrap justify-between items-center gap-4">
                <span className="font-semibold">
                  إجمالي جميع المحاضرات: {reportTotals.lectureCount}
                </span>
                <span className="text-xl font-bold">
                  د.ع {formatNumber(reportTotals.total)}
                </span>
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
            <option value="">كل الأساتذة</option>
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
                  title="لا توجد سجلات"
                  description="لا توجد محاضرات مسجلة للفترة المحددة"
                />
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-[var(--surface-muted)] border-b border-[var(--border)]">
                      <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">#</th>
                      <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">التاريخ</th>
                      <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">الصف</th>
                      <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">الشعبة</th>
                      <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">الدرس</th>
                      <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">النوع</th>
                      <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">السعر</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filtered.map((l, i) => (
                      <tr key={l.id} className="hover:bg-[var(--surface-muted)]/50 transition-colors">
                        <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{i + 1}</td>
                        <td className="px-4 py-3 text-sm">{l.lecture_date}</td>
                        <td className="px-4 py-3 text-sm font-semibold">{l.grade}</td>
                        <td className="px-4 py-3 text-sm">({l.section})</td>
                        <td className="px-4 py-3 text-sm">الدرس {l.period}</td>
                        <td className="px-4 py-3">
                          <Badge variant={l.session_type === "morning" ? "info" : "warning"} size="sm">
                            {l.session_type === "morning" ? "صباحي" : "ظهري"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-[var(--primary)]">
                          د.ع {formatNumber(l.price)}
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
