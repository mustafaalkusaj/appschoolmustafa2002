"use client";

import { useState, useEffect } from "react";
import { Modal, ModalHeader, ModalBody } from "@/components/ui/modal";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import type { StudentWithFees, ClassFee } from "../_types";

interface ChangeClassModalProps {
  show: boolean;
  student: StudentWithFees | null;
  classFees: ClassFee[];
  onClose: () => void;
  onSuccess: (updated: StudentWithFees) => void;
}

export function ChangeClassModal({ show, student, classFees, onClose, onSuccess }: ChangeClassModalProps) {
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (student && show) {
      setClassName(student.class_name || "");
      setSection(student.section || "");
      setError("");
    }
  }, [student, show]);

  function handleClose() {
    setError("");
    onClose();
  }

  const classes = Array.from(new Set(classFees.map((c) => c.class_name?.trim()).filter(Boolean))) as string[];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!student) return;

    const trimmedClass = className.trim();
    if (!trimmedClass) {
      setError("اختر الصف");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ student?: StudentWithFees; error?: { message?: string } }>(
        `/api/web/students/${student.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: student.full_name,
            class_name: trimmedClass,
            section: section.trim() || null,
            phone: student.phone || null,
            phone2: (student as { phone2?: string | null }).phone2 || null,
            address: student.address || null,
            total_fee: student.total_fee ?? 0,
            paid_fee: student.paid_fee ?? 0,
            discount_value: student.discount_value ?? 0,
            status: student.status,
            registration_number: student.registration_number || null,
            date_of_birth: student.date_of_birth || null,
            parent_name: student.parent_name || null,
            gender: student.gender || null,
            photo_url: student.photo_url || null,
          }),
        }
      );

      if (!response.ok) {
        setError(payload?.error?.message || "تعذر تغيير الصف");
        return;
      }

      const updated: StudentWithFees = {
        ...student,
        class_name: trimmedClass,
        section: section.trim() || null,
        ...(payload?.student ?? {}),
      };

      handleClose();
      onSuccess(updated);
    } catch {
      setError("حدث خطأ أثناء تغيير الصف");
    } finally {
      setSaving(false);
    }
  }

  if (!student) return null;

  return (
    <Modal open={show} onClose={handleClose} size="sm">
      <ModalHeader title="تغيير الصف" onClose={handleClose} />
      <ModalBody>
        <div className="space-y-4">
          {/* Student info */}
          <div className="rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] px-4 py-3">
            <p className="text-sm font-black text-[var(--text-primary)]">{student.full_name}</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              الصف الحالي: {student.class_name || "—"}{student.section ? ` · ${student.section}` : ""}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Class selector */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">الصف الجديد *</label>
              {classes.length > 0 ? (
                <select
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                >
                  <option value="">-- اختر الصف --</option>
                  {classes.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="اسم الصف"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  autoFocus
                />
              )}
            </div>

            {/* Section */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">الشعبة (اختياري)</label>
              <input
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="مثال: أ، ب"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
            </div>

            {error && (
              <p className="text-xs font-semibold text-[var(--danger)]">{error}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving || !className.trim()}
                className="flex-1 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-black disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {saving ? "جاري الحفظ..." : "تغيير الصف"}
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
