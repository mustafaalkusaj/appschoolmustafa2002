"use client";

import { useTranslations } from "next-intl";
import { AppIcon } from "@/components/AppIcon";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { Teacher } from "../_types";

interface PrintModalProps {
  show: boolean;
  teachers: Teacher[];
  printTeacher: string;
  onClose: () => void;
  onTeacherChange: (id: string) => void;
  onPrintReport: (teacherId: string) => void;
  onPrintAll: () => void;
}

export function PrintModal({
  show,
  teachers,
  printTeacher,
  onClose,
  onTeacherChange,
  onPrintReport,
  onPrintAll,
}: PrintModalProps) {
  const t = useTranslations();

  return (
    <Modal open={show} onClose={onClose} size="sm">
      <ModalHeader
        title={t("salaries.printModal.title")}
        onClose={onClose}
      />
      <ModalBody className="space-y-4">
        {/* Individual Teacher Report */}
        <div className="rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
            <AppIcon token="👤" size={14} />
            {t("salaries.printModal.individualTitle")}
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            {t("salaries.printModal.individualDescription")}
          </p>
          <Select
            value={printTeacher}
            onChange={(e) => onTeacherChange(e.target.value)}
          >
            <option value="">{t("salaries.printModal.selectTeacherPlaceholder")}</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.full_name}</option>
            ))}
          </Select>
          <Button
            className="w-full bg-[var(--info)] hover:brightness-110"
            disabled={!printTeacher}
            onClick={() => printTeacher && onPrintReport(printTeacher)}
          >
            <AppIcon token="🖨️" size={13} />
            {t("salaries.printModal.print")}
          </Button>
        </div>

        {/* All Teachers Report */}
        <div className="rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
            <AppIcon token="👥" size={14} />
            {t("salaries.printModal.summaryTitle")}
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            {t("salaries.printModal.summaryDescription")}
          </p>
          <Button
            variant="secondary"
            className="w-full"
            onClick={onPrintAll}
          >
            <AppIcon token="☰" size={13} />
            {t("salaries.printModal.printAll")}
          </Button>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>{t("salaries.printModal.close")}</Button>
      </ModalFooter>
    </Modal>
  );
}
