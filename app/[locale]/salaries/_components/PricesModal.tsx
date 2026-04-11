"use client";

import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LecturePrice, ClassItem } from "../_types";

interface PricesModalProps {
  show: boolean;
  classes: ClassItem[];
  lecturePrices: LecturePrice[];
  priceEdits: Record<string, number>;
  onClose: () => void;
  onPriceChange: (grade: string, price: number) => void;
  onSave: () => void;
}

export function PricesModal({
  show,
  classes,
  lecturePrices: _lecturePrices,
  priceEdits,
  onClose,
  onPriceChange,
  onSave,
}: PricesModalProps) {
  const gradeOptions = Array.from(new Set(classes.map((c) => c.grade))) as string[];

  return (
    <Modal open={show} onClose={onClose} size="sm">
      <ModalHeader
        title="أسعار المحاضرات"
        onClose={onClose}
      />
      <ModalBody className="space-y-4">
        <p className="text-sm text-[var(--text-muted)]">
          حدد سعر المحاضرة الواحدة لكل صف ليتم احتساب الرواتب تلقائياً.
        </p>

        <div className="space-y-3">
          {gradeOptions.map((grade) => (
            <div
              key={grade}
              className="flex items-center justify-between gap-4 py-2 border-b border-[var(--border)] last:border-0"
            >
              <span className="text-sm font-semibold text-[var(--text-primary)]">{grade}</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={priceEdits[grade] || 0}
                  onChange={(e) => onPriceChange(grade, parseInt(e.target.value) || 0)}
                  className="w-24 text-center"
                />
                <span className="text-xs text-[var(--text-muted)]">د.ع</span>
              </div>
            </div>
          ))}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button onClick={onSave}>حفظ الأسعار</Button>
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
      </ModalFooter>
    </Modal>
  );
}
