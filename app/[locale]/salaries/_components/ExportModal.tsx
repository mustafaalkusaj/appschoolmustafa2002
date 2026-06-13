"use client";

import { AppIcon } from "@/components/AppIcon";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/brand/brand-utils";
import type { ExportOptions } from "../_types";

interface ExportModalProps {
  show: boolean;
  exportOptions: ExportOptions;
  onClose: () => void;
  onOptionsChange: (options: ExportOptions) => void;
  onExport: () => void;
}

export function ExportModal({
  show,
  exportOptions,
  onClose,
  onOptionsChange,
  onExport,
}: ExportModalProps) {
  const exportItems: [keyof ExportOptions, string, string][] = [
    ["teachers", "👨‍🏫", "بيانات الأساتذة"],
    ["subjects", "📚", "المواد الدراسية"],
    ["classes", "🏫", "الصفوف والشعب"],
    ["prices", "🏷️", "أسعار المحاضرات"],
    ["fixed_salaries", "💰", "الرواتب الثابتة"],
    ["lectures", "📋", "سجل المحاضرات"],
    ["lesson_times", "⏰", "توقيتات الدروس"],
  ];

  return (
    <Modal open={show} onClose={onClose} size="sm">
      <ModalHeader
        title="خيارات التصدير"
        onClose={onClose}
      />
      <ModalBody className="space-y-4">
        <Button
          className="w-full bg-[var(--warning)] hover:brightness-110"
          onClick={() =>
            onOptionsChange({
              lesson_times: true,
              classes: true,
              prices: true,
              teachers: true,
              subjects: true,
              fixed_salaries: true,
              lectures: true,
            })
          }
        >
          <AppIcon token="💾" size={14} />
          تصدير كامل النظام
        </Button>

        <div className="space-y-2">
          {exportItems.map(([key, icon, label]) => (
            <button
              key={key}
              onClick={() => onOptionsChange({ ...exportOptions, [key]: !exportOptions[key] })}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-lg",
                "border border-[var(--border)]",
                "hover:bg-[var(--surface-soft)] transition-colors",
                exportOptions[key] && "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] border-[var(--primary)]"
              )}
            >
              <span className="flex items-center gap-3 text-sm font-semibold">
                <AppIcon token={icon} size={13} />
                {label}
              </span>
              <div
                className={cn(
                  "w-5 h-5 rounded flex items-center justify-center text-xs font-bold",
                  exportOptions[key]
                    ? "bg-[var(--primary)] text-white"
                    : "border-2 border-[var(--border)]"
                )}
              >
                {exportOptions[key] && "✓"}
              </div>
            </button>
          ))}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button onClick={onExport}>
          <AppIcon token="⬇️" size={14} />
          تصدير الآن
        </Button>
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
      </ModalFooter>
    </Modal>
  );
}
