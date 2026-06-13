"use client";

import { useState, useEffect } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { ClassItem, SectionItem } from "../../dashboard/_components/types";

interface Props {
  show: boolean;
  studentCount: number;
  studentName?: string;
  classes: ClassItem[];
  sections: SectionItem[];
  loading: boolean;
  onConfirm: (targetClassName: string, targetSection: string) => void;
  onClose: () => void;
  locale: "ar" | "en";
}

export function ClassTransferModal({
  show,
  studentCount,
  studentName,
  classes,
  sections,
  loading,
  onConfirm,
  onClose,
  locale,
}: Props) {
  const isEn = locale === "en";
  const [targetClass, setTargetClass] = useState("");
  const [targetSection, setTargetSection] = useState("");

  useEffect(() => {
    if (show) {
      setTargetClass("");
      setTargetSection("");
    }
  }, [show]);

  const availableSections = sections.filter(
    (s) => classes.find((c) => c.id === s.class_id)?.name === targetClass
  );

  const label =
    studentCount === 1 && studentName
      ? studentName
      : `${studentCount} ${isEn ? "students" : "طلاب"}`;

  return (
    <Modal open={show} onClose={onClose} size="sm">
      <ModalHeader
        title={isEn ? "Transfer Student" : "نقل الطالب"}
        onClose={onClose}
      />
      <ModalBody>
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-[color-mix(in_srgb,var(--primary)_6%,transparent)] text-sm font-medium">
            {isEn ? "Transferring: " : "نقل: "}
            <span className="text-[var(--primary)]">{label}</span>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-[var(--text-muted)]">
              {isEn ? "Target Class" : "الصف الجديد"}
            </label>
            <select
              value={targetClass}
              onChange={(e) => {
                setTargetClass(e.target.value);
                setTargetSection("");
              }}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <option value="">{isEn ? "Select class..." : "اختر الصف..."}</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.name}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-[var(--text-muted)]">
              {isEn ? "Target Section" : "الشعبة الجديدة"}
              <span className="text-xs text-[var(--text-muted)] ms-1">({isEn ? "optional" : "اختياري"})</span>
            </label>
            {availableSections.length > 0 ? (
              <select
                value={targetSection}
                onChange={(e) => setTargetSection(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                <option value="">{isEn ? "No section" : "بدون شعبة"}</option>
                {availableSections.map((sec) => (
                  <option key={sec.id} value={sec.name}>
                    {sec.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={targetSection}
                onChange={(e) => setTargetSection(e.target.value)}
                placeholder={isEn ? "e.g. A" : "مثال: أ"}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            )}
          </div>
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
            onClick={() => onConfirm(targetClass, targetSection)}
            disabled={!targetClass || loading}
          >
            {loading ? (isEn ? "Transferring..." : "جاري النقل...") : (isEn ? "Transfer" : "نقل")}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
