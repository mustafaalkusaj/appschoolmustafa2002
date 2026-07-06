"use client";

import { useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import { DollarSign, CreditCard, Building2, FileText, Receipt, AlertCircle, CheckCircle2 } from "lucide-react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/formatting";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { getLocaleFromPath } from "@/lib/locale-routing";
import type { StudentWithFees } from "../_types";

// ── Types ────────────────────────────────────────────────────────────────────

type PaymentMethod = "cash" | "bank_transfer" | "check";

interface QuickPayModalProps {
  show: boolean;
  student: StudentWithFees | null;
  schoolId: string | null;
  branchId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface PaymentApiResponse {
  ok: boolean;
  payment: Record<string, unknown>;
  studentUpdate: { id: string; paid_fee: number; remaining_fee: number };
}

interface PaymentApiError {
  error?: { code?: string; message?: string };
}

// ── Labels ───────────────────────────────────────────────────────────────────

const LABELS = {
  ar: {
    title: "تسجيل دفعة سريعة",
    studentName: "اسم الطالب",
    remainingFee: "المبلغ المتبقي",
    amount: "المبلغ",
    amountPlaceholder: "أدخل المبلغ",
    paymentMethod: "طريقة الدفع",
    cash: "نقدي",
    bank_transfer: "تحويل بنكي",
    check: "صك",
    notes: "ملاحظات",
    notesPlaceholder: "ملاحظات إضافية (اختياري)",
    receiptNumber: "رقم الإيصال",
    receiptPlaceholder: "رقم الإيصال اليدوي (اختياري)",
    submit: "تسجيل الدفعة",
    submitting: "جاري التسجيل...",
    cancel: "إلغاء",
    currency: "د.ع",
    paidInFull: "الطالب سدد كامل الرسوم",
    exceedsRemaining: "المبلغ يتجاوز المبلغ المتبقي",
    amountRequired: "يرجى إدخال المبلغ",
    amountPositive: "يجب أن يكون المبلغ أكبر من صفر",
    genericError: "حدث خطأ أثناء تسجيل الدفعة",
    noSchool: "لم يتم تحديد المدرسة",
    noStudent: "لم يتم تحديد الطالب",
  },
  en: {
    title: "Quick Payment",
    studentName: "Student Name",
    remainingFee: "Remaining Fee",
    amount: "Amount",
    amountPlaceholder: "Enter amount",
    paymentMethod: "Payment Method",
    cash: "Cash",
    bank_transfer: "Bank Transfer",
    check: "Check",
    notes: "Notes",
    notesPlaceholder: "Additional notes (optional)",
    receiptNumber: "Receipt Number",
    receiptPlaceholder: "Manual receipt number (optional)",
    submit: "Record Payment",
    submitting: "Submitting...",
    cancel: "Cancel",
    currency: "IQD",
    paidInFull: "Student has paid in full",
    exceedsRemaining: "Amount exceeds remaining fee",
    amountRequired: "Please enter an amount",
    amountPositive: "Amount must be greater than zero",
    genericError: "An error occurred while recording the payment",
    noSchool: "No school selected",
    noStudent: "No student selected",
  },
} as const;

const PAYMENT_METHODS: { value: PaymentMethod; icon: typeof DollarSign }[] = [
  { value: "cash", icon: DollarSign },
  { value: "bank_transfer", icon: Building2 },
  { value: "check", icon: FileText },
];

// ── Component ────────────────────────────────────────────────────────────────

export function QuickPayModal({
  show,
  student,
  schoolId,
  branchId,
  onClose,
  onSuccess,
}: QuickPayModalProps) {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname) as "ar" | "en";
  const t = LABELS[locale] ?? LABELS.ar;

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Reset form state when modal opens or student changes
  useEffect(() => {
    if (show) {
      setAmount("");
      setMethod("cash");
      setNotes("");
      setReceiptNumber("");
      setError("");
      setSubmitting(false);
    }
  }, [show, student?.id]);

  const remaining = student?.remaining_fee ?? 0;

  const validate = useCallback((): string | null => {
    if (!schoolId) return t.noSchool;
    if (!student) return t.noStudent;
    const num = parseFloat(amount);
    if (!amount.trim()) return t.amountRequired;
    if (isNaN(num) || num <= 0) return t.amountPositive;
    if (remaining <= 0) return t.paidInFull;
    if (num > remaining) return t.exceedsRemaining;
    return null;
  }, [amount, remaining, schoolId, student, t]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      const validationError = validate();
      if (validationError) {
        setError(validationError);
        return;
      }

      setSubmitting(true);

      try {
        const body = {
          school_id: schoolId,
          student_id: student!.id,
          amount: parseFloat(amount),
          payment_method: method,
          ...(notes.trim() ? { notes: notes.trim() } : {}),
          ...(receiptNumber.trim() ? { manual_receipt_number: receiptNumber.trim() } : {}),
        };

        const { response, payload } = await fetchJsonWithAuthorizedSession<PaymentApiResponse & PaymentApiError>(
          "/api/web/payments/records",
          {
            method: "POST",
            headers: withJsonHeaders(),
            body: JSON.stringify(body),
          },
        );

        if (!response.ok || !payload?.ok) {
          const code = payload?.error?.code;
          if (code === "PAID_IN_FULL") {
            setError(t.paidInFull);
          } else if (code === "PAYMENT_EXCEEDS_REMAINING") {
            setError(t.exceedsRemaining);
          } else {
            setError(payload?.error?.message ?? t.genericError);
          }
          return;
        }

        onSuccess();
        onClose();
      } catch {
        setError(t.genericError);
      } finally {
        setSubmitting(false);
      }
    },
    [amount, method, notes, receiptNumber, schoolId, student, validate, onSuccess, onClose, t],
  );

  if (!student) return null;

  return (
    <Modal open={show} onClose={onClose} size="md">
      <ModalHeader title={t.title} onClose={onClose} />

      <form onSubmit={handleSubmit}>
        <ModalBody>
          {/* ── Student Info Banner ──────────────────────────────── */}
          <div
            className="rounded-xl p-4 mb-5 flex items-center justify-between gap-4"
            style={{
              background: "color-mix(in srgb, var(--primary) 8%, transparent)",
              border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
            }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--text-muted)] mb-0.5">{t.studentName}</p>
              <p className="text-base font-bold text-[var(--text-primary)] truncate">
                {student.full_name}
              </p>
            </div>
            <div className="text-end shrink-0">
              <p className="text-xs font-medium text-[var(--text-muted)] mb-0.5">{t.remainingFee}</p>
              <p
                className="text-lg font-bold tabular-nums"
                style={{
                  color: remaining > 0 ? "var(--danger)" : "var(--success)",
                }}
              >
                {formatNumber(remaining)} <span className="text-xs font-normal">{t.currency}</span>
              </p>
            </div>
          </div>

          {/* ── Error Display ────────────────────────────────────── */}
          {error && (
            <div
              className="rounded-lg px-3 py-2.5 mb-4 flex items-start gap-2 text-sm"
              style={{
                background: "color-mix(in srgb, var(--danger) 8%, transparent)",
                border: "1px solid color-mix(in srgb, var(--danger) 25%, transparent)",
                color: "var(--danger)",
              }}
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Paid-in-full Notice ──────────────────────────────── */}
          {remaining <= 0 && (
            <div
              className="rounded-lg px-3 py-2.5 mb-4 flex items-center gap-2 text-sm"
              style={{
                background: "color-mix(in srgb, var(--success) 8%, transparent)",
                border: "1px solid color-mix(in srgb, var(--success) 25%, transparent)",
                color: "var(--success)",
              }}
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{t.paidInFull}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* ── Amount ─────────────────────────────────────────── */}
            <div>
              <label
                htmlFor="qp-amount"
                className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
              >
                {t.amount} <span className="text-[var(--danger)]">*</span>
              </label>
              <div className="relative">
                <input
                  id="qp-amount"
                  type="number"
                  required
                  min={1}
                  max={remaining > 0 ? remaining : undefined}
                  step="any"
                  value={amount}
                  disabled={remaining <= 0 || submitting}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder={t.amountPlaceholder}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2.5 pe-16 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-shadow disabled:opacity-50 disabled:cursor-not-allowed tabular-nums"
                  autoFocus
                />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--text-muted)] pointer-events-none select-none">
                  {t.currency}
                </span>
              </div>
              {remaining > 0 && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setAmount(String(remaining));
                    if (error) setError("");
                  }}
                  className="mt-1.5 text-xs font-medium text-[var(--primary)] hover:underline disabled:opacity-50"
                >
                  {locale === "en" ? "Pay full remaining" : "سداد كامل المتبقي"} ({formatNumber(remaining)})
                </button>
              )}
            </div>

            {/* ── Payment Method ──────────────────────────────────── */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                {t.paymentMethod}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(({ value, icon: Icon }) => {
                  const isActive = method === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={submitting}
                      onClick={() => setMethod(value)}
                      className="flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-medium transition-all disabled:opacity-50"
                      style={{
                        borderColor: isActive
                          ? "var(--primary)"
                          : "var(--border)",
                        background: isActive
                          ? "color-mix(in srgb, var(--primary) 8%, transparent)"
                          : "var(--bg-primary)",
                        color: isActive
                          ? "var(--primary)"
                          : "var(--text-secondary)",
                      }}
                    >
                      <Icon className="h-4 w-4" />
                      {t[value]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Notes ──────────────────────────────────────────── */}
            <div>
              <label
                htmlFor="qp-notes"
                className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
              >
                {t.notes}
              </label>
              <textarea
                id="qp-notes"
                rows={2}
                value={notes}
                disabled={submitting}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.notesPlaceholder}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-shadow resize-none disabled:opacity-50"
              />
            </div>

            {/* ── Manual Receipt Number ──────────────────────────── */}
            <div>
              <label
                htmlFor="qp-receipt"
                className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
              >
                <span className="flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5" />
                  {t.receiptNumber}
                </span>
              </label>
              <input
                id="qp-receipt"
                type="text"
                value={receiptNumber}
                disabled={submitting}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder={t.receiptPlaceholder}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-shadow disabled:opacity-50"
              />
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            disabled={submitting || remaining <= 0}
          >
            <CreditCard className="h-4 w-4" />
            {submitting ? t.submitting : t.submit}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            {t.cancel}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export default QuickPayModal;
