"use client";

import { formatNumber } from "@/lib/formatting";
import { useTranslations } from "next-intl";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { Card } from "@/components/ui/card";
import { Student, PayFormState } from "../_types";
import { Check } from "lucide-react";

interface PaymentModalProps {
  show: boolean;
  payStudent: Student | null;
  payForm: PayFormState;
  setPayForm: (form: PayFormState) => void;
  saving: boolean;
  totalPaymentCount: number;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  error: string;
  actualPaidFee?: number; // Calculated from actual payments
  // Student search
  studentSearch: string;
  setStudentSearch: (value: string) => void;
  studentSearchResults: Student[];
  studentSearchLoading: boolean;
  showDropdown: boolean;
  setShowDropdown: (show: boolean) => void;
  searchRef: React.RefObject<HTMLDivElement | null>;
  onSelectStudent: (student: Student) => void;
}

export function PaymentModal({
  show,
  payStudent,
  payForm,
  setPayForm,
  saving,
  totalPaymentCount,
  onClose,
  onSubmit,
  error,
  actualPaidFee,
  studentSearch,
  setStudentSearch,
  studentSearchResults,
  studentSearchLoading,
  showDropdown,
  setShowDropdown,
  searchRef,
  onSelectStudent,
}: PaymentModalProps) {
  const t = useTranslations("payments.modal");
  const nextReceiptNum = `REC-${(totalPaymentCount + 1001).toString()}`;

  // Calculate remaining based on actual paid amount
  const displayedPaidFee = actualPaidFee ?? payStudent?.paid_fee ?? 0;
  const displayedRemainingFee = payStudent
    ? Math.max(
        (payStudent.total_fee ?? 0) - displayedPaidFee - (payStudent.discount_value ?? 0),
        0
      )
    : 0;

  return (
    <Modal open={show} onClose={onClose} size="lg">
      <ModalHeader title={t("title")} onClose={onClose} />

      <form onSubmit={onSubmit}>
        <ModalBody className="space-y-6">
          {/* Error message */}
          {error && (
            <div className="bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)] rounded-[var(--radius-md)] p-3 text-sm font-semibold">
              {error}
            </div>
          )}

          {/* Student Search */}
          <FormField label={t("studentName")} htmlFor="student-search" required>
            <div className="relative" ref={searchRef}>
              <Input
                id="student-search"
                placeholder={t("studentSearchPlaceholder")}
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                autoComplete="off"
                success={!!payStudent}
                className={payStudent ? "pe-10" : ""}
              />
              {payStudent && (
                <Check className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--success)]" />
              )}

              {/* Dropdown */}
              {showDropdown && !payStudent && studentSearch && (
                <div className="absolute top-full start-0 end-0 mt-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-lg z-10 max-h-60 overflow-y-auto">
                  {studentSearchLoading ? (
                    <div className="p-4 text-center text-sm text-[var(--text-muted)]">{t("searching")}</div>
                  ) : studentSearchResults.length === 0 ? (
                    <div className="p-4 text-center text-sm text-[var(--text-muted)]">{t("noResults")}</div>
                  ) : (
                    studentSearchResults.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="w-full text-start p-3 hover:bg-[var(--surface-soft)] transition-colors border-b border-[var(--border)] last:border-b-0"
                        onMouseDown={() => onSelectStudent(s)}
                      >
                        <div className="font-semibold text-[var(--text-primary)]">{s.full_name}</div>
                        <div className="flex items-center justify-between mt-1 text-xs">
                          <span className="text-[var(--text-muted)]">{s.class_name}</span>
                          <span className="text-[var(--danger)] font-semibold">
                            متبقي: د.ع {formatNumber(s.remaining_fee)}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </FormField>

          {/* Student Info Box */}
          {payStudent && (
            <Card className="p-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-[var(--text-muted)]">{t("total")}:</span>
                  <p className="font-semibold text-[var(--text-primary)]">د.ع {formatNumber(payStudent.total_fee)}</p>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">{t("paid")}:</span>
                  <p className="font-semibold text-[var(--success)]">د.ع {formatNumber(displayedPaidFee)}</p>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">{t("remaining")}:</span>
                  <p className="font-semibold text-[var(--danger)]">د.ع {formatNumber(displayedRemainingFee)}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Form Fields Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("receiptDate")} htmlFor="receipt-date" required>
              <Input
                id="receipt-date"
                type="date"
                required
                value={payForm.receipt_date}
                onChange={(e) => setPayForm({ ...payForm, receipt_date: e.target.value })}
              />
            </FormField>

            <FormField label={t("amount") + " (" + t("currency") + ")"} htmlFor="payment-amount" required>
              <Input
                id="payment-amount"
                type="number"
                required
                placeholder={t("amount")}
                value={payForm.amount}
                onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
              />
            </FormField>

            <FormField label={t("paperReceiptNumber")} htmlFor="manual-receipt" helpText={t("optional")}>
              <Input
                id="manual-receipt"
                placeholder={t("exampleReceipt")}
                value={payForm.manual_receipt_number}
                onChange={(e) => setPayForm({ ...payForm, manual_receipt_number: e.target.value })}
              />
            </FormField>

            <FormField label={t("electronicReceiptNumber")}>
              <div className="rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--primary)_18%,transparent)] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] p-3 text-center">
                <span className="block break-all text-sm font-bold text-[var(--primary)]">{nextReceiptNum}</span>
              </div>
            </FormField>

            <FormField label={t("paymentMethod")} htmlFor="payment-method">
              <Select
                id="payment-method"
                value={payForm.payment_method}
                onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}
              >
                <option value="cash">{t("methodCash")}</option>
                <option value="bank_transfer">{t("methodBankTransfer")}</option>
                <option value="check">{t("methodCheck")}</option>
              </Select>
            </FormField>

            <FormField label={t("notes")} htmlFor="payment-notes" helpText={t("optional")}>
              <Input
                id="payment-notes"
                placeholder={t("notesPlaceholder")}
                value={payForm.notes}
                onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
              />
            </FormField>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button type="submit" variant="primary" disabled={saving || !payStudent} loading={saving}>
            تسجيل الدفعة
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
