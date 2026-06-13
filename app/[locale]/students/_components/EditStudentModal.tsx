"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { formatNumber } from "@/lib/formatting";
import { cropAndCompressImage } from "@/lib/students/image-utils";
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
  schoolId: string | null;
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
  schoolId,
}: EditStudentModalProps) {
  const t = useTranslations("students.modals");
  const commonT = useTranslations("common");

  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const classOptions = [
    ...classFees,
    ...(editForm.class_name &&
    editForm.class_name !== "__manual__" &&
    !classFees.some((item) => item.class_name === editForm.class_name)
      ? [{ id: `custom-${editForm.class_name}`, class_name: editForm.class_name }]
      : []),
  ];

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    setPhotoError("");

    // Optimistic preview immediately
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);

    try {
      const compressed = await cropAndCompressImage(file);
      const fd = new FormData();
      fd.append("file", new File([compressed], "photo.webp", { type: "image/webp" }));
      fd.append("schoolId", schoolId || "");
      const res = await fetch("/api/web/students/photo-upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setPhotoPreview(null);
        URL.revokeObjectURL(previewUrl);
        setPhotoError(data?.error?.message || t("form.photoUploadError"));
      } else {
        setEditForm({ ...editForm, photo_url: data.url });
        setPhotoPreview(null);
        URL.revokeObjectURL(previewUrl);
      }
    } catch {
      setPhotoPreview(null);
      URL.revokeObjectURL(previewUrl);
      setPhotoError(t("form.photoUploadError"));
    } finally {
      setPhotoUploading(false);
    }
  };

  if (isReadOnlyView || !selectedStudent) return null;

  return (
    <Modal open={show} onClose={onClose} size="lg">
      <ModalHeader title={t("editTitle")} onClose={onClose} />

      <form onSubmit={onSubmit}>
        <ModalBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Photo Upload */}
            <div className="sm:col-span-2 flex flex-col items-center gap-2 pb-2">
              <div className="relative group">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[var(--border)] bg-[var(--surface-muted)] flex items-center justify-center">
                  {(photoPreview || editForm.photo_url) ? (
                    <img src={photoPreview ?? editForm.photo_url!} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
                <label className="absolute inset-0 flex items-center justify-center rounded-full cursor-pointer opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handlePhotoChange} />
                </label>
              </div>
              {photoUploading && <span className="text-xs text-[var(--text-muted)]">{t("form.photoUploading")}</span>}
              {photoError && <span className="text-xs text-[var(--danger)]">{photoError}</span>}
              {!editForm.photo_url && !photoPreview && !photoUploading && !photoError && (
                <span className="text-xs text-[var(--text-muted)]">{t("form.photoUploadHint")}</span>
              )}
            </div>

            <FormField label={t("form.fullName")} htmlFor="edit_full_name" required className="sm:col-span-2">
              <Input
                id="edit_full_name"
                required
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              />
            </FormField>

            <FormField label={t("form.registrationNumber")} htmlFor="edit_registration_number" helpText={t("form.optional")}>
              <Input
                id="edit_registration_number"
                value={editForm.registration_number}
                onChange={(e) => setEditForm({ ...editForm, registration_number: e.target.value })}
              />
            </FormField>

            <FormField label={t("form.gender")} htmlFor="edit_gender" helpText={t("form.optional")}>
              <Select
                id="edit_gender"
                value={editForm.gender}
                onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
              >
                <option value="">{t("form.genderSelect")}</option>
                <option value="male">{t("form.genderMale")}</option>
                <option value="female">{t("form.genderFemale")}</option>
              </Select>
            </FormField>

            <FormField label={t("form.dateOfBirth")} htmlFor="edit_date_of_birth" helpText={t("form.optional")}>
              <DatePicker value={editForm.date_of_birth || undefined} onChange={(v) => setEditForm({ ...editForm, date_of_birth: v ?? "" })} />
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

            <FormField label={t("form.parentName")} htmlFor="edit_parent_name" helpText={t("form.optional")}>
              <Input
                id="edit_parent_name"
                value={editForm.parent_name}
                onChange={(e) => setEditForm({ ...editForm, parent_name: e.target.value })}
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

            <FormField label={t("form.phone2")} htmlFor="edit_phone2" helpText={t("form.optional")}>
              <Input
                id="edit_phone2"
                placeholder={t("form.phonePlaceholder")}
                value={editForm.phone2}
                onChange={(e) => setEditForm({ ...editForm, phone2: e.target.value })}
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
