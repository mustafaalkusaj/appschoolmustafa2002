"use client";

import { AppIcon } from "@/components/AppIcon";
import { formatNumber } from "@/lib/formatting";
import type { ClassItem, ClassForm } from "../../dashboard/_components/types";

interface ClassFormModalProps {
  show: boolean;
  editingClass: ClassItem | null;
  classForm: ClassForm;
  setClassForm: (form: ClassForm) => void;
  saving: boolean;
  error: string;
  onSave: () => Promise<void>;
  onClose: () => void;
  locale: "ar" | "en";
}

export function ClassFormModal({
  show,
  editingClass,
  classForm,
  setClassForm,
  saving,
  error,
  onSave,
  onClose,
  locale,
}: ClassFormModalProps) {
  if (!show) return null;
  const isEn = locale === "en";

  const totalFee = Number(classForm.total_fee) || 0;
  const installments = parseInt(classForm.installments || "4", 10) || 4;
  const perInstallment = totalFee > 0 ? Math.round(totalFee / installments) : 0;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box w-[min(96vw,760px)]">
        <div className="p-6 sm:p-7 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
            <div className="space-y-1">
              <div className="modal-title">
                <AppIcon token={editingClass ? "✏️" : "📚"} size={18} />
                {editingClass
                  ? (isEn ? `Edit Class: ${editingClass.name}` : `تعديل صف: ${editingClass.name}`)
                  : (isEn ? "Add New Class" : "إضافة صف جديد")}
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                {editingClass
                  ? (isEn ? "Edit class name and sections." : "عدّل اسم الصف والشعب.")
                  : (isEn ? "Enter the class name and tuition fee. The installment amount will be calculated automatically." : "أدخل اسم الصف ومبلغ القسط، وسيتم حساب قيمة القسط الواحد تلقائياً.")}
              </p>
            </div>
          </div>

          {/* Form Card */}
          <div className="rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-[var(--card-shadow)]">
            <div className="form-grid">
              {/* Class Name */}
              <div className="form-group full">
                <label className="form-label">
                  {isEn ? "Class Name" : "اسم الصف الدراسي"} <span>*</span>
                </label>
                <input
                  className="form-input"
                  autoFocus
                  placeholder={isEn ? "e.g. Grade 5" : "مثال: الصف الخامس"}
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                />
              </div>

              {/* Sections — only when editing */}
              {editingClass && (
                <div className="form-group full">
                  <label className="form-label">
                    {isEn ? "Sections" : "الشعب"}
                  </label>
                  <textarea
                    className="form-input"
                    rows={3}
                    style={{ minHeight: 80, resize: "none" }}
                    value={classForm.sections.join("\n")}
                    onChange={(e) => setClassForm({ ...classForm, sections: e.target.value.split("\n") })}
                    placeholder={isEn ? "One section per line: A, B, C" : "كل شعبة بسطر: أ، ب، ج"}
                  />
                  <span style={{ fontSize: ".67rem", color: "var(--text-muted)" }}>
                    {isEn ? "Optional: one section per line" : "اختياري: كل شعبة في سطر جديد"}
                  </span>
                </div>
              )}

              {/* Fee fields — only when adding */}
              {!editingClass && (
                <>
                  <div className="form-group">
                    <label className="form-label">
                      {isEn ? "Total Fee (IQD)" : "المبلغ الكلي (د.ع)"}
                    </label>
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      placeholder={isEn ? "e.g. 500000" : "مثال: 500000"}
                      value={classForm.total_fee ?? ""}
                      onChange={(e) => setClassForm({ ...classForm, total_fee: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      {isEn ? "Installments" : "عدد الأقساط"}
                    </label>
                    <select
                      className="form-select"
                      value={classForm.installments || "4"}
                      onChange={(e) => setClassForm({ ...classForm, installments: e.target.value })}
                    >
                      {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                        <option key={n} value={n}>{n} {isEn ? (n === 1 ? "installment" : "installments") : (n === 1 ? "قسط واحد" : "أقساط")}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Installment Preview */}
          {!editingClass && totalFee > 0 && (
            <div className="installment-preview">
              <div>
                <div className="ip-label">{isEn ? "Per Installment" : "قيمة القسط الواحد"}</div>
                <div className="ip-sub">{isEn ? `Total ÷ ${installments} installments` : `المبلغ الكلي ÷ ${installments} أقساط`}</div>
              </div>
              <div style={{ textAlign: "left" }}>
                <div className="ip-val">{isEn ? "IQD" : "د.ع"} {formatNumber(perInstallment)}</div>
                <div className="ip-sub">{isEn ? "per installment" : "لكل قسط"}</div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="msg-error flex items-center gap-2">
              <AppIcon token="⚠️" size={14} /> {error}
            </div>
          )}

          {/* Actions */}
          <div className="modal-actions">
            <button className="btn-cancel" onClick={onClose}>
              {isEn ? "Cancel" : "إلغاء"}
            </button>
            <button
              className="btn-save"
              onClick={() => onSave().catch(err => console.error("Class save failed:", err))}
              disabled={saving}
            >
              {saving
                ? (isEn ? "Saving..." : "جارٍ الحفظ...")
                : editingClass
                  ? (isEn ? "Save Changes" : "حفظ التعديلات")
                  : (isEn ? "Add Class" : "إضافة صف")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
