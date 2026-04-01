"use client";

import { AppIcon } from "@/components/AppIcon";
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
  if (isReadOnlyView || !canManageStudentAccounts || !show) return null;

  return (
    <div
      className="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="modal">
        <div className="mh">
          <div className="mt">إضافة طالب جديد</div>
          <button className="mc" onClick={onClose}>
            <AppIcon token="✕" size={13} />
          </button>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 0, marginBottom: "1.2rem" }}>
          {([{ n: 1, label: "المعلومات" }, { n: 2, label: "التواصل" }, { n: 3, label: "الرسوم" }] as const).map(
            ({ n, label }, i) => (
              <div key={n} style={{ display: "flex", alignItems: "center", flex: n < 3 ? 1 : undefined }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: ".25rem" }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: ".76rem",
                      transition: "all .2s",
                      background:
                        addStep > n
                          ? "#22C55E"
                          : addStep === n
                          ? "linear-gradient(135deg,var(--p3),var(--p2))"
                          : "rgba(108,74,182,0.1)",
                      color: addStep >= n ? "white" : "var(--p2)",
                      border: addStep === n ? "none" : "1px solid rgba(108,74,182,0.2)",
                      flexShrink: 0,
                    }}
                  >
                    {addStep > n ? "✓" : n}
                  </div>
                  <span style={{ fontSize: ".62rem", color: "var(--gray)", whiteSpace: "nowrap" }}>{label}</span>
                </div>
                {i < 2 && (
                  <div
                    style={{
                      flex: 1,
                      height: 2,
                      background: addStep > n ? "#22C55E" : "rgba(108,74,182,0.15)",
                      margin: "0 .35rem",
                      marginBottom: "1.1rem",
                    }}
                  />
                )}
              </div>
            ),
          )}
        </div>

        {error && <div className="err">{error}</div>}
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
          <div className="fg">
            {/* Step 1: Basic Info */}
            {addStep === 1 && (
              <>
                <div className="ff full">
                  <label className="fl">اسم الطالب *</label>
                  <input
                    className="fi"
                    required
                    autoFocus
                    placeholder="أحمد محمد علي"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  />
                </div>
                <div className="ff">
                  <label className="fl">الصف الدراسي *</label>
                  <select
                    className="fs"
                    required
                    value={form.class_name}
                    onChange={(e) => {
                      const cls = e.target.value;
                      const cf = classFees.find((x) => x.class_name === cls);
                      setForm({ ...form, class_name: cls, total_fee: cf ? String(cf.total_fee ?? "") : form.total_fee });
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
                  {form.class_name === "__manual__" && (
                    <input
                      className="fi"
                      style={{ marginTop: ".4rem" }}
                      placeholder="اكتب اسم الصف"
                      onChange={(e) => setForm({ ...form, class_name: e.target.value })}
                    />
                  )}
                  {form.class_name && form.class_name !== "__manual__" && (() => {
                    const cf = classFees.find((x) => x.class_name === form.class_name);
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
                    value={form.section}
                    onChange={(e) => setForm({ ...form, section: e.target.value })}
                  />
                </div>
              </>
            )}

            {/* Step 2: Contact */}
            {addStep === 2 && (
              <>
                <div className="ff full">
                  <label className="fl">العنوان *</label>
                  <input
                    className="fi"
                    required
                    autoFocus
                    placeholder="بغداد - الكرخ"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
                <div className="ff full">
                  <label className="fl">
                    الهاتف <span className="opt">(اختياري)</span>
                  </label>
                  <input
                    className="fi"
                    placeholder="07XXXXXXXXX"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </>
            )}

            {/* Step 3: Fees */}
            {addStep === 3 && (
              <>
                <div className="ff">
                  <label className="fl">
                    إجمالي الرسوم (د.ع) *
                    {form.class_name && classFees.find((x) => x.class_name === form.class_name) && (
                      <span className="opt"> — تلقائي من الصف</span>
                    )}
                  </label>
                  <input
                    className="fi"
                    type="number"
                    required
                    autoFocus
                    placeholder="500000"
                    value={form.total_fee}
                    onChange={(e) => setForm({ ...form, total_fee: e.target.value })}
                  />
                </div>
                <div className="ff">
                  <label className="fl">
                    المدفوع مسبقاً <span className="opt">(اختياري)</span>
                  </label>
                  <input
                    className="fi"
                    type="number"
                    placeholder="0"
                    value={form.paid_fee}
                    onChange={(e) => setForm({ ...form, paid_fee: e.target.value })}
                  />
                </div>
                <div className="ff full">
                  <label className="fl">
                    التخفيض (د.ع) <span className="opt">(اختياري)</span>
                  </label>
                  <input
                    className="fi"
                    type="number"
                    placeholder="0"
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                  />
                  {form.discount_value && parseInt(form.discount_value) > 0 && form.total_fee && parseInt(form.total_fee) > 0 && (
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
                        {(parseInt(form.total_fee) - parseInt(form.discount_value)).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="fa">
            {addStep > 1 && (
              <button type="button" className="bc" onClick={() => setAddStep(addStep - 1)}>
                → السابق
              </button>
            )}
            {addStep < 3 ? (
              <button type="submit" className="bs">
                ← التالي
              </button>
            ) : (
              <button type="submit" className="bs" disabled={saving}>
                {saving ? "جارٍ الحفظ..." : "✓ حفظ الطالب"}
              </button>
            )}
            {addStep === 1 && (
              <button type="button" className="bc" onClick={onClose}>
                إلغاء
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
