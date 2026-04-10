"use client";

import { useTranslations } from "next-intl";
import { AppIcon } from "@/components/AppIcon";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatNumber } from "@/lib/formatting";
import { cn } from "@/lib/brand/brand-utils";
import type { Teacher, Salary } from "../_types";

interface TeachersTableProps {
  teachers: Teacher[];
  salaries: Salary[];
  loading: boolean;
  currentMonth: string;
  onPaySalary: (teacher: Teacher) => void;
  onShowDetail: (teacher: Teacher) => void;
  onOpenMenu: (e: React.MouseEvent, teacher: Teacher) => void;
}

export function TeachersTable({
  teachers,
  salaries,
  loading,
  currentMonth,
  onPaySalary,
  onShowDetail,
  onOpenMenu,
}: TeachersTableProps) {
  const messages = useTranslations();
  const monthSalaries = salaries.filter((s) => s.month === currentMonth);
  const paidTeacherIds = monthSalaries.map((s) => s.teacher_id);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="h-10 w-10 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
        <span className="text-sm font-medium text-[var(--text-muted)]">{messages("salaries.table.loading")}</span>
      </div>
    );
  }

  if (teachers.length === 0) {
    return (
      <EmptyState
        title={messages("salaries.table.emptyTitle")}
        description={messages("salaries.table.emptyDescription")}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="w-full">
        <thead>
          <tr className="bg-[var(--surface-muted)] border-b border-[var(--border)]">
            <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">#</th>
            <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{messages("salaries.table.columns.name")}</th>
            <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{messages("salaries.table.columns.jobTitle")}</th>
            <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{messages("salaries.table.columns.subject")}</th>
            <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{messages("salaries.table.columns.baseSalary")}</th>
            <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{messages("salaries.table.columns.lecturePrice")}</th>
            <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{messages("salaries.table.columns.monthStatus")}</th>
            <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{messages("salaries.table.columns.options")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {teachers.map((t, i) => {
            const paid = paidTeacherIds.includes(t.id);
            return (
              <tr key={t.id} className="hover:bg-[var(--surface-muted)]/50 transition-colors">
                <td className="px-4 py-3 text-sm text-[var(--text-muted)]">
                  {i + 1}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onShowDetail(t)}
                    className="font-semibold text-[var(--primary)] hover:underline underline-offset-2"
                  >
                    {t.full_name}
                  </button>
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                  {t.job_title || "—"}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                  {t.subject || "—"}
                </td>
                <td className="px-4 py-3 text-sm font-bold text-[var(--text-primary)]">
                  {messages("common.currency")} {formatNumber(t.base_salary)}
                </td>
                <td className="px-4 py-3 text-sm font-bold text-[var(--info)]">
                  {messages("common.currency")} {formatNumber(t.lecture_price || 0)}
                </td>
                <td className="px-4 py-3">
                  {paid ? (
                    <Badge variant="success" size="sm">✓ {messages("salaries.table.paid")}</Badge>
                  ) : (
                    <Badge variant="danger" size="sm">{messages("salaries.table.unpaid")}</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {!paid && (
                      <button
                        onClick={() => onPaySalary(t)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold",
                          "bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-[var(--success)]",
                          "hover:bg-[color-mix(in_srgb,var(--success)_20%,transparent)] transition-colors"
                        )}
                      >
                        <AppIcon token="💰" size={12} /> {messages("salaries.table.pay")}
                      </button>
                    )}
                    <button
                      onClick={(e) => onOpenMenu(e, t)}
                      className={cn(
                        "inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold",
                        "bg-[var(--surface-muted)] text-[var(--text-secondary)]",
                        "hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)] transition-colors"
                      )}
                    >
                      ▾
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
