"use client";

import { AppIcon } from "@/components/AppIcon";
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
  if (isReadOnlyView || !show || !selectedStudent) return null;

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="mh">
          <div className="mt">تعديل بيانات الطالب</div>
          <button className="mc" onClick={onClose}>
            <AppIcon token="✕" size={13} />
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="fg">
            <div className="ff full">
              <label className="fl">اسم الطالب *</label>
              <input
                className="fi"
                required
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              />
            </div>
            <div className="ff">
              <label className="fl">الصف الدراسي *</label>
              <select
                className="fs"
                required
                value={editForm.class_name}
                onChange={(e) => {
                  const cls = e.target.value;
                  const cf = classFees.find((x) => x.class_name === cls);
                  setEditForm({ ...editForm, class_name: cls, total_fee: cf ? String(cf.total_fee ?? "") : editForm.total_fee });
                }}
              >
                <option value="">— اختر الصف —</option>
                {classFees.map((cf) => (
                  <option key={cf.id} value={cf.class_name}>
                    {cf.class_name}
                  </option>
                ))}
                <option value="__manual__">أدخل يدوياً...</option>
              </select>
              {editForm.class_name === "__manual__" && (
                <input
                  className="fi"
                  style={{ marginTop: ".4rem" }}
                  placeholder="اكتب اسم الصف"
                  onChange={(e) => setEditForm({ ...editForm, class_name: e.target.value })}
                />
              )}
              {editForm.class_name && editForm.class_name !== "__manual__" && (() => {
                const cf = classFees.find((x) => x.class_name === editForm.class_name);
                if (!cf) return null;
                return (
                  <div
                    style={{
                      background: "linear-gradient(135deg,#EDE8FA,#E0D8F8)",
                      borderRadius: 8,
                      padding: ".45rem .7rem",
                      marginTop: ".4rem",
                      fontSize: ".72rem",
                      color: "var(--p2)",
                      fontWeight: 700,
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: ".3rem" }}>
                      <AppIcon token="💰" size={12} /> قسط واحد: د.ع {cf.installment_amount?.toLocaleString()} ×{" "}
                      {cf.installments} أقساط
                    </span>
                  </div>
                );
              })()}
            </div>
            <div className="ff">
              <label className="fl">
                الشعبة <span className="opt">(اختياري)</span>
              </label>
              <input
                className="fi"
                placeholder="مثال: أ، ب، ج"
                value={editForm.section}
                onChange={(e) => setEditForm({ ...editForm, section: e.target.value })}
              />
            </div>
            <div className="ff">
              <label className="fl">العنوان</label>
              <input
                className="fi"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              />
            </div>
            <div className="ff">
              <label className="fl">الهاتف</label>
              <input
                className="fi"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div className="ff">
              <label className="fl">
                إجمالي الرسوم (د.ع)
                {editForm.class_name && classFees.find((x) => x.class_name === editForm.class_name) && (
                  <span className="opt"> — تلقائي من الصف</span>
                )}
              </label>
              <input
                className="fi"
                type="number"
                value={editForm.total_fee}
                onChange={(e) => setEditForm({ ...editForm, total_fee: e.target.value })}
              />
            </div>
            <div className="ff">
              <label className="fl">المدفوع (د.ع)</label>
              <input
                className="fi"
                type="number"
                value={editForm.paid_fee}
                onChange={(e) => setEditForm({ ...editForm, paid_fee: e.target.value })}
              />
            </div>
            <div className="ff">
              <label className="fl">
                التخفيض (د.ع) <span className="opt">(اختياري)</span>
              </label>
              <input
                className="fi"
                type="number"
                placeholder="0"
                value={editForm.discount_value}
                onChange={(e) => setEditForm({ ...editForm, discount_value: e.target.value })}
              />
              {editForm.discount_value && parseInt(editForm.discount_value) > 0 && editForm.total_fee && parseInt(editForm.total_fee) > 0 && (
                <div
                  style={{
                    background: "#FEF3C7",
                    borderRadius: 7,
                    padding: ".35rem .6rem",
                    marginTop: ".35rem",
                    fontSize: ".7rem",
                    color: "#92400E",
                    fontWeight: 700,
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: ".3rem" }}>
                    <AppIcon token="✂️" size={12} /> بعد الخصم: د.ع{" "}
                    {(parseInt(editForm.total_fee) - parseInt(editForm.discount_value)).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            <div className="ff">
              <label className="fl">الحالة</label>
              <select
                className="fs"
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value as StudentFormData["status"] })}
              >
                <option value="active">نشط</option>
                <option value="transferred">منقول</option>
                <option value="graduated">متخرج</option>
                <option value="withdrawn">منسحب</option>
                <option value="archived">مؤرشف</option>
                <option value="suspended">موقوف</option>
              </select>
            </div>
          </div>
          <div className="fa">
            <button type="submit" className="bs" disabled={saving}>
              {saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
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
