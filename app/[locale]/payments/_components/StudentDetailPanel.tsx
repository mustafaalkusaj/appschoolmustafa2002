"use client";

import { useTranslations } from "next-intl";
import { formatNumber, formatDate } from "@/lib/formatting";
import { AppIcon } from "@/components/AppIcon";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button, IconButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Student, Payment } from "../_types";
import { User, Wallet, CreditCard, Printer, Trash2, Calendar, FileText, Hash, MessageSquare } from "lucide-react";

interface StudentDetailPanelProps {
  student: Student | null;
  payments: Payment[];
  paymentsLoading: boolean;
  paymentCount: number;
  show: boolean;
  onClose: () => void;
  onAddPayment: (student: Student) => void;
  onDeletePayment: (paymentId: string) => void;
  onPrintReceipt: (payment: Payment, student: Student) => void;
  canAddPayments: boolean;
  canDeletePayments: boolean;
}

export function StudentDetailPanel({
  student,
  payments,
  paymentsLoading,
  paymentCount,
  show,
  onClose,
  onAddPayment,
  onDeletePayment,
  onPrintReceipt,
  canAddPayments,
  canDeletePayments,
}: StudentDetailPanelProps) {
  const t = useTranslations();
  const currency = t("common.currency");

  if (!student) return null;

  const effectiveFee = Math.max((student.total_fee ?? 0) - (student.discount_value ?? 0), 0);
  const progressPct = effectiveFee > 0 ? Math.min(100, Math.round(((student.paid_fee ?? 0) / effectiveFee) * 100)) : 0;

  return (
    <Modal open={show} onClose={onClose} size="full" className="max-h-[88vh] overflow-hidden">
      <ModalHeader
        title={t("payments.detailPanel.title", { student: student.full_name })}
        description={t("payments.detailPanel.financialSummaryTitle")}
        onClose={onClose}
      />

      <ModalBody className="max-h-[calc(88vh-9.5rem)] overflow-y-auto space-y-6">
        {/* Student Info Card */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
            <User className="h-4 w-4" />
            {t("payments.detailPanel.studentInfoTitle")}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-[var(--text-muted)]">{t("payments.detailPanel.studentName")}:</span>
              <p className="!text-[1.1rem] !font-black leading-none text-[var(--text-primary)]">{student.full_name}</p>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">{t("payments.detailPanel.className")}:</span>
              <p className="font-semibold text-[var(--text-primary)]">{student.class_name}</p>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">{t("payments.detailPanel.phone")}:</span>
              <p className="font-semibold text-[var(--text-primary)]">{student.phone || "—"}</p>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">{t("payments.detailPanel.address")}:</span>
              <p className="font-semibold text-[var(--text-primary)]">{student.address || "—"}</p>
            </div>
          </div>
        </Card>

        {/* Financial Summary Card */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
            <Wallet className="h-4 w-4" />
            {t("payments.detailPanel.financialSummaryTitle")}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-[var(--text-muted)]">{t("payments.detailPanel.totalAmount")}:</span>
              <p className="font-semibold text-[var(--text-primary)]">{currency} {formatNumber(student.total_fee)}</p>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">{t("payments.detailPanel.paidAmount")}:</span>
              <p className="font-semibold text-[var(--success)]">{currency} {formatNumber(student.paid_fee)}</p>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">{t("payments.detailPanel.discountAmount")}:</span>
              <p className="font-semibold text-[var(--text-primary)]">{currency} {formatNumber(student.discount_value || 0)}</p>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">{t("payments.detailPanel.remainingAmount")}:</span>
              <p className="font-semibold text-[var(--danger)]">{currency} {formatNumber(student.remaining_fee)}</p>
            </div>
          </div>
        </Card>

        {/* Progress Bar */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-[var(--text-secondary)]">{t("payments.detailPanel.progressLabel")}</span>
            <Badge variant={progressPct >= 100 ? "success" : "primary"}>
              {progressPct}%
            </Badge>
          </div>
          <div className="h-3 bg-[var(--surface-muted)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progressPct}%`,
                background: progressPct >= 100 ? "var(--success)" : "linear-gradient(90deg, var(--primary), var(--success))",
              }}
            />
          </div>
        </Card>

        {/* Transactions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
              <CreditCard className="h-4 w-4" />
              {t("payments.detailPanel.transactionsTitle", { count: paymentCount })}
            </div>
            {canAddPayments && (
              <Button variant="primary" size="sm" onClick={() => onAddPayment(student)}>
                {t("payments.detailPanel.addPayment")}
              </Button>
            )}
          </div>

          {paymentsLoading ? (
            <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" aria-label="Loading payments" />
            </div>
          ) : payments.length === 0 ? (
            <EmptyState
              title={t("payments.detailPanel.emptyPaymentsTitle")}
              description={t("payments.detailPanel.emptyPaymentsDescription")}
            />
          ) : (
            <div className="space-y-3">
              {payments.map((p, i) => (
                <PaymentRow
                  key={p.id}
                  payment={p}
                  index={i}
                  onPrint={() => onPrintReceipt(p, student)}
                  onDelete={() => onDeletePayment(p.id)}
                  canDelete={canDeletePayments}
                />
              ))}
            </div>
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          {t("payments.detailPanel.close")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

interface PaymentRowProps {
  payment: Payment;
  index: number;
  onPrint: () => void;
  onDelete: () => void;
  canDelete: boolean;
}

function PaymentRow({ payment, index, onPrint, onDelete, canDelete }: PaymentRowProps) {
  const t = useTranslations();
  const currency = t("common.currency");
  const methodInfo = (
    {
      cash: { icon: "💵", label: t("common.paymentMethods.cash"), variant: "success" as const },
      bank_transfer: { icon: "🏦", label: t("common.paymentMethods.bank_transfer"), variant: "info" as const },
      check: { icon: "📄", label: t("common.paymentMethods.check"), variant: "warning" as const },
    } as Record<string, { icon: string; label: string; variant: "success" | "info" | "warning" }>
  )[payment.payment_method];

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--primary)] text-white flex items-center justify-center text-xs font-bold">
            {index + 1}
          </div>
          <div>
            <span className="text-lg font-bold text-[var(--success)]">{currency} {formatNumber(payment.amount)}</span>
            <Badge variant={methodInfo?.variant || "neutral"} size="sm" className="ms-2">
              <AppIcon token={methodInfo?.icon || "💰"} size={12} />
              {methodInfo?.label || payment.payment_method}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <IconButton
            variant="ghost"
            size="sm"
            aria-label={t("payments.detailPanel.printReceipt")}
            onClick={onPrint}
          >
            <Printer className="h-4 w-4" />
          </IconButton>
          {canDelete && (
            <IconButton
              variant="ghost"
              size="sm"
              aria-label={t("payments.detailPanel.deletePayment")}
              onClick={onDelete}
              className="text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)]"
            >
              <Trash2 className="h-4 w-4" />
            </IconButton>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-[var(--text-muted)]" />
          <span className="text-[var(--text-muted)]">{t("payments.detailPanel.date")}:</span>
          <span className="font-semibold">{formatDate(payment.created_at)}</span>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-[var(--text-muted)]" />
          <span className="text-[var(--text-muted)]">{t("payments.detailPanel.paperReceipt")}:</span>
          <span className="font-semibold break-all">{payment.manual_receipt_number || "—"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Hash className="h-3.5 w-3.5 text-[var(--text-muted)]" />
          <span className="text-[var(--text-muted)]">{t("payments.detailPanel.digitalReceipt")}:</span>
          <span className="ui-numeric font-semibold text-[var(--primary)] text-xs break-all">
            {payment.receipt_number || "—"}
          </span>
        </div>
        {payment.notes && (
          <div className="flex items-center gap-2 col-span-2">
            <MessageSquare className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            <span className="text-[var(--text-muted)]">{t("payments.detailPanel.notes")}:</span>
            <span className="font-semibold">{payment.notes}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
