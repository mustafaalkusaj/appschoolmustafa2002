"use client";

import { AppIcon } from "@/components/AppIcon";
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
    <div className="overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="mh">
          <div className="mt" style={{ display: "flex", alignItems: "center", gap: ".35rem" }}>
            <AppIcon token="💰" size={16} />
            دفع راتب — {teacher.full_name}
          </div>
          <button className="mc" onClick={onClose}>
            <AppIcon token="✕" size={14} />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="fg">
            <div className="ff">
              <label className="fl">الشهر *</label>
              <input
                className="fis"
                type="month"
                required
                value={form.month}
                onChange={(e) => onUpdateForm({ month: e.target.value })}
              />
            </div>

            <div className="ff">
              <label className="fl">الراتب الإجمالي *</label>
              <input
                className="fis"
                type="number"
                required
                value={form.gross_salary}
                onChange={(e) => onUpdateForm({ gross_salary: e.target.value })}
                readOnly={teacher.salary_type !== "fixed"}
              />
            </div>

            <div
              style={{
                fontSize: ".74rem",
                color: "var(--gray)",
                marginTop: "-0.5rem",
                marginBottom: "0.5rem",
                gridColumn: "1 / -1",
              }}
            >
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

            <div className="ff">
              <label className="fl">الخصومات</label>
              <input
                className="fis"
                type="number"
                value={form.deductions}
                onChange={(e) => onUpdateForm({ deductions: e.target.value })}
              />
            </div>

            <div className="ff">
              <label className="fl">ملاحظات</label>
              <input
                className="fis"
                value={form.notes}
                onChange={(e) => onUpdateForm({ notes: e.target.value })}
              />
            </div>
          </div>

          <div className="sal-preview">
            <div className="sp-row">
              <span className="sp-label">الإجمالي:</span>
              <span className="sp-val">د.ع {formatNumber(grossSalary)}</span>
            </div>
            <div className="sp-row">
              <span className="sp-label">الخصومات:</span>
              <span className="sp-val" style={{ color: "#EF4444" }}>
                - د.ع {formatNumber(deductions)}
              </span>
            </div>
            <div
              style={{
                borderTop: "1px dashed rgba(79,140,255,0.2)",
                marginTop: ".4rem",
                paddingTop: ".4rem",
              }}
            >
              <div className="sp-row">
                <span className="sp-label">الصافي:</span>
                <span className="sp-net">د.ع {formatNumber(net)}</span>
              </div>
            </div>
          </div>

          <div className="fa">
            <button type="submit" className="bs" disabled={saving}>
              {saving ? "جارٍ الدفع..." : "تأكيد دفع الراتب"}
            </button>
            <button type="button" className="bc" onClick={onClose}>
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
