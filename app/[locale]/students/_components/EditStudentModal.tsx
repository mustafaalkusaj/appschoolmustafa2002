"use client";

import { useTranslations } from "next-intl";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/formatting";
import type { StudentFormData, ClassFee, StudentWithFees } from "../_types";

interface EditStudentModalProps {
  show: boolean;
  isReadOnlyView: boolean;
  selectedStudent: StudentWithFees | null;
  editForm: StudentFormData;
  setEditForm: (form: StudentFormData) => void;
  classFees: ClassFee[];
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function EditStudentModal({
  show,
  isReadOnlyView,
  selectedStudent,
  editForm,
  setEditForm,
  classFees,
  saving,
  error: _error,
  onClose,
  onSubmit,
}: EditStudentModalProps) {
  const t = useTranslations("students.modals");
  const commonT = useTranslations("common");
  const classOptions = [
    ...classFees,
    ...(editForm.class_name &&
    editForm.class_name !== "__manual__" &&
    !classFees.some((item) => item.class_name === editForm.class_name)
      ? [{ id: `custom-${editForm.class_name}`, class_name: editForm.class_name }]
      : []),
  ];

  if (isReadOnlyView || !selectedStudent) return null;

  return (
    <Modal open={show} onClose={onClose} size="lg">
      <ModalHeader title={t("editTitle")} onClose={onClose} />

      <form onSubmit={onSubmit}>
        <ModalBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label={t("form.fullName")} htmlFor="edit_full_name" required className="sm:col-span-2">
              <Input
                id="edit_full_name"
                required
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              />
            </FormField>

            <FormField label={t("form.className")} htmlFor="edit_class_name" required>
              <Select
                id="edit_class_name"
                required
                value={editForm.class_name}
                onChange={(e) => {
                  const cls = e.target.value;
                  const cf = classFees.find((x) => x.class_name === cls);
                  setEditForm({ ...editForm, class_name: cls, total_fee: cf ? String(cf.total_fee ?? "") : editForm.total_fee });
                }}
                  >
                    <option value="">{t("form.selectClass")}</option>
                    {classOptions.map((cf) => (
                      <option key={cf.id} value={cf.class_name}>
                        {cf.class_name}
                      </option>
                    ))}
                    <option value="__manual__">{t("form.manualEntry")}</option>
              </Select>
              {editForm.class_name === "__manual__" && (
                <Input
                  placeholder={t("form.manualPlaceholder")}
                  className="mt-2"
                  onChange={(e) => setEditForm({ ...editForm, class_name: e.target.value })}
                />
              )}
              {editForm.class_name && editForm.class_name !== "__manual__" && (() => {
                const cf = classFees.find((x) => x.class_name === editForm.class_name);
                if (!cf) return null;
                return (
                  <div className="mt-2 p-2 rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-xs font-semibold text-[var(--primary)]">
                    {t("form.installmentInfo", {
                      amount: `${commonT("currency")} ${formatNumber(cf.installment_amount ?? 0)}`,
                      count: cf.installments ?? 0
                    })}
                  </div>
                );
              })()}
            </FormField>

            <FormField label={t("form.section")} htmlFor="edit_section" helpText={t("form.optional")}>
              <Input
                id="edit_section"
                placeholder={t("form.sectionPlaceholder")}
                value={editForm.section}
                onChange={(e) => setEditForm({ ...editForm, section: e.target.value })}
              />
            </FormField>

            <FormField label={t("form.address")} htmlFor="edit_address" helpText={t("form.optional")}>
              <Input
                id="edit_address"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              />
            </FormField>

            <FormField label={t("form.phone")} htmlFor="edit_phone" helpText={t("form.optional")}>
              <Input
                id="edit_phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </FormField>

            <FormField
              label={t("form.totalFee", { currency: commonT("currency") })}
              htmlFor="edit_total_fee"
              helpText={editForm.class_name && classFees.find((x) => x.class_name === editForm.class_name) ? t("form.autoFromClass") : undefined}
            >
              <Input
                id="edit_total_fee"
                type="number"
                value={editForm.total_fee}
                onChange={(e) => setEditForm({ ...editForm, total_fee: e.target.value })}
              />
            </FormField>

            <FormField label={t("form.paidFee")} htmlFor="edit_paid_fee">
              <Input
                id="edit_paid_fee"
                type="number"
                value={editForm.paid_fee}
                onChange={(e) => setEditForm({ ...editForm, paid_fee: e.target.value })}
              />
            </FormField>

            <FormField label={t("form.discount", { currency: commonT("currency") })} htmlFor="edit_discount" helpText={t("form.optional")}>
              <Input
                id="edit_discount"
                type="number"
                placeholder="0"
                value={editForm.discount_value}
                onChange={(e) => setEditForm({ ...editForm, discount_value: e.target.value })}
              />
              {(() => {
                const totalFee = parseFloat(editForm.total_fee) || 0;
                const discount = parseFloat(editForm.discount_value) || 0;
                const paidFee = parseFloat(editForm.paid_fee) || 0;
                const effectiveFee = Math.max(totalFee - discount, 0);
                if (discount > 0 && totalFee > 0) {
                  return (
                    <div className="mt-2 p-2 rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] text-xs font-semibold text-[var(--warning)]">
                      {t("form.afterDiscount", {
                        amount: `${commonT("currency")} ${formatNumber(effectiveFee)}`
                      })}
                    </div>
                  );
                }
                if (paidFee > effectiveFee && effectiveFee > 0) {
                  return (
                    <div className="mt-2 p-2 rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-xs font-semibold text-[var(--danger)]">
                      {t("form.paidExceedsTotal")}
                    </div>
                  );
                }
                return null;
              })()}
            </FormField>

            <FormField label={t("form.status")} htmlFor="edit_status">
              <Select
                id="edit_status"
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value as StudentFormData["status"] })}
              >
                <option value="active">{commonT("studentStatus.active")}</option>
                <option value="transferred">{commonT("studentStatus.transferred")}</option>
                <option value="graduated">{commonT("studentStatus.graduated")}</option>
                <option value="withdrawn">{commonT("studentStatus.withdrawn")}</option>
                <option value="archived">{commonT("studentStatus.archived")}</option>
                <option value="suspended">{commonT("studentStatus.suspended")}</option>
              </Select>
            </FormField>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button type="submit" loading={saving}>
            {saving ? t("form.saving") : t("form.saveChanges")}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            {commonT("cancel")}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
