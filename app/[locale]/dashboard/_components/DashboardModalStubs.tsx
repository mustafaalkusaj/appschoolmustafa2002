"use client";

import * as React from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface StubModalProps {
  show: boolean;
  schoolId?: string | null;
  locale?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

function ComingSoonModal({
  show,
  onClose,
  title,
  description,
}: {
  show: boolean;
  onClose: () => void;
  title: string;
  description: string;
}) {
  return (
    <Modal open={show} onClose={onClose} size="md">
      <ModalHeader title={title} description={description} onClose={onClose} />
      <ModalBody>
        <div className="py-10 text-center">
          <p className="text-base font-bold text-[var(--text-primary)]">قريباً</p>
          <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
            هذا النموذج تحت التطوير. استخدم الصفحات المخصصة بالقائمة الجانبية.
          </p>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button type="button" variant="primary" onClick={onClose}>
          إغلاق
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export function DashboardPaymentModal({ show, onClose }: StubModalProps) {
  return (
    <ComingSoonModal
      show={show}
      onClose={onClose}
      title="إضافة دفعة"
      description="نموذج إضافة دفعة سريع"
    />
  );
}

export function DashboardTeacherModal({ show, onClose }: StubModalProps) {
  return (
    <ComingSoonModal
      show={show}
      onClose={onClose}
      title="إضافة معلم"
      description="نموذج إضافة معلم سريع"
    />
  );
}

export function DashboardExpenseModal({ show, onClose }: StubModalProps) {
  return (
    <ComingSoonModal
      show={show}
      onClose={onClose}
      title="إضافة مصروف"
      description="نموذج إضافة مصروف سريع"
    />
  );
}

export function DashboardIncomeModal({ show, onClose }: StubModalProps) {
  return (
    <ComingSoonModal
      show={show}
      onClose={onClose}
      title="إضافة إيراد"
      description="نموذج إضافة إيراد سريع"
    />
  );
}
