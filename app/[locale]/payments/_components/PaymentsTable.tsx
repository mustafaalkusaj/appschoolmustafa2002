"use client";

import { useTranslations } from "next-intl";
import { formatNumber } from "@/lib/formatting";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Student, PAGE_SIZE } from "../_types";
import { CreditCard, Eye } from "lucide-react";

interface PaymentsTableProps {
  students: Student[];
  paymentCountsByStudent: Record<string, number>;
  loading: boolean;
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onStudentClick: (student: Student) => void;
  onAddPayment: (student: Student) => void;
}

export function PaymentsTable({
  students,
  paymentCountsByStudent,
  loading,
  page,
  totalPages,
  totalCount,
  onPageChange,
  onStudentClick,
  onAddPayment,
}: PaymentsTableProps) {
  const t = useTranslations();
  const getPaymentStatus = (
    remaining: number,
    total: number
  ): { variant: "success" | "warning" | "danger" | "info"; label: string } => {
    if (remaining <= 0) {
      return { variant: "success", label: t("payments.table.paymentStatus.settled") };
    }
    const pct = total > 0 ? (remaining / total) * 100 : 100;
    if (pct > 75) {
      return { variant: "danger", label: t("payments.table.paymentStatus.largeRemaining") };
    }
    if (pct > 25) {
      return { variant: "warning", label: t("payments.table.paymentStatus.partialRemaining") };
    }
    return { variant: "info", label: t("payments.table.paymentStatus.nearlySettled") };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <EmptyState
        title={t("payments.table.emptyTitle")}
        description={t("payments.table.emptyDescription")}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Mobile Cards */}
      <div className="grid gap-4 lg:hidden">
        {students.map((s, i) => {
          const effectiveFee = Math.max((s.total_fee ?? 0) - (s.discount_value ?? 0), 0);
          const pct = effectiveFee > 0 ? Math.min(100, Math.round(((s.paid_fee ?? 0) / effectiveFee) * 100)) : 0;
          const status = getPaymentStatus(s.remaining_fee, s.total_fee);

          return (
            <div
              key={s.id}
              className="rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-[var(--card-shadow)] space-y-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <button
                    type="button"
                    className="!text-[1.1rem] !font-black leading-none text-[var(--primary)] hover:underline"
                    onClick={() => onStudentClick(s)}
                  >
                    {s.full_name}
                  </button>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    #{(page - 1) * PAGE_SIZE + i + 1} • {s.class_name || t("payments.table.noClass")} •{" "}
                    {t("payments.table.paymentCount", { count: formatNumber(paymentCountsByStudent[s.id] ?? 0) })}
                  </p>
                </div>
                <div className="text-lg font-bold text-[var(--danger)]">
                  {t("common.currency")} {formatNumber(s.remaining_fee)}
                </div>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="bg-[var(--surface-soft)] rounded-[var(--radius-md)] p-3">
                  <span className="text-xs text-[var(--text-muted)]">{t("payments.table.paidAmount")}</span>
                  <p className="text-sm font-bold text-[var(--success)] mt-1">
                    {t("common.currency")} {formatNumber(s.paid_fee)}
                  </p>
                </div>
                <div className="bg-[var(--surface-soft)] rounded-[var(--radius-md)] p-3">
                  <span className="text-xs text-[var(--text-muted)]">{t("payments.table.totalAmount")}</span>
                  <p className="text-sm font-bold text-[var(--text-primary)] mt-1">
                    {t("common.currency")} {formatNumber(s.total_fee)}
                  </p>
                </div>
                <div className="bg-[var(--surface-soft)] rounded-[var(--radius-md)] p-3">
                  <span className="text-xs text-[var(--text-muted)]">{t("payments.table.discount")}</span>
                  <p className="text-sm font-bold text-[var(--text-primary)] mt-1">
                    {s.discount_value && s.discount_value > 0
                      ? `${t("common.currency")} ${formatNumber(s.discount_value)}`
                      : "—"}
                  </p>
                </div>
                <div className="bg-[var(--surface-soft)] rounded-[var(--radius-md)] p-3">
                  <span className="text-xs text-[var(--text-muted)]">{t("payments.table.phone")}</span>
                  <p className="text-sm font-bold text-[var(--text-primary)] mt-1">
                    {s.phone || "—"}
                  </p>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--text-secondary)]">{t("payments.table.progress")}</span>
                  <Badge variant={status.variant} size="sm">
                    {pct}%
                  </Badge>
                </div>
                <div className="h-2 bg-[var(--surface-muted)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${pct}%`,
                      background: pct >= 100 ? "var(--success)" : "var(--primary)",
                    }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button variant="primary" size="sm" onClick={() => onAddPayment(s)}>
                  {t("payments.table.addPayment")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => onStudentClick(s)}>
                  {t("payments.table.viewDetails")}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[var(--surface-soft)]">
              <th className="text-start text-xs font-bold text-[var(--text-muted)] p-3 border-b border-[var(--border)]">
                #
              </th>
              <th className="text-start text-xs font-bold text-[var(--text-muted)] p-3 border-b border-[var(--border)]">
                {t("payments.table.columns.studentName")}
              </th>
              <th className="text-start text-xs font-bold text-[var(--text-muted)] p-3 border-b border-[var(--border)]">
                {t("payments.table.columns.classAndSection")}
              </th>
              <th className="text-start text-xs font-bold text-[var(--text-muted)] p-3 border-b border-[var(--border)]">
                {t("payments.table.columns.phone")}
              </th>
              <th className="text-start text-xs font-bold text-[var(--text-muted)] p-3 border-b border-[var(--border)]">
                {t("payments.table.columns.totalAmount")}
              </th>
              <th className="text-start text-xs font-bold text-[var(--text-muted)] p-3 border-b border-[var(--border)]">
                {t("payments.table.columns.paidAmount")}
              </th>
              <th className="text-start text-xs font-bold text-[var(--text-muted)] p-3 border-b border-[var(--border)]">
                {t("payments.table.columns.discount")}
              </th>
              <th className="text-start text-xs font-bold text-[var(--text-muted)] p-3 border-b border-[var(--border)]">
                {t("payments.table.columns.remainingAmount")}
              </th>
              <th className="text-start text-xs font-bold text-[var(--text-muted)] p-3 border-b border-[var(--border)]">
                {t("payments.table.columns.actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => {
              const effectiveFee = Math.max((s.total_fee ?? 0) - (s.discount_value ?? 0), 0);
              const pct = effectiveFee > 0 ? Math.min(100, Math.round(((s.paid_fee ?? 0) / effectiveFee) * 100)) : 0;
              const status = getPaymentStatus(s.remaining_fee, s.total_fee);

              return (
                <tr
                  key={s.id}
                  className="hover:bg-[var(--surface-soft)] transition-colors"
                >
                  <td className="p-3 text-xs text-[var(--text-tertiary)] border-b border-[var(--border)]">
                    {(page - 1) * PAGE_SIZE + i + 1}
                  </td>
                  <td className="p-3 border-b border-[var(--border)]">
                    <button
                      className="!text-[1.1rem] !font-black leading-none text-[var(--primary)] hover:underline text-start"
                      onClick={() => onStudentClick(s)}
                    >
                      {s.full_name}
                    </button>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {t("payments.table.registeredPayments", {
                        count: formatNumber(paymentCountsByStudent[s.id] ?? 0),
                      })}
                    </p>
                  </td>
                  <td className="p-3 text-sm text-[var(--text-secondary)] border-b border-[var(--border)]">
                    {s.class_name}
                  </td>
                  <td className="p-3 text-sm text-[var(--text-secondary)] border-b border-[var(--border)]">
                    {s.phone || "—"}
                  </td>
                  <td className="p-3 text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border)]">
                    {t("common.currency")} {formatNumber(s.total_fee)}
                  </td>
                  <td className="p-3 text-sm font-bold text-[var(--success)] border-b border-[var(--border)]">
                    {t("common.currency")} {formatNumber(s.paid_fee)}
                  </td>
                  <td className="p-3 text-sm text-[var(--text-secondary)] border-b border-[var(--border)]">
                    {s.discount_value && s.discount_value > 0
                      ? `${t("common.currency")} ${formatNumber(s.discount_value)}`
                      : "—"}
                  </td>
                  <td className="p-3 border-b border-[var(--border)]">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-bold ${
                          s.remaining_fee > 0 ? "text-[var(--danger)]" : "text-[var(--success)]"
                        }`}
                      >
                        {t("common.currency")} {formatNumber(s.remaining_fee)}
                      </span>
                      <Badge variant={status.variant} size="sm">
                        {status.label}
                      </Badge>
                    </div>
                    <div className="h-1.5 bg-[var(--surface-muted)] rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${pct}%`,
                          background: pct >= 100 ? "var(--success)" : "var(--primary)",
                        }}
                      />
                    </div>
                  </td>
                  <td className="p-3 border-b border-[var(--border)]">
                    <div className="flex items-center gap-2">
                      <IconButton
                        variant="primary"
                        size="sm"
                        aria-label={t("payments.table.addPayment")}
                        onClick={() => onAddPayment(s)}
                      >
                        <CreditCard className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        variant="ghost"
                        size="sm"
                        aria-label={t("payments.table.viewDetails")}
                        onClick={() => onStudentClick(s)}
                      >
                        <Eye className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[var(--border)]">
          <Button
            variant="secondary"
            size="sm"
            disabled={page === 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
          >
            {t("payments.pagination.previous")}
          </Button>
          <span className="text-sm text-[var(--text-muted)]">
            {t("payments.pagination.pageInfo", {
              page: formatNumber(page),
              total: formatNumber(totalPages),
              count: formatNumber(totalCount),
            })}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          >
            {t("payments.pagination.next")}
          </Button>
        </div>
      )}
    </div>
  );
}
