"use client";

import { useState } from "react";
import { Modal, ModalHeader, ModalBody } from "@/components/ui/modal";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import type { StudentWithFees } from "../_types";

interface QuickPayModalProps {
  show: boolean;
  student: StudentWithFees | null;
  schoolId: string | null;
  branchId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "نقداً" },
  { value: "bank_transfer", label: "تحويل بنكي" },
  { value: "check", label: "شيك" },
] as const;

export function QuickPayModal({ show, student, schoolId, branchId, onClose, onSuccess }: QuickPayModalProps) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "bank_transfer" | "check">("cash");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleClose() {
    setAmount("");
    setMethod("cash");
    setNotes("");
    setError("");
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!student || !schoolId) return;

    const parsed = parseFloat(amount.replace(/,/g, ""));
    if (!parsed || parsed <= 0) {
      setError("أدخل مبلغاً صحيحاً");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ error?: { message?: string } }>(
        "/api/web/payments/records",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            school_id: schoolId,
            student_id: student.id,
            amount: parsed,
            payment_method: method,
            notes: notes.trim() || null,
            receipt_date: new Date().toISOString().split("T")[0],
            ...(branchId ? { branch_id: branchId } : {}),
          }),
        }
      );

      if (!response.ok) {
        setError(payload?.error?.message || "تعذر تسجيل الدفعة");
        return;
      }

      handleClose();
      onSuccess();
    } catch {
      setError("حدث خطأ أثناء تسجيل الدفعة");
    } finally {
      setSaving(false);
    }
  }

  if (!student) return null;

  const remaining = student.remaining_fee ?? 0;

  return (
    <Modal open={show} onClose={handleClose} size="sm">
      <ModalHeader title="إضافة دفعة سريعة" onClose={handleClose} />
      <ModalBody>
        <div className="space-y-4">
          {/* Student info */}
          <div className="rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] px-4 py-3">
            <p className="text-sm font-black text-[var(--text-primary)]">{student.full_name}</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              {student.class_name}{student.section ? ` · ${student.section}` : ""}
              {remaining > 0 && (
                <span className="text-[var(--danger)] font-semibold"> · المتبقي: {remaining.toLocaleString("ar")}</span>
              )}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">المبلغ *</label>
              <input
                type="number"
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                autoFocus
              />
            </div>

            {/* Payment method */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">طريقة الدفع</label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMethod(m.value)}
                    className={[
                      "py-2 rounded-lg text-xs font-semibold border transition-all",
                      method === m.value
                        ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                        : "bg-[var(--surface-soft)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)]",
                    ].join(" ")}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">ملاحظات (اختياري)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي ملاحظة إضافية"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
            </div>

            {error && (
              <p className="text-xs font-semibold text-[var(--danger)]">{error}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving || !amount}
                className="flex-1 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-black disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {saving ? "جاري الحفظ..." : "تسجيل الدفعة"}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 rounded-xl bg-[var(--surface-soft)] text-[var(--text-secondary)] text-sm font-semibold border border-[var(--border)] hover:bg-[var(--surface-muted)] transition-colors"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      </ModalBody>
    </Modal>
  );
}
