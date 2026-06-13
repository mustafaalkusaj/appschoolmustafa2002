"use client";

import { useTranslations } from "next-intl";
import { formatNumber, formatDate } from "@/lib/formatting";
import { motion, AnimatePresence } from "framer-motion";
import { Student, Payment } from "../_types";
import {
  User, Wallet, CreditCard, Printer, Trash2, Calendar, FileText,
  Hash, MessageSquare, BookOpen, Phone, MapPin, GraduationCap,
  Plus, X, CheckCircle2, AlertCircle, Tag, Banknote,
} from "lucide-react";

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
  onPrintStatement: (student: Student, payments: Payment[]) => void;
  canAddPayments: boolean;
  canDeletePayments: boolean;
  currency?: string;
}

const METHOD_INFO: Record<string, { emoji: string; color: string; bg: string }> = {
  cash:          { emoji: "💵", color: "var(--success)", bg: "color-mix(in srgb, var(--success) 12%, transparent)" },
  bank_transfer: { emoji: "🏦", color: "var(--info)",    bg: "color-mix(in srgb, var(--info) 12%, transparent)" },
  check:         { emoji: "📄", color: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 12%, transparent)" },
};

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
  onPrintStatement,
  canAddPayments,
  canDeletePayments,
  currency: currencyProp,
}: StudentDetailPanelProps) {
  const t = useTranslations();
  const currency = currencyProp ?? t("common.currency");

  const effectiveFee = student ? Math.max((student.total_fee ?? 0) - (student.discount_value ?? 0), 0) : 0;
  const progressPct = student && effectiveFee > 0
    ? Math.min(100, Math.round(((student.paid_fee ?? 0) / effectiveFee) * 100))
    : 0;

  return (
    <AnimatePresence>
      {show && student && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
          <div className="pointer-events-auto flex flex-col w-full max-w-2xl max-h-[90vh] rounded-lg bg-[var(--surface-soft)] shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div
              className="relative flex-shrink-0 px-6 py-5 overflow-hidden"
              style={{
                background: "linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 60%, var(--info)) 100%)",
              }}
            >
              {/* Decorative circles */}
              <div className="absolute top-0 end-0 w-40 h-40 rounded-full opacity-[0.08] pointer-events-none" style={{ background: "white", transform: "translate(40%, -40%)" }} />
              <div className="absolute bottom-0 start-8 w-24 h-24 rounded-full opacity-[0.06] pointer-events-none" style={{ background: "white", transform: "translateY(60%)" }} />

              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)" }}>
                    <User size={22} className="text-white" />
                  </div>
                  <div>
                    <p className="text-white/60 text-[10px] font-medium tracking-widest uppercase mb-0.5">
                      {t("payments.detailPanel.title", { student: "" }).trim()}
                    </p>
                    <h2 className="text-lg font-black text-white leading-tight">{student.full_name}</h2>
                    <p className="text-white/70 text-xs mt-0.5 font-medium">{student.class_name}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="flex-shrink-0 h-8 w-8 rounded-xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-colors mt-0.5"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-5 space-y-4">

                {/* Student info strip */}
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-7 w-7 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                      <User size={13} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                      {t("payments.detailPanel.studentInfoTitle")}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {student.phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={13} className="text-[var(--text-muted)] flex-shrink-0" />
                        <div>
                          <p className="text-[10px] text-[var(--text-muted)]">{t("payments.detailPanel.phone")}</p>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{student.phone}</p>
                        </div>
                      </div>
                    )}
                    {student.address && (
                      <div className="flex items-center gap-2">
                        <MapPin size={13} className="text-[var(--text-muted)] flex-shrink-0" />
                        <div>
                          <p className="text-[10px] text-[var(--text-muted)]">{t("payments.detailPanel.address")}</p>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{student.address}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <GraduationCap size={13} className="text-[var(--text-muted)] flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-[var(--text-muted)]">{t("payments.detailPanel.className")}</p>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{student.class_name}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial summary — 4 mini cards */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      label: t("payments.detailPanel.totalAmount"),
                      value: `${currency} ${formatNumber(student.total_fee)}`,
                      icon: Wallet,
                      color: "var(--primary)",
                    },
                    {
                      label: t("payments.detailPanel.paidAmount"),
                      value: `${currency} ${formatNumber(student.paid_fee)}`,
                      icon: CheckCircle2,
                      color: "var(--success)",
                    },
                    {
                      label: t("payments.detailPanel.remainingAmount"),
                      value: `${currency} ${formatNumber(student.remaining_fee)}`,
                      icon: AlertCircle,
                      color: "var(--danger)",
                    },
                    {
                      label: t("payments.detailPanel.discountAmount"),
                      value: `${currency} ${formatNumber(student.discount_value || 0)}`,
                      icon: Tag,
                      color: "var(--warning)",
                    },
                  ].map((card, i) => {
                    const Icon = card.icon;
                    return (
                      <motion.div
                        key={card.label}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06, duration: 0.3 }}
                        className="relative rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 overflow-hidden"
                      >
                        <div
                          className="absolute inset-0 pointer-events-none rounded-2xl opacity-60"
                          style={{
                            background: `radial-gradient(ellipse at top right, color-mix(in srgb, ${card.color} 10%, transparent), transparent 70%)`,
                          }}
                        />
                        <div className="relative">
                          <div
                            className="h-8 w-8 rounded-xl flex items-center justify-center mb-2"
                            style={{ background: `color-mix(in srgb, ${card.color} 14%, transparent)`, color: card.color }}
                          >
                            <Icon size={15} />
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] font-medium mb-0.5">{card.label}</p>
                          <p className="text-sm font-black tabular-nums" style={{ color: card.color }}>{card.value}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Progress */}
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                      {t("payments.detailPanel.progressLabel")}
                    </span>
                    <span
                      className="text-sm font-black tabular-nums"
                      style={{ color: progressPct >= 100 ? "var(--success)" : "var(--primary)" }}
                    >
                      {progressPct}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-[var(--surface-muted)] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                      style={{
                        background: progressPct >= 100
                          ? "var(--success)"
                          : "linear-gradient(90deg, var(--primary), var(--success))",
                      }}
                    />
                  </div>
                  {progressPct >= 100 && (
                    <p className="mt-2 text-xs font-bold text-[var(--success)] flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      {"مدفوع بالكامل"}
                    </p>
                  )}
                </div>

                {/* Transactions */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                        <CreditCard size={13} />
                      </div>
                      <span className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                        {t("payments.detailPanel.transactionsTitle", { count: paymentCount })}
                      </span>
                    </div>
                    {canAddPayments && (
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => onAddPayment(student)}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-black text-white bg-[var(--primary)] shadow-md shadow-[var(--primary)]/25"
                      >
                        <Plus size={13} />
                        {t("payments.detailPanel.addPayment")}
                      </motion.button>
                    )}
                  </div>

                  {paymentsLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
                    </div>
                  ) : payments.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card-bg)] p-8 text-center">
                      <div className="h-12 w-12 rounded-2xl bg-[var(--surface-muted)] flex items-center justify-center mx-auto mb-3">
                        <Banknote size={22} className="text-[var(--text-muted)]" />
                      </div>
                      <p className="text-sm font-bold text-[var(--text-secondary)]">
                        {t("payments.detailPanel.emptyPaymentsTitle")}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        {t("payments.detailPanel.emptyPaymentsDescription")}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <AnimatePresence>
                        {payments.map((p, i) => (
                          <PaymentRow
                            key={p.id}
                            payment={p}
                            index={i}
                            currency={currency}
                            onPrint={() => onPrintReceipt(p, student)}
                            onDelete={() => onDeletePayment(p.id)}
                            canDelete={canDeletePayments}
                            t={t}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-[var(--border)] bg-[var(--card-bg)] px-5 py-4 flex items-center justify-between gap-3">
              <button
                onClick={onClose}
                className="h-10 px-5 rounded-xl text-sm font-bold text-[var(--text-secondary)] bg-[var(--surface-soft)] border border-[var(--border)] hover:bg-[var(--surface-muted)] transition-colors"
              >
                {t("payments.detailPanel.close")}
              </button>
              <button
                onClick={() => onPrintStatement(student, payments)}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-bold text-[var(--primary)] bg-[var(--primary)]/10 border border-[var(--primary)]/20 hover:bg-[var(--primary)]/15 transition-colors"
              >
                <BookOpen size={15} />
                {t("payments.detailPanel.printStatement")}
              </button>
            </div>
          </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface PaymentRowProps {
  payment: Payment;
  index: number;
  currency: string;
  onPrint: () => void;
  onDelete: () => void;
  canDelete: boolean;
  t: ReturnType<typeof useTranslations>;
}

function PaymentRow({ payment, index, currency, onPrint, onDelete, canDelete, t }: PaymentRowProps) {
  const method = METHOD_INFO[payment.payment_method] ?? { emoji: "💰", color: "var(--primary)", bg: "color-mix(in srgb, var(--primary) 12%, transparent)" };
  const methodLabels: Record<string, string> = {
    cash: t("common.paymentMethods.cash"),
    bank_transfer: t("common.paymentMethods.bank_transfer"),
    check: t("common.paymentMethods.check"),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 space-y-3"
    >
      {/* Top row: index + amount + method badge + actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
            style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}
          >
            {index + 1}
          </div>
          <div>
            <p className="text-base font-black tabular-nums" style={{ color: "var(--success)" }}>
              {currency} {formatNumber(payment.amount)}
            </p>
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg mt-0.5"
              style={{ background: method.bg, color: method.color }}
            >
              {method.emoji} {methodLabels[payment.payment_method] || payment.payment_method}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onPrint}
            title={t("payments.detailPanel.printReceipt")}
            className="h-8 w-8 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
          >
            <Printer size={15} />
          </button>
          {canDelete && (
            <button
              onClick={onDelete}
              title={t("payments.detailPanel.deletePayment")}
              className="h-8 w-8 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border)]">
        <div className="flex items-center gap-1.5">
          <Calendar size={12} className="text-[var(--text-muted)] flex-shrink-0" />
          <div>
            <p className="text-[9px] text-[var(--text-muted)] font-medium">{t("payments.detailPanel.date")}</p>
            <p className="text-xs font-semibold text-[var(--text-primary)]">{formatDate(payment.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <FileText size={12} className="text-[var(--text-muted)] flex-shrink-0" />
          <div>
            <p className="text-[9px] text-[var(--text-muted)] font-medium">{t("payments.detailPanel.paperReceipt")}</p>
            <p className="text-xs font-semibold text-[var(--text-primary)]">{payment.manual_receipt_number || "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Hash size={12} className="text-[var(--text-muted)] flex-shrink-0" />
          <div>
            <p className="text-[9px] text-[var(--text-muted)] font-medium">{t("payments.detailPanel.digitalReceipt")}</p>
            <p className="text-xs font-bold text-[var(--primary)] break-all">{payment.receipt_number || "—"}</p>
          </div>
        </div>
        {payment.notes && (
          <div className="flex items-center gap-1.5 col-span-2">
            <MessageSquare size={12} className="text-[var(--text-muted)] flex-shrink-0" />
            <div>
              <p className="text-[9px] text-[var(--text-muted)] font-medium">{t("payments.detailPanel.notes")}</p>
              <p className="text-xs font-semibold text-[var(--text-primary)]">{payment.notes}</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
