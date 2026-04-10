"use client";

import { useTranslations } from "next-intl";
import { Trash2, AlertTriangle } from "lucide-react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { StudentWithFees } from "../_types";

interface DeleteConfirmModalProps {
  show: boolean;
  isReadOnlyView: boolean;
  canDeleteStudents: boolean;
  selectedStudent: StudentWithFees | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({
  show,
  isReadOnlyView,
  canDeleteStudents,
  selectedStudent,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  const t = useTranslations("students.modals");

  if (isReadOnlyView || !canDeleteStudents || !selectedStudent) return null;

  return (
    <Modal open={show} onClose={onCancel} size="sm">
      <ModalHeader title={t("deleteTitle")} onClose={onCancel} />

      <ModalBody>
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-16 h-16 rounded-full bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] flex items-center justify-center mb-4">
            <Trash2 className="h-8 w-8 text-[var(--danger)]" />
          </div>

          <p className="text-[var(--text-primary)] font-semibold mb-2">
            {t("deleteConfirm.message")}
          </p>
          <p className="text-lg font-bold text-[var(--primary)] mb-3">
            "{selectedStudent.full_name}"
          </p>
          <p className="text-sm text-[var(--text-muted)] flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />
            {t("deleteConfirm.warning")}
          </p>
        </div>
      </ModalBody>

      <ModalFooter className="justify-center">
        <Button variant="destructive" onClick={onConfirm}>
          {t("deleteConfirm.confirm")}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {t("deleteConfirm.cancel")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
