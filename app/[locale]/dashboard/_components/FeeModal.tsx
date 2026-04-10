"use client";

import { AppIcon } from "@/components/AppIcon";
import { formatNumber } from "@/lib/formatting";
import { ClassFee, FeeFormData } from "./types";

interface FeeModalProps {
  show: boolean;
  editingFee: ClassFee | null;
  feeForm: FeeFormData;
  feeLoading: boolean;
  feeError: string;
  feeSuccess: string;
  studentCountByClass: Record<string, number>;
  onClose: () => void;
  onSave: () => void;
  onFormChange: React.Dispatch<React.SetStateAction<FeeFormData>>;
}

export function FeeModal({
  show,
  editingFee,
  feeForm,
  feeLoading,
  feeError,
  feeSuccess,
  studentCountByClass,
  onClose,
  onSave,
  onFormChange,
}: FeeModalProps) {
  if (!show) return null;

  const linkedCount = feeForm.class_name ? (studentCountByClass[feeForm.class_name.trim()] ?? 0) : 0;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box w-[min(96vw,760px)]">
        <div className="p-6 sm:p-7 space-y-6">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
            <div className="space-y-1">
              <div className="modal-title">
                <AppIcon token={editingFee ? "✏️" : "💰"} size={18} />
                {editingFee ? `تعديل قسط: ${editingFee.class_name}` : "إضافة قسط دراسي"}
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                أدخل قيمة الرسوم وعدد الأقساط، وسيتم عرض حصة القسط الواحد مباشرة قبل الحفظ.
              </p>
            </div>
          </div>

          <div className="rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-[var(--card-shadow)]">
            <div className="form-grid">
              <div className="form-group full">
                <label className="form-label">اسم الصف الدراسي <span>*</span></label>
                <input
                  className="form-input"
                  placeholder="مثال: الصف الأول، الصف الثاني..."
                  value={feeForm.class_name}
                  onChange={e => onFormChange(f => ({ ...f, class_name: e.target.value }))}
                  disabled={!!editingFee}
                />
                {editingFee && <span style={{ fontSize: ".67rem", color: "var(--text-muted)" }}>لا يمكن تغيير اسم الصف عند التعديل</span>}
              </div>

              <div className="form-group">
                <label className="form-label">المبلغ الكلي (د.ع) <span>*</span></label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="مثال: 1500000"
                  value={feeForm.total_fee}
                  onChange={e => onFormChange(f => ({ ...f, total_fee: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">عدد الأقساط <span>*</span></label>
                <select
                  className="form-select"
                  value={feeForm.installments}
                  onChange={e => onFormChange(f => ({ ...f, installments: e.target.value }))}
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                    <option key={n} value={n}>{n} {n === 1 ? "قسط واحد" : "أقساط"}</option>
                  ))}
                </select>
              </div>

              <div className="form-group full">
                <label className="form-label">ملاحظات (اختياري)</label>
                <input
                  className="form-input"
                  placeholder="مثال: يشمل الكتب والأنشطة..."
                  value={feeForm.notes}
                  onChange={e => onFormChange(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {feeForm.total_fee && !isNaN(Number(feeForm.total_fee)) && Number(feeForm.total_fee) > 0 && (
            <div className="installment-preview">
              <div>
                <div className="ip-label">قيمة القسط الواحد</div>
                <div className="ip-sub">المبلغ الكلي ÷ {feeForm.installments} أقساط</div>
              </div>
              <div style={{ textAlign: "left" }}>
                <div className="ip-val">د.ع {formatNumber(Math.round(Number(feeForm.total_fee) / parseInt(feeForm.installments)))}</div>
                <div className="ip-sub">لكل قسط</div>
              </div>
            </div>
          )}

          {feeForm.class_name && linkedCount > 0 && (
            <div className="rounded-[18px] border border-[color-mix(in_srgb,var(--success)_18%,transparent)] bg-[color-mix(in_srgb,var(--success)_10%,transparent)] px-4 py-3 text-sm font-semibold text-[var(--success)]">
              <strong className="inline-flex items-center gap-2">
                <AppIcon token="🔗" size={13} />
                مرتبط بـ {linkedCount} طالب
              </strong>{" "}
              في هذا الصف
            </div>
          )}

          {feeError && (
            <div className="msg-error flex items-center gap-2">
              <AppIcon token="⚠️" size={14} /> {feeError}
            </div>
          )}
          {feeSuccess && <div className="msg-success">{feeSuccess}</div>}

          <div className="modal-actions">
            <button className="btn-cancel" onClick={onClose}>إلغاء</button>
            <button className="btn-save" onClick={onSave} disabled={feeLoading}>
              {feeLoading ? "جارٍ الحفظ..." : editingFee ? "حفظ التعديلات" : "إضافة القسط"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
