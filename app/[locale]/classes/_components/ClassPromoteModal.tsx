"use client";

import { useState, useEffect } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { ClassItem } from "../../dashboard/_components/types";

interface Props {
  show: boolean;
  sourceClass: ClassItem;
  studentCount: number;
  classes: ClassItem[];
  loading: boolean;
  error?: string;
  onConfirm: (targetClassName: string) => void;
  onClose: () => void;
  locale: "ar" | "en";
}

export function ClassPromoteModal({
  show,
  sourceClass,
  studentCount,
  classes,
  loading,
  error,
  onConfirm,
  onClose,
  locale,
}: Props) {
  const isEn = locale === "en";
  const [targetClass, setTargetClass] = useState("");

  useEffect(() => {
    if (show) setTargetClass("");
  }, [show]);

  const options = classes.filter((c) => c.id !== sourceClass.id);

  return (
    <Modal open={show} onClose={onClose} size="sm">
      <ModalHeader
        title={isEn ? "Mass Promotion" : "ترقية جماعية"}
        onClose={onClose}
      />
      <ModalBody>
        <div className="space-y-4">
          {error && (
            <div className="px-4 py-2.5 rounded-lg text-sm font-medium bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] text-[var(--danger)] border border-[color-mix(in_srgb,var(--danger)_20%,transparent)]">
              {error}
            </div>
          )}
          <div className="p-4 rounded-xl bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] border border-[color-mix(in_srgb,var(--warning)_20%,transparent)]">
            <div className="flex items-start gap-3">
              <span className="text-xl">🎓</span>
              <div className="text-sm">
                <div className="font-semibold text-[var(--warning)] mb-1">
                  {isEn ? "End of Year Promotion" : "ترقية نهاية العام"}
                </div>
                <div className="text-[var(--text-muted)]">
                  {isEn ? `${studentCount} students from ` : `سيتم نقل ${studentCount} طالب من `}
                  <span className="font-semibold text-[var(--text)]">{sourceClass.name}</span>
                  {isEn ? " will be moved to the selected class." : " إلى الصف الجديد."}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-[var(--text-muted)]">
              {isEn ? "Promote to" : "الترقية إلى"}
            </label>
            <select
              value={targetClass}
              onChange={(e) => setTargetClass(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <option value="">{isEn ? "Select target class..." : "اختر الصف الجديد..."}</option>
              {options.map((cls) => (
                <option key={cls.id} value={cls.name}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          {targetClass && (
            <div className="flex items-center gap-2 text-sm bg-[var(--surface-soft)] px-3 py-2 rounded-lg">
              <span className="font-medium text-[var(--text)]">{sourceClass.name}</span>
              <span className="text-[var(--text-muted)]">→</span>
              <span className="font-medium text-[var(--primary)]">{targetClass}</span>
              <span className="ms-auto text-xs text-[var(--text-muted)]">({studentCount} {isEn ? "students" : "طالب"})</span>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            {isEn ? "Cancel" : "إلغاء"}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onConfirm(targetClass)}
            disabled={!targetClass || loading}
          >
            {loading
              ? (isEn ? "Promoting..." : "جاري الترقية...")
              : (isEn ? `Promote ${studentCount} Students` : `ترقية ${studentCount} طالب`)}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
