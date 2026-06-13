"use client";

import { useState, useEffect } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { DatePicker } from "@/components/ui/date-picker";
import { Loader2 } from "@/lib/icons";
import { fetchWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";

interface ExpenseType { id: string; name: string }

interface DashboardExpenseModalProps {
  show: boolean;
  schoolId: string | null;
  locale: "ar" | "en";
  onClose: () => void;
  onSuccess: () => void;
}

const makeDefaultForm = () => ({
  expense_type_id: "",
  amount: "",
  expense_date: new Date().toISOString().slice(0, 10),
  recipient: "",
  receipt_number: "",
  notes: "",
  receipt_image_url: null as string | null,
});

export function DashboardExpenseModal({ show, schoolId, locale, onClose, onSuccess }: DashboardExpenseModalProps) {
  const isEn = locale === "en";
  const [form, setForm] = useState(makeDefaultForm());
  const [types, setTypes] = useState<ExpenseType[]>([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptUploadError, setReceiptUploadError] = useState("");

  useEffect(() => {
    if (!show || !schoolId) return;
    setTypesLoading(true);
    fetchWithAuthorizedSession(`/api/web/expenses/types?schoolId=${schoolId}`)
      .then((r) => r.json())
      .then((data) => {
        const list: ExpenseType[] = (data as { types?: ExpenseType[] }).types ?? [];
        setTypes(list);
        if (list[0]) setForm((f) => ({ ...f, expense_type_id: list[0].id }));
      })
      .catch(() => {})
      .finally(() => setTypesLoading(false));
  }, [show, schoolId]);

  const handleClose = () => {
    setForm(makeDefaultForm());
    setError("");
    setReceiptUploadError("");
    onClose();
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingReceipt(true);
    setReceiptUploadError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("schoolId", schoolId ?? "");
      const res = await fetchWithAuthorizedSession("/api/web/receipts/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({})) as { url?: string; error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message || (isEn ? "Upload failed" : "فشل الرفع"));
      setForm((f) => ({ ...f, receipt_image_url: data.url ?? null }));
    } catch (err) {
      setReceiptUploadError(err instanceof Error ? err.message : (isEn ? "Upload error" : "خطأ في رفع الصورة"));
    } finally {
      setUploadingReceipt(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetchWithAuthorizedSession("/api/web/expenses", {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify({
          school_id: schoolId,
          expense_type_id: form.expense_type_id,
          amount: Number(form.amount),
          expense_date: form.expense_date,
          recipient: form.recipient || null,
          receipt_number: form.receipt_number || null,
          notes: form.notes || null,
          receipt_image_url: form.receipt_image_url,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: { message?: string } };
        setError(data?.error?.message || (isEn ? "Failed to save" : "فشل الحفظ"));
        return;
      }
      handleClose();
      onSuccess();
    } catch {
      setError(isEn ? "Network error" : "خطأ في الاتصال");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={show} onClose={handleClose} size="md">
      <form onSubmit={handleSubmit}>
        <ModalHeader title={isEn ? "Add Expense" : "إضافة مصروف"} onClose={handleClose} />
        <ModalBody className="space-y-4">
          <FormField label={isEn ? "Expense Type *" : "نوع المصروف *"}>
            {typesLoading ? (
              <div className="h-10 rounded-xl bg-[var(--surface-soft)] animate-pulse" />
            ) : (
              <Select
                value={form.expense_type_id}
                onChange={(e) => setForm({ ...form, expense_type_id: e.target.value })}
                required
              >
                <option value="">{isEn ? "Select type" : "اختر النوع"}</option>
                {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            )}
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label={isEn ? "Amount (IQD) *" : "المبلغ (د.ع) *"}>
              <Input
                type="number"
                min="1"
                required
                placeholder="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                dir="ltr"
              />
            </FormField>
            <FormField label={isEn ? "Date *" : "التاريخ *"}>
              <DatePicker value={form.expense_date || undefined} onChange={(v) => setForm({ ...form, expense_date: v ?? "" })} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label={isEn ? "Recipient" : "مستلم الفاتورة"}>
              <Input
                value={form.recipient}
                onChange={(e) => setForm({ ...form, recipient: e.target.value })}
                placeholder={isEn ? "Recipient name..." : "اسم المستلم..."}
              />
            </FormField>
            <FormField label={isEn ? "Receipt No." : "رقم الإيصال"}>
              <Input
                value={form.receipt_number}
                onChange={(e) => setForm({ ...form, receipt_number: e.target.value })}
                placeholder={isEn ? "Receipt number..." : "رقم الإيصال..."}
              />
            </FormField>
          </div>

          <FormField label={isEn ? "Receipt Image" : "صورة الإيصال"}>
            {form.receipt_image_url ? (
              <div className="relative mb-2 inline-block">
                <img
                  src={form.receipt_image_url}
                  alt={isEn ? "Receipt" : "إيصال"}
                  className="h-24 rounded-xl object-cover border border-[var(--border)]"
                />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, receipt_image_url: null }))}
                  className="absolute -top-2 -end-2 h-5 w-5 rounded-full bg-[var(--danger)] text-white text-xs flex items-center justify-center leading-none"
                >
                  ×
                </button>
              </div>
            ) : null}
            <label className="flex items-center gap-2 cursor-pointer h-10 px-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-soft)] text-sm text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors w-full">
              {uploadingReceipt
                ? <><Loader2 size={14} className="animate-spin" /><span>{isEn ? "Uploading..." : "جاري الرفع..."}</span></>
                : <span>{form.receipt_image_url ? (isEn ? "Change image" : "تغيير الصورة") : (isEn ? "Upload receipt image" : "رفع صورة الإيصال")}</span>
              }
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleReceiptUpload} disabled={uploadingReceipt} />
            </label>
            {receiptUploadError && (
              <p className="text-xs text-[var(--danger)] mt-1">{receiptUploadError}</p>
            )}
          </FormField>

          <FormField label={isEn ? "Notes" : "ملاحظات"}>
            <textarea
              className="w-full h-20 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] transition-colors resize-none"
              placeholder={isEn ? "Any notes..." : "أي ملاحظات..."}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>

          {error && (
            <p className="text-xs text-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] rounded-xl px-3 py-2">{error}</p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button type="submit" disabled={saving || uploadingReceipt} className="flex-1">
            {saving ? (isEn ? "Saving..." : "جارٍ الحفظ...") : (isEn ? "Add Expense" : "إضافة المصروف")}
          </Button>
          <Button type="button" variant="outline" onClick={handleClose}>
            {isEn ? "Cancel" : "إلغاء"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
