"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/brand/brand-utils";
import { formatNumber } from "@/lib/formatting";
import { cropAndCompressImage } from "@/lib/students/image-utils";
import dynamic from "next/dynamic";

const QRPhotoUpload = dynamic(
  () => import("@/components/ui/QRPhotoUpload").then((m) => m.QRPhotoUpload),
  { ssr: false },
);
import type { StudentFormData, ClassFee } from "../_types";

interface AddStudentModalProps {
  show: boolean;
  isReadOnlyView: boolean;
  canManageStudentAccounts: boolean;
  addStep: number;
  setAddStep: (step: number) => void;
  form: StudentFormData;
  setForm: (form: StudentFormData) => void;
  classFees: ClassFee[];
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  schoolId: string | null;
}

export function AddStudentModal({
  show,
  isReadOnlyView,
  canManageStudentAccounts,
  addStep,
  setAddStep,
  form,
  setForm,
  classFees,
  saving,
  error,
  onClose,
  onSubmit,
  schoolId,
}: AddStudentModalProps) {
  const t = useTranslations("students.modals");
  const commonT = useTranslations("common");
  const paginationT = useTranslations("students.pagination");

  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);

  // classFees already filtered by currentBranchId from useStudentsData
  const filteredClassFees = classFees;

  const classOptions = [
    ...filteredClassFees,
    ...(form.class_name &&
    form.class_name !== "__manual__" &&
    !filteredClassFees.some((item) => item.class_name === form.class_name)
      ? [{ id: `custom-${form.class_name}`, class_name: form.class_name }]
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
        setForm({ ...form, photo_url: data.url });
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

  if (isReadOnlyView || !canManageStudentAccounts) return null;

  const STEPS = [
    { n: 1, label: t("steps.info") },
    { n: 2, label: t("steps.contact") },
    { n: 3, label: t("steps.fees") },
  ] as const;

  return (
    <Modal open={show} onClose={onClose} size="lg">
      <ModalHeader title={t("addTitle")} onClose={onClose} />

      {/* Step Indicator */}
      <div className="px-[var(--modal-padding)] pt-2">
        <div className="flex items-center justify-between">
          {STEPS.map(({ n, label }, i) => (
            <div key={n} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                    addStep > n
                      ? "bg-[var(--success)] text-white"
                      : addStep === n
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border)]"
                  )}
                >
                  {addStep > n ? <Check className="h-4 w-4" /> : n}
                </div>
                <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">{label}</span>
              </div>
              {i < 2 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 mb-5 transition-colors",
                    addStep > n ? "bg-[var(--success)]" : "bg-[var(--border)]"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          if (addStep < 3) {
            e.preventDefault();
            setAddStep(addStep + 1);
          } else {
            onSubmit(e);
          }
        }}
      >
        <ModalBody>
          {error && (
            <div role="alert" className="mb-4 p-4 rounded-[var(--radius-md)] bg-[var(--danger)] text-white text-sm font-semibold flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Step 1: Basic Info */}
            {addStep === 1 && (
              <>
                {/* Photo Upload */}
                <div className="sm:col-span-2 flex flex-col items-center gap-2 pb-2">
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[var(--border)] bg-[var(--surface-muted)] flex items-center justify-center">
                      {(photoPreview || form.photo_url) ? (
                        <img src={photoPreview ?? form.photo_url!} alt="" className="w-full h-full object-cover" />
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
                  {!form.photo_url && !photoPreview && !photoUploading && !photoError && (
                    <span className="text-xs text-[var(--text-muted)]">{t("form.photoUploadHint")}</span>
                  )}
                  {/* QR capture button */}
                  <button
                    type="button"
                    onClick={() => setShowQR(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] hover:bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    التقاط من الهاتف
                  </button>
                  {schoolId && (
                    <QRPhotoUpload
                      open={showQR}
                      schoolId={schoolId}
                      onPhotoUploaded={(url) => {
                        setForm({ ...form, photo_url: url });
                        setShowQR(false);
                      }}
                      onCancel={() => setShowQR(false)}
                    />
                  )}
                </div>

                <FormField
                  label={t("form.fullName")}
                  htmlFor="full_name"
                  required
                  className="sm:col-span-2"
                >
                  <Input
                    id="full_name"
                    required
                    autoFocus
                    placeholder={t("form.fullNamePlaceholder")}
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  />
                </FormField>

                <FormField label={t("form.registrationNumber")} htmlFor="registration_number" helpText={t("form.optional")}>
                  <Input
                    id="registration_number"
                    placeholder=""
                    value={form.registration_number}
                    onChange={(e) => setForm({ ...form, registration_number: e.target.value })}
                  />
                </FormField>

                <FormField label={t("form.gender")} htmlFor="gender" helpText={t("form.optional")}>
                  <Select
                    id="gender"
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  >
                    <option value="">{t("form.genderSelect")}</option>
                    <option value="male">{t("form.genderMale")}</option>
                    <option value="female">{t("form.genderFemale")}</option>
                  </Select>
                </FormField>

                <FormField label={t("form.dateOfBirth")} htmlFor="date_of_birth" helpText={t("form.optional")}>
                  <DatePicker value={form.date_of_birth || undefined} onChange={(v) => setForm({ ...form, date_of_birth: v ?? "" })} />
                </FormField>

                <FormField label={t("form.className")} htmlFor="class_name" required>
                  <Select
                    id="class_name"
                    required
                    value={form.class_name}
                    onChange={(e) => {
                      const cls = e.target.value;
                      const cf = filteredClassFees.find((x) => x.class_name === cls);
                      setForm({ ...form, class_name: cls, total_fee: cf ? String(cf.total_fee ?? "") : form.total_fee });
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
                  {form.class_name === "__manual__" && (
                    <Input
                      placeholder={t("form.manualPlaceholder")}
                      className="mt-2"
                      onChange={(e) => setForm({ ...form, class_name: e.target.value })}
                    />
                  )}
                  {form.class_name && form.class_name !== "__manual__" && (() => {
                    const cf = filteredClassFees.find((x) => x.class_name === form.class_name);
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

                <FormField label={t("form.section")} htmlFor="section" helpText={t("form.optional")}>
                  <Input
                    id="section"
                    placeholder={t("form.sectionPlaceholder")}
                    value={form.section}
                    onChange={(e) => setForm({ ...form, section: e.target.value })}
                  />
                </FormField>
              </>
            )}

            {/* Step 2: Contact */}
            {addStep === 2 && (
              <>
                <FormField
                  label={t("form.address")}
                  htmlFor="address"
                  helpText={t("form.optional")}
                  className="sm:col-span-2"
                >
                  <Input
                    id="address"
                    autoFocus
                    placeholder={t("form.addressPlaceholder")}
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </FormField>

                <FormField label={t("form.phone")} htmlFor="phone" helpText={t("form.optional")} className="sm:col-span-2">
                  <Input
                    id="phone"
                    type="tel"
                    maxLength={11}
                    placeholder={t("form.phonePlaceholder")}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 11) })}
                    dir="ltr"
                  />
                </FormField>

                <FormField label={t("form.phone2")} htmlFor="phone2" helpText={t("form.optional")} className="sm:col-span-2">
                  <Input
                    id="phone2"
                    type="tel"
                    maxLength={11}
                    placeholder={t("form.phonePlaceholder")}
                    value={form.phone2}
                    onChange={(e) => setForm({ ...form, phone2: e.target.value.replace(/\D/g, "").slice(0, 11) })}
                    dir="ltr"
                  />
                </FormField>

                <FormField label={t("form.parentName")} htmlFor="parent_name" helpText={t("form.optional")} className="sm:col-span-2">
                  <Input
                    id="parent_name"
                    value={form.parent_name}
                    onChange={(e) => setForm({ ...form, parent_name: e.target.value })}
                  />
                </FormField>

                <FormField label="المدرسة السابقة" htmlFor="previous_school" helpText={t("form.optional")} className="sm:col-span-2">
                  <Input
                    id="previous_school"
                    placeholder="اسم المدرسة السابقة..."
                    value={form.previous_school}
                    onChange={(e) => setForm({ ...form, previous_school: e.target.value })}
                  />
                </FormField>
              </>
            )}

            {/* Step 3: Fees */}
            {addStep === 3 && (
              <>
                <FormField
                  label={t("form.totalFee", { currency: commonT("currency") })}
                  htmlFor="total_fee"
                  required
                  helpText={form.class_name && filteredClassFees.find((x) => x.class_name === form.class_name) ? t("form.autoFromClass") : undefined}
                >
                  <Input
                    id="total_fee"
                    type="number"
                    required
                    autoFocus
                    placeholder="500000"
                    value={form.total_fee}
                    onChange={(e) => setForm({ ...form, total_fee: e.target.value })}
                  />
                </FormField>

                <FormField
                  label={t("form.discount", { currency: commonT("currency") })}
                  htmlFor="discount_value"
                  helpText={t("form.optional")}
                  className="sm:col-span-2"
                >
                  <Input
                    id="discount_value"
                    type="number"
                    placeholder="0"
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                  />
                  {(() => {
                    const totalFee = parseFloat(form.total_fee) || 0;
                    const discount = parseFloat(form.discount_value) || 0;
                    const paidFee = parseFloat(form.paid_fee) || 0;
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
              </>
            )}
          </div>
        </ModalBody>

        <ModalFooter>
          {addStep > 1 && (
            <Button type="button" variant="outline" onClick={() => setAddStep(addStep - 1)}>
              {paginationT("previous")}
            </Button>
          )}
          {addStep < 3 ? (
            <Button type="submit">
              {paginationT("next")}
            </Button>
          ) : (
            <Button type="submit" loading={saving}>
              {saving ? t("form.saving") : t("form.saveStudent")}
            </Button>
          )}
          {addStep === 1 && (
            <Button type="button" variant="ghost" onClick={onClose}>
              {commonT("cancel")}
            </Button>
          )}
        </ModalFooter>
      </form>
    </Modal>
  );
}
