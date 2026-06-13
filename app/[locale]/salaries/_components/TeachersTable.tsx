"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { containerVariants, itemVariants, usePrefersReducedMotion, getVariants } from "@/lib/motion-variants";
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

function TeacherAvatar({ name }: { name: string }) {
  const initials = name.trim().slice(0, 2);
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
      style={{
        background: "color-mix(in srgb,var(--primary) 15%,transparent)",
        color: "var(--primary)",
      }}
    >
      {initials}
    </div>
  );
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
  const reduced = usePrefersReducedMotion();
  const monthSalaries = salaries.filter((s) => s.month === currentMonth);
  const paidTeacherIds = monthSalaries.map((s) => s.teacher_id);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="h-10 w-10 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
        <span className="text-sm font-medium text-[var(--text-muted)]">
          {messages("salaries.table.loading")}
        </span>
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
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="bg-[var(--surface-soft)] border-b border-[var(--border)]">
            <th className="px-4 py-3.5 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] w-10">
              #
            </th>
            <th className="px-4 py-3.5 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {messages("salaries.table.columns.name")}
            </th>
            <th className="px-4 py-3.5 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {messages("salaries.table.columns.jobTitle")}
            </th>
            <th className="px-4 py-3.5 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {messages("salaries.table.columns.subject")}
            </th>
            <th className="px-4 py-3.5 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {messages("salaries.table.columns.baseSalary")}
            </th>
            <th className="px-4 py-3.5 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {messages("salaries.table.columns.lecturePrice")}
            </th>
            <th className="px-4 py-3.5 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {messages("salaries.table.columns.monthStatus")}
            </th>
            <th className="px-4 py-3.5 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {messages("salaries.table.columns.options")}
            </th>
          </tr>
        </thead>
        <motion.tbody
          className="divide-y divide-[var(--border)]"
          variants={getVariants(reduced, containerVariants(0.04))}
          initial="hidden"
          animate="visible"
          key={currentMonth}
        >
          {teachers.map((t, i) => {
            const paid = paidTeacherIds.includes(t.id);
            return (
              <motion.tr
                key={t.id}
                variants={getVariants(reduced, itemVariants)}
                className="hover:bg-[var(--surface-soft)]/60 transition-colors"
              >
                <td className="px-4 py-3.5 text-sm text-[var(--text-muted)] tabular-nums">
                  {i + 1}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <TeacherAvatar name={t.full_name} />
                    <button
                      onClick={() => onShowDetail(t)}
                      className="font-semibold text-[var(--primary)] hover:underline underline-offset-2 text-sm"
                    >
                      {t.full_name}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-sm text-[var(--text-secondary)]">
                  {t.job_title || "—"}
                </td>
                <td className="px-4 py-3.5 text-sm text-[var(--text-secondary)]">
                  {t.subject || "—"}
                </td>
                <td className="px-4 py-3.5 text-sm font-bold text-[var(--text-primary)] tabular-nums">
                  {messages("common.currency")} {formatNumber(t.base_salary)}
                </td>
                <td className="px-4 py-3.5 text-sm font-bold text-[var(--info)] tabular-nums">
                  {messages("common.currency")} {formatNumber(t.lecture_price || 0)}
                </td>
                <td className="px-4 py-3.5">
                  {paid ? (
                    <Badge variant="success" size="sm">
                      ✓ {messages("salaries.table.paid")}
                    </Badge>
                  ) : (
                    <Badge variant="danger" size="sm">
                      {messages("salaries.table.unpaid")}
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    {!paid && (
                      <button
                        onClick={() => onPaySalary(t)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors",
                          "bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-[var(--success)]",
                          "hover:bg-[color-mix(in_srgb,var(--success)_20%,transparent)]"
                        )}
                      >
                        <AppIcon token="💰" size={13} />
                        {messages("salaries.table.pay")}
                      </button>
                    )}
                    <button
                      onClick={(e) => onOpenMenu(e, t)}
                      className={cn(
                        "inline-flex items-center justify-center w-8 h-8 rounded-xl text-base font-bold transition-colors",
                        "bg-[var(--surface-soft)] text-[var(--text-secondary)]",
                        "hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] hover:text-[var(--primary)]"
                      )}
                      title="خيارات"
                    >
                      ⋮
                    </button>
                  </div>
                </td>
              </motion.tr>
            );
          })}
        </motion.tbody>
      </table>
    </div>
  );
}
