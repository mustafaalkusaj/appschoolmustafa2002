"use client";

import { useTranslations } from "next-intl";
import { Pause, AlertTriangle } from "lucide-react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { StudentWithFees } from "../_types";

interface SuspendConfirmModalProps {
  show: boolean;
  selectedStudent: StudentWithFees | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SuspendConfirmModal({
  show,
  selectedStudent,
  onConfirm,
  onCancel,
}: SuspendConfirmModalProps) {
  const t = useTranslations("students.modals");

  if (!selectedStudent) return null;

  return (
    <Modal open={show} onClose={onCancel} size="sm">
      <ModalHeader title={t("suspendTitle")} onClose={onCancel} />

      <ModalBody>
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-16 h-16 rounded-full bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] flex items-center justify-center mb-4">
            <Pause className="h-8 w-8 text-[var(--warning)]" />
          </div>

          <p className="text-[var(--text-primary)] font-semibold mb-2">
            {t("suspendConfirm.message")}
          </p>
          <p className="text-lg font-bold text-[var(--primary)] mb-3">
            &ldquo;{selectedStudent.full_name}&rdquo;
          </p>
          <p className="text-sm text-[var(--text-muted)] flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />
            {t("suspendConfirm.warning")}
          </p>
        </div>
      </ModalBody>

      <ModalFooter className="justify-center">
        <Button
          variant="destructive"
          onClick={onConfirm}
          className="bg-[var(--warning)] hover:bg-[color-mix(in_srgb,var(--warning)_85%,black)]"
        >
          {t("suspendConfirm.confirm")}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {t("suspendConfirm.cancel")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
