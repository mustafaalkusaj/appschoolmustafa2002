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

function TeacherInitialsAvatar({ name }: { name: string }) {
  const initials = name.trim().slice(0, 2);
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
      style={{
        background: "color-mix(in srgb,var(--primary) 15%,transparent)",
        color: "var(--primary)",
      }}
    >
      {initials}
    </div>
  );
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
        {/* Pill tabs */}
        <div className="flex p-1 rounded-2xl bg-[var(--surface-soft)] border border-[var(--border)]">
          <button
            onClick={() => onViewChange("summary")}
            className={cn(
              "px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200",
              reportView === "summary"
                ? "bg-white shadow-sm text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <span className="flex items-center gap-1.5">
              <AppIcon token="📊" size={13} />
              ملخص
            </span>
          </button>
          <button
            onClick={() => onViewChange("details")}
            className={cn(
              "px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200",
              reportView === "details"
                ? "bg-white shadow-sm text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <span className="flex items-center gap-1.5">
              <AppIcon token="📋" size={13} />
              تفاصيل السجلات
            </span>
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
                  className="rounded-2xl border border-[var(--border)] border-s-4 border-s-[var(--primary)] bg-[var(--card-bg)] p-5 shadow-sm"
                >
                  <div className="flex flex-wrap justify-between gap-4">
                    {/* Left: Avatar + name + grades */}
                    <div className="flex items-start gap-3">
                      <TeacherInitialsAvatar name={t.full_name} />
                      <div>
                        <div className="text-base font-bold text-[var(--text-primary)]">
                          {t.full_name}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mt-0.5">
                          {t.subject || "—"} •{" "}
                          {teachers.find((teacher) => teacher.id === t.teacher_id)?.job_title || ""}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {Object.entries(t.byGrade).map(([grade, count]) => (
                            <Badge key={grade} variant="primary" size="sm">
                              {grade}: {count as number}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right: lecture count + total */}
                    <div className="flex flex-col items-end gap-2 text-end">
                      <div
                        className="rounded-xl px-4 py-2 text-center"
                        style={{ background: "color-mix(in srgb,var(--primary) 8%,transparent)" }}
                      >
                        <div className="text-2xl font-black text-[var(--text-primary)] tabular-nums leading-none">
                          {t.lectureCount}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mt-0.5">محاضرة</div>
                      </div>
                      <div className="text-lg font-black tabular-nums" style={{ color: "var(--success)" }}>
                        د.ع {formatNumber(t.lectureTotal)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Totals Card */}
              <div
                className="rounded-2xl p-5 text-white flex flex-wrap justify-between items-center gap-4"
                style={{ background: "var(--primary)" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    <AppIcon token="📈" size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-medium opacity-80">إجمالي جميع المحاضرات</div>
                    <div className="text-lg font-black tabular-nums">{reportTotals.lectureCount} محاضرة</div>
                  </div>
                </div>
                <div className="text-2xl font-black tabular-nums">
                  د.ع {formatNumber(reportTotals.total)}
                </div>
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
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </Select>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm overflow-hidden">
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
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[var(--surface-soft)] border-b border-[var(--border)]">
                        <th className="px-4 py-3.5 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] w-12">
                          #
                        </th>
                        <th className="px-4 py-3.5 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                          التاريخ
                        </th>
                        <th className="px-4 py-3.5 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                          الصف
                        </th>
                        <th className="px-4 py-3.5 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                          الشعبة
                        </th>
                        <th className="px-4 py-3.5 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                          الدرس
                        </th>
                        <th className="px-4 py-3.5 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                          النوع
                        </th>
                        <th className="px-4 py-3.5 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                          السعر
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {filtered.map((l, i) => (
                        <tr
                          key={l.id}
                          className="hover:bg-[var(--surface-soft)]/60 transition-colors"
                        >
                          <td className="px-4 py-3.5">
                            <span
                              className="inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold tabular-nums"
                              style={{
                                background: "color-mix(in srgb,var(--text-muted) 10%,transparent)",
                                color: "var(--text-muted)",
                              }}
                            >
                              {i + 1}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-sm tabular-nums text-[var(--text-secondary)]">
                            {l.lecture_date}
                          </td>
                          <td className="px-4 py-3.5 text-sm font-semibold text-[var(--text-primary)]">
                            {l.grade}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-[var(--text-secondary)]">
                            ({l.section})
                          </td>
                          <td className="px-4 py-3.5 text-sm text-[var(--text-secondary)]">
                            الدرس {l.period}
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge
                              variant={l.session_type === "morning" ? "info" : "warning"}
                              size="sm"
                            >
                              {l.session_type === "morning" ? "صباحي" : "ظهري"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5 text-sm font-black tabular-nums text-[var(--primary)]">
                            د.ع {formatNumber(l.price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
