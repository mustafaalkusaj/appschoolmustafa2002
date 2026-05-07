"use client";

import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/brand/brand-utils";
import { formatNumber } from "@/lib/formatting";
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
}: AddStudentModalProps) {
  const t = useTranslations("students.modals");
  const commonT = useTranslations("common");
  const paginationT = useTranslations("students.pagination");
  const classOptions = [
    ...classFees,
    ...(form.class_name &&
    form.class_name !== "__manual__" &&
    !classFees.some((item) => item.class_name === form.class_name)
      ? [{ id: `custom-${form.class_name}`, class_name: form.class_name }]
      : []),
  ];

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

                <FormField label={t("form.className")} htmlFor="class_name" required>
                  <Select
                    id="class_name"
                    required
                    value={form.class_name}
                    onChange={(e) => {
                      const cls = e.target.value;
                      const cf = classFees.find((x) => x.class_name === cls);
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
                    const cf = classFees.find((x) => x.class_name === form.class_name);
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
                    placeholder={t("form.phonePlaceholder")}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
                  helpText={form.class_name && classFees.find((x) => x.class_name === form.class_name) ? t("form.autoFromClass") : undefined}
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

                <FormField label={t("form.paidFee")} htmlFor="paid_fee" helpText={t("form.optional")}>
                  <Input
                    id="paid_fee"
                    type="number"
                    placeholder="0"
                    value={form.paid_fee}
                    onChange={(e) => setForm({ ...form, paid_fee: e.target.value })}
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
