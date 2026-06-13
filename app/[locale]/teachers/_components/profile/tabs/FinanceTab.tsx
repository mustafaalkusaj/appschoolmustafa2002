"use client";
import { useEffect, useRef } from "react";
import type { TeacherSalaryEntry } from "../../../_hooks/useTeacherProfile";
import type { TeacherRecord } from "../../../_types";

interface Props {
  teacher: TeacherRecord;
  salaries: TeacherSalaryEntry[];
  salaryLoading: boolean;
  fetchSalaries: () => Promise<void>;
  locale: "ar" | "en";
}

function PaidBadge({ isPaid, locale }: { isPaid: boolean; locale: "ar" | "en" }) {
  return isPaid ? (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-800 border-green-200">
      {locale === "en" ? "Paid" : "مدفوع"}
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-yellow-100 text-yellow-800 border-yellow-200">
      {locale === "en" ? "Unpaid" : "غير مدفوع"}
    </span>
  );
}

function formatCurrency(value: number): string {
  return value.toLocaleString("ar-IQ-u-nu-latn");
}

export function FinanceTab({ teacher, salaries, salaryLoading, fetchSalaries, locale }: Props) {
  const isEn = locale === "en";
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      void fetchSalaries();
    }
  }, [fetchSalaries]);

  if (salaryLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-[var(--text-muted)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">{isEn ? "Loading salaries..." : "جاري تحميل الرواتب..."}</span>
        </div>
      </div>
    );
  }

  if (salaries.length === 0) {
    return (
      <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] shadow-sm p-8 flex flex-col items-center gap-3">
        <span className="text-4xl">💰</span>
        <p className="text-[var(--text-muted)] text-sm">
          {isEn ? "No salary records found." : "لا توجد سجلات رواتب."}
        </p>
      </div>
    );
  }

  const paidCount = salaries.filter((s) => s.is_paid).length;
  const avgSalary = salaries.reduce((sum, s) => sum + (s.gross_salary ?? 0), 0) / salaries.length;

  const salaryTypeLabel = teacher.salary_type === "fixed"
    ? (isEn ? "Fixed Salary" : "راتب ثابت")
    : teacher.salary_type === "hourly"
    ? (isEn ? "Lecture Wages" : "أجور محاضرات")
    : teacher.salary_type === "mixed"
    ? (isEn ? "Fixed + Lectures" : "ثابت + محاضرات")
    : null;

  const salaryTypeBadgeClass = teacher.salary_type === "fixed"
    ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)] border-[color-mix(in_srgb,var(--success)_25%,transparent)]"
    : teacher.salary_type === "hourly"
    ? "bg-[color-mix(in_srgb,var(--info)_12%,transparent)] text-[var(--info)] border-[color-mix(in_srgb,var(--info)_25%,transparent)]"
    : "bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] text-[var(--warning)] border-[color-mix(in_srgb,var(--warning)_25%,transparent)]";

  const totalAllowances =
    (teacher.transport_allowance ?? 0) +
    (teacher.housing_allowance ?? 0) +
    (teacher.other_allowances ?? 0);

  const totalMonthly = (teacher.base_salary ?? 0) + totalAllowances;

  return (
    <div className="flex flex-col gap-4">
      {/* Salary Configuration Card */}
      <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {isEn ? "Salary Configuration" : "إعداد الراتب"}
          </h3>
          {salaryTypeLabel && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${salaryTypeBadgeClass}`}>
              {salaryTypeLabel}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl bg-[var(--surface-soft)] p-3">
            <div className="text-xs text-[var(--text-muted)] mb-1">
              {isEn ? "Base Salary" : "الراتب الأساسي"}
            </div>
            <div className="text-base font-bold text-[var(--text-primary)]">
              {teacher.base_salary != null
                ? teacher.base_salary.toLocaleString("ar-IQ-u-nu-latn")
                : "—"}
            </div>
            {teacher.base_salary != null && (
              <div className="text-xs text-[var(--text-muted)] mt-0.5">{isEn ? "IQD" : "د.ع"}</div>
            )}
          </div>
          {(teacher.salary_type === "hourly" || teacher.salary_type === "mixed") && (
            <div className="rounded-xl bg-[var(--surface-soft)] p-3">
              <div className="text-xs text-[var(--text-muted)] mb-1">
                {isEn ? "Lecture Price" : "أجر المحاضرة"}
              </div>
              <div className="text-base font-bold text-[var(--info)]">
                {teacher.lecture_price != null
                  ? teacher.lecture_price.toLocaleString("ar-IQ-u-nu-latn")
                  : "—"}
              </div>
              {teacher.lecture_price != null && (
                <div className="text-xs text-[var(--text-muted)] mt-0.5">{isEn ? "IQD / lecture" : "د.ع / محاضرة"}</div>
              )}
            </div>
          )}
          <div className="rounded-xl bg-[var(--surface-soft)] p-3">
            <div className="text-xs text-[var(--text-muted)] mb-1">
              {isEn ? "Allowances" : "البدلات"}
            </div>
            <div className="text-base font-bold text-[var(--text-primary)]">
              {totalAllowances > 0 ? totalAllowances.toLocaleString("ar-IQ-u-nu-latn") : "—"}
            </div>
            {totalAllowances > 0 && (
              <div className="text-xs text-[var(--text-muted)] mt-0.5">{isEn ? "IQD" : "د.ع"}</div>
            )}
          </div>
          <div className="rounded-xl bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] border border-[color-mix(in_srgb,var(--primary)_20%,transparent)] p-3">
            <div className="text-xs text-[var(--primary)] mb-1 font-medium">
              {isEn ? "Total Monthly" : "الإجمالي الشهري"}
            </div>
            <div className="text-base font-black text-[var(--primary)]">
              {totalMonthly > 0 ? totalMonthly.toLocaleString("ar-IQ-u-nu-latn") : "—"}
            </div>
            {totalMonthly > 0 && (
              <div className="text-xs text-[var(--primary)] opacity-70 mt-0.5">{isEn ? "IQD / mo" : "د.ع / شهر"}</div>
            )}
          </div>
        </div>
        {(teacher.transport_allowance || teacher.housing_allowance || teacher.other_allowances) ? (
          <div className="mt-3 pt-3 border-t border-[var(--card-border)] flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
            {teacher.transport_allowance ? (
              <span>{isEn ? "Transport" : "بدل نقل"}: <span className="text-[var(--text-primary)] font-medium">{teacher.transport_allowance.toLocaleString("ar-IQ-u-nu-latn")}</span></span>
            ) : null}
            {teacher.housing_allowance ? (
              <span>{isEn ? "Housing" : "بدل سكن"}: <span className="text-[var(--text-primary)] font-medium">{teacher.housing_allowance.toLocaleString("ar-IQ-u-nu-latn")}</span></span>
            ) : null}
            {teacher.other_allowances ? (
              <span>{isEn ? "Other" : "بدلات أخرى"}: <span className="text-[var(--text-primary)] font-medium">{teacher.other_allowances.toLocaleString("ar-IQ-u-nu-latn")}</span></span>
            ) : null}
          </div>
        ) : null}
        <div className="mt-4 pt-3 border-t border-[var(--card-border)]">
          <a
            href={`/${locale}/salaries`}
            className="text-sm text-[var(--primary)] hover:underline font-medium"
          >
            {isEn ? "Open Salaries Page →" : "فتح صفحة الرواتب ←"}
          </a>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-4">
          <div className="text-xs text-[var(--text-muted)] mb-1">{isEn ? "Total Records" : "إجمالي السجلات"}</div>
          <div className="text-xl font-bold text-[var(--text-primary)]">{salaries.length}</div>
        </div>
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-4">
          <div className="text-xs text-[var(--text-muted)] mb-1">{isEn ? "Paid" : "مدفوع"}</div>
          <div className="text-xl font-bold text-green-600">{paidCount}</div>
        </div>
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-4">
          <div className="text-xs text-[var(--text-muted)] mb-1">{isEn ? "Avg Salary" : "متوسط الراتب"}</div>
          <div className="text-xl font-bold text-[var(--text-primary)]">{formatCurrency(Math.round(avgSalary))}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface-soft)] border-b border-[var(--card-border)]">
                <th className="px-4 py-3 text-start text-xs font-semibold text-[var(--text-muted)]">{isEn ? "Month" : "الشهر"}</th>
                <th className="px-4 py-3 text-start text-xs font-semibold text-[var(--text-muted)]">{isEn ? "Gross" : "الإجمالي"}</th>
                <th className="px-4 py-3 text-start text-xs font-semibold text-[var(--text-muted)]">{isEn ? "Deductions" : "الخصومات"}</th>
                <th className="px-4 py-3 text-start text-xs font-semibold text-[var(--text-muted)]">{isEn ? "Net" : "الصافي"}</th>
                <th className="px-4 py-3 text-start text-xs font-semibold text-[var(--text-muted)]">{isEn ? "Status" : "الحالة"}</th>
              </tr>
            </thead>
            <tbody>
              {salaries.map((s) => {
                const net = (s.gross_salary ?? 0) - (s.deductions ?? 0);
                return (
                  <tr key={s.id} className="border-b border-[var(--card-border)] last:border-0 hover:bg-[var(--surface-soft)]/50">
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{s.month}</td>
                    <td className="px-4 py-3 text-[var(--text-primary)]">{formatCurrency(s.gross_salary ?? 0)}</td>
                    <td className="px-4 py-3 text-[var(--danger)]">{formatCurrency(s.deductions ?? 0)}</td>
                    <td className="px-4 py-3 font-semibold text-green-600">{formatCurrency(net)}</td>
                    <td className="px-4 py-3">
                      <PaidBadge isPaid={s.is_paid} locale={locale} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
