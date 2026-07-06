"use client";

import { useState, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { getLocaleFromPath } from "@/lib/locale-routing";
import {
  fetchJsonWithAuthorizedSession,
  withJsonHeaders,
} from "@/lib/authorized-api";
import type { StudentWithFees, ClassFee } from "../_types";

// ── Types ────────────────────────────────────────────────────────────────────

interface ChangeClassModalProps {
  show: boolean;
  student: StudentWithFees | null;
  classFees: ClassFee[];
  onClose: () => void;
  onSuccess: (updated: StudentWithFees) => void;
}

// ── Labels ───────────────────────────────────────────────────────────────────

const LABELS = {
  ar: {
    title: "تغيير الصف",
    studentName: "اسم الطالب",
    currentClass: "الصف الحالي",
    currentSection: "الشعبة الحالية",
    newClass: "الصف الجديد",
    selectClass: "اختر الصف",
    newSection: "الشعبة الجديدة",
    sectionPlaceholder: "أدخل الشعبة (اختياري)",
    confirm: "تأكيد التغيير",
    cancel: "إلغاء",
    noChange: "لم يتم اختيار صف مختلف",
    errorGeneric: "حدث خطأ أثناء تغيير الصف",
    none: "بدون شعبة",
  },
  en: {
    title: "Change Class",
    studentName: "Student Name",
    currentClass: "Current Class",
    currentSection: "Current Section",
    newClass: "New Class",
    selectClass: "Select class",
    newSection: "New Section",
    sectionPlaceholder: "Enter section (optional)",
    confirm: "Confirm Change",
    cancel: "Cancel",
    noChange: "No different class selected",
    errorGeneric: "An error occurred while changing the class",
    none: "No section",
  },
} as const;

// ── Component ────────────────────────────────────────────────────────────────

export function ChangeClassModal({
  show,
  student,
  classFees,
  onClose,
  onSuccess,
}: ChangeClassModalProps) {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname) as "ar" | "en";
  const l = LABELS[locale] ?? LABELS.ar;

  const [selectedClass, setSelectedClass] = useState("");
  const [section, setSection] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Derive unique class names from classFees
  const availableClasses = useMemo(
    () =>
      Array.from(
        new Set(
          classFees
            .map((cf) => cf.class_name?.trim())
            .filter(Boolean)
        )
      ) as string[],
    [classFees]
  );

  // Reset form state when modal opens/closes or student changes
  const resetForm = useCallback(() => {
    setSelectedClass("");
    setSection("");
    setError("");
    setLoading(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleConfirm = useCallback(async () => {
    if (!student || !selectedClass) return;

    setError("");
    setLoading(true);

    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<StudentWithFees>(
        "/api/web/students",
        {
          method: "PATCH",
          headers: withJsonHeaders(),
          body: JSON.stringify({
            id: student.id,
            class_name: selectedClass,
            section: section.trim() || null,
            school_id: student.school_id,
          }),
        }
      );

      if (!response.ok) {
        const errMsg =
          (payload as unknown as { error?: string })?.error ?? l.errorGeneric;
        setError(errMsg);
        return;
      }

      if (payload) {
        onSuccess(payload);
      }
      handleClose();
    } catch {
      setError(l.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [student, selectedClass, section, l, onSuccess, handleClose]);

  if (!student) return null;

  const isSameClass =
    selectedClass === student.class_name &&
    (section.trim() || "") === (student.section || "");

  const isConfirmDisabled = !selectedClass || isSameClass || loading;

  return (
    <Modal open={show} onClose={handleClose} size="md">
      <ModalHeader title={l.title} onClose={handleClose} />

      <ModalBody>
        <div className="space-y-5">
          {/* ── Student Info (read-only) ─────────────────────────────── */}
          <div className="bg-[color-mix(in_srgb,var(--primary)_5%,transparent)] p-4 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">{l.studentName}</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {student.full_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">{l.currentClass}</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {student.class_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">{l.currentSection}</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {student.section || l.none}
                </span>
              </div>
            </div>
          </div>

          {/* ── Icon Divider ─────────────────────────────────────────── */}
          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-full bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] flex items-center justify-center">
              <ArrowRightLeft className="h-5 w-5 text-[var(--primary)]" />
            </div>
          </div>

          {/* ── New Class Selector ────────────────────────────────────── */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                {l.newClass}
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring-color)] transition-colors"
              >
                <option value="">{l.selectClass}</option>
                {availableClasses.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            {/* ── New Section Input ─────────────────────────────────── */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                {l.newSection}
              </label>
              <input
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder={l.sectionPlaceholder}
                disabled={loading}
                className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-input)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring-color)] transition-colors"
              />
            </div>
          </div>

          {/* ── Error Display ────────────────────────────────────────── */}
          {error && (
            <div className="p-3 rounded-lg bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] text-[var(--danger)] text-sm font-medium">
              {error}
            </div>
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="ghost" onClick={handleClose} disabled={loading}>
          {l.cancel}
        </Button>
        <Button
          variant="primary"
          onClick={handleConfirm}
          disabled={isConfirmDisabled}
          loading={loading}
        >
          {l.confirm}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default ChangeClassModal;
