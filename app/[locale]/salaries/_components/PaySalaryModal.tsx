"use client";

import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { formatNumber } from "@/lib/formatting";
import type { Teacher, SalaryFormData } from "../_types";

interface PaySalaryModalProps {
  show: boolean;
  teacher: Teacher | null;
  form: SalaryFormData;
  saving: boolean;
  lectureSalaryCalc: { count: number; total: number };
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  onUpdateForm: (form: Partial<SalaryFormData>) => void;
}

export function PaySalaryModal({
  show,
  teacher,
  form,
  saving,
  lectureSalaryCalc,
  onSubmit,
  onClose,
  onUpdateForm,
}: PaySalaryModalProps) {
  if (!show || !teacher) return null;

  const grossSalary = parseInt(form.gross_salary) || 0;
  const deductions = parseInt(form.deductions) || 0;
  const net = grossSalary - deductions;

  return (
    <Modal open={show} onClose={onClose} size="md">
      <ModalHeader
        title={`دفع راتب — ${teacher.full_name}`}
        onClose={onClose}
      />
      <form onSubmit={onSubmit}>
        <ModalBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="الشهر" required>
              <Input
                type="month"
                required
                value={form.month}
                onChange={(e) => onUpdateForm({ month: e.target.value })}
              />
            </FormField>

            <FormField label="الراتب الإجمالي" required>
              <Input
                type="number"
                required
                value={form.gross_salary}
                onChange={(e) => onUpdateForm({ gross_salary: e.target.value })}
                readOnly={teacher.salary_type !== "fixed"}
              />
            </FormField>
          </div>

          {(teacher.salary_type === "hourly" || teacher.salary_type === "mixed") && (
            <div className="p-3 rounded-lg bg-[var(--surface-soft)] text-sm text-[var(--text-secondary)]">
              {teacher.salary_type === "hourly" && (
                <>
                  محسوب آلياً: {lectureSalaryCalc.count} ×{" "}
                  {formatNumber(Number(teacher.lecture_price) || 0)} ={" "}
                  {formatNumber(lectureSalaryCalc.total)} د.ع
                </>
              )}
              {teacher.salary_type === "mixed" && (
                <>
                  أساسي {formatNumber(Number(teacher.base_salary) || 0)} + محاضرات{" "}
                  {formatNumber(lectureSalaryCalc.total)} ={" "}
                  {formatNumber((Number(teacher.base_salary) || 0) + lectureSalaryCalc.total)} د.ع
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="الخصومات">
              <Input
                type="number"
                value={form.deductions}
                onChange={(e) => onUpdateForm({ deductions: e.target.value })}
              />
            </FormField>

            <FormField label="ملاحظات">
              <Input
                value={form.notes}
                onChange={(e) => onUpdateForm({ notes: e.target.value })}
              />
            </FormField>
          </div>

          {/* Salary Preview */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">الإجمالي:</span>
              <span className="font-semibold">د.ع {formatNumber(grossSalary)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">الخصومات:</span>
              <span className="font-semibold text-[var(--danger)]">- د.ع {formatNumber(deductions)}</span>
            </div>
            <div className="border-t border-[var(--border)] pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)] font-medium">الصافي:</span>
                <span className={`text-lg font-bold ${net < 0 ? "text-[var(--danger)]" : "text-[var(--primary)]"}`}>
                  د.ع {formatNumber(net)}
                </span>
              </div>
              {net < 0 && (
                <p className="mt-1 text-xs font-semibold text-[var(--danger)]">
                  الخصومات تتجاوز الإجمالي!
                </p>
              )}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="submit" loading={saving}>
            {saving ? "جارٍ الدفع..." : "تأكيد دفع الراتب"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
