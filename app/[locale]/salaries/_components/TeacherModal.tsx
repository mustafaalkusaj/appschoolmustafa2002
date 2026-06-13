"use client";

import { AppIcon } from "@/components/AppIcon";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/brand/brand-utils";
import { SALARY_TYPES, CLASS_GRADES, SECTIONS_LIST, type SalaryType, type Subject, type JobTitle, type TeacherFormData } from "../_types";

interface TeacherModalProps {
  show: boolean;
  editId: string | null;
  form: TeacherFormData;
  saving: boolean;
  error: string;
  canManage: boolean;
  subjectsList: Subject[];
  jobTitlesList: JobTitle[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onUpdateForm: (form: Partial<TeacherFormData>) => void;
  onAddClassRow: () => void;
  onRemoveClassRow: (index: number) => void;
  onUpdateClassRow: (index: number, field: "grade" | "section", value: string) => void;
}

export function TeacherModal({
  show,
  editId,
  form,
  saving,
  error,
  canManage,
  subjectsList,
  jobTitlesList,
  onClose,
  onSubmit,
  onUpdateForm,
  onAddClassRow,
  onRemoveClassRow,
  onUpdateClassRow,
}: TeacherModalProps) {
  if (!show) return null;

  return (
    <Modal open={show} onClose={onClose} size="lg">
      <ModalHeader
        title={editId ? "تعديل بيانات الأستاذ" : "إضافة أستاذ"}
        onClose={onClose}
      />
      <form onSubmit={onSubmit}>
        <ModalBody className="space-y-4">
          {!canManage && (
            <div className="p-3 rounded-lg bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] text-[var(--warning)] text-sm font-medium">
              ليس لديك صلاحية تعديل بيانات الأساتذة.
            </div>
          )}
          {error && (
            <div className="p-3 rounded-lg bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)] text-sm font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="الاسم الثلاثي" required className="col-span-2">
              <Input
                required
                value={form.full_name}
                onChange={(e) => onUpdateForm({ full_name: e.target.value })}
                disabled={!canManage}
              />
            </FormField>

            <FormField label="المسمى الوظيفي">
              <Select
                value={form.job_title}
                onChange={(e) => onUpdateForm({ job_title: e.target.value })}
                disabled={!canManage}
              >
                <option value="">اختر...</option>
                {jobTitlesList.map((j) => (
                  <option key={j.id} value={j.name}>{j.name}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="المادة">
              <Select
                value={form.subject}
                onChange={(e) => onUpdateForm({ subject: e.target.value })}
                disabled={!canManage}
              >
                <option value="">اختر...</option>
                {subjectsList.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="الهاتف">
              <Input
                value={form.phone}
                onChange={(e) => onUpdateForm({ phone: e.target.value })}
                disabled={!canManage}
              />
            </FormField>

            <FormField label="العنوان">
              <Input
                value={form.address}
                onChange={(e) => onUpdateForm({ address: e.target.value })}
                disabled={!canManage}
              />
            </FormField>

            <FormField label="نظام الراتب">
              <Select
                value={form.salary_type}
                onChange={(e) => onUpdateForm({ salary_type: e.target.value as SalaryType })}
                disabled={!canManage}
              >
                {SALARY_TYPES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="الراتب الأساسي">
              <Input
                type="number"
                value={form.base_salary}
                onChange={(e) => onUpdateForm({ base_salary: e.target.value })}
                disabled={!canManage}
              />
            </FormField>

            <FormField label="سعر المحاضرة">
              <Input
                type="number"
                value={form.lecture_price}
                onChange={(e) => onUpdateForm({ lecture_price: e.target.value })}
                disabled={!canManage}
              />
            </FormField>

            <FormField label="حصص أسبوعية">
              <Input
                type="number"
                value={form.weekly_hours}
                onChange={(e) => onUpdateForm({ weekly_hours: e.target.value })}
                disabled={!canManage}
              />
            </FormField>

            <FormField label="الحالة">
              <Select
                value={form.status}
                onChange={(e) => onUpdateForm({ status: e.target.value as TeacherFormData["status"] })}
                disabled={!canManage}
              >
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </Select>
            </FormField>

            <FormField label="الصفوف والشعب" className="col-span-2">
              <div className="space-y-2">
                {form.classes_taught.map((cls, i) => (
                  <div key={i} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Select
                        value={cls.grade}
                        onChange={(e) => onUpdateClassRow(i, "grade", e.target.value)}
                        disabled={!canManage}
                      >
                        <option value="">الصف...</option>
                        {CLASS_GRADES.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Select
                        value={cls.section}
                        onChange={(e) => onUpdateClassRow(i, "section", e.target.value)}
                        disabled={!canManage}
                      >
                        <option value="">الشعبة...</option>
                        {SECTIONS_LIST.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </Select>
                    </div>
                    {form.classes_taught.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onRemoveClassRow(i)}
                        disabled={!canManage}
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                          "bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]",
                          "hover:bg-[color-mix(in_srgb,var(--danger)_20%,transparent)] transition-colors",
                          "disabled:opacity-50"
                        )}
                      >
                        <AppIcon token="✕" size={12} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={onAddClassRow}
                  disabled={!canManage}
                  className={cn(
                    "w-full py-2 rounded-lg border-2 border-dashed border-[var(--border)]",
                    "text-sm font-semibold text-[var(--text-secondary)]",
                    "hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors",
                    "disabled:opacity-50"
                  )}
                >
                  + صف
                </button>
              </div>
            </FormField>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="submit" loading={saving} disabled={!canManage}>
            {saving ? "جارٍ الحفظ..." : "حفظ"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
