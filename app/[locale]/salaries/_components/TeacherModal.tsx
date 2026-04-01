"use client";

import { AppIcon } from "@/components/AppIcon";
import { SALARY_TYPES, CLASS_GRADES, SECTIONS_LIST, type Subject, type JobTitle, type TeacherFormData } from "../_types";

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
    <div className="overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="modal" style={{ maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}>
        <div className="mh">
          <div className="mt" style={{ display: "flex", alignItems: "center", gap: ".35rem" }}>
            <AppIcon token={editId ? "✏️" : "👨‍🏫"} size={16} />
            {editId ? "تعديل بيانات الأستاذ" : "إضافة أستاذ"}
          </div>
          <button type="button" className="mc" onClick={onClose}>
            <AppIcon token="✕" size={14} />
          </button>
        </div>

        {!canManage && (
          <div style={{ padding: ".5rem 0", fontSize: ".8rem", color: "#B45309" }}>
            ليس لديك صلاحية تعديل بيانات الأساتذة.
          </div>
        )}

        {error && (
          <div style={{ padding: ".5rem 0", fontSize: ".8rem", color: "#B91C1C" }}>
            {error}
          </div>
        )}

        <form onSubmit={onSubmit}>
          <div className="fg">
            <div className="ff full">
              <label className="fl">الاسم الثلاثي *</label>
              <input
                className="fis"
                required
                value={form.full_name}
                onChange={(e) => onUpdateForm({ full_name: e.target.value })}
                disabled={!canManage}
              />
            </div>

            <div className="ff">
              <label className="fl">المسمى الوظيفي</label>
              <select
                className="fis"
                value={form.job_title}
                onChange={(e) => onUpdateForm({ job_title: e.target.value })}
                disabled={!canManage}
              >
                <option value="">اختر...</option>
                {jobTitlesList.map((j) => (
                  <option key={j.id} value={j.name}>{j.name}</option>
                ))}
              </select>
            </div>

            <div className="ff">
              <label className="fl">المادة</label>
              <select
                className="fis"
                value={form.subject}
                onChange={(e) => onUpdateForm({ subject: e.target.value })}
                disabled={!canManage}
              >
                <option value="">اختر...</option>
                {subjectsList.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="ff">
              <label className="fl">الهاتف</label>
              <input
                className="fis"
                value={form.phone}
                onChange={(e) => onUpdateForm({ phone: e.target.value })}
                disabled={!canManage}
              />
            </div>

            <div className="ff full">
              <label className="fl">العنوان</label>
              <input
                className="fis"
                value={form.address}
                onChange={(e) => onUpdateForm({ address: e.target.value })}
                disabled={!canManage}
              />
            </div>

            <div className="ff">
              <label className="fl">نظام الراتب</label>
              <select
                className="fis"
                value={form.salary_type}
                onChange={(e) => onUpdateForm({ salary_type: e.target.value as any })}
                disabled={!canManage}
              >
                {SALARY_TYPES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="ff">
              <label className="fl">الراتب الأساسي</label>
              <input
                className="fis"
                type="number"
                value={form.base_salary}
                onChange={(e) => onUpdateForm({ base_salary: e.target.value })}
                disabled={!canManage}
              />
            </div>

            <div className="ff">
              <label className="fl">سعر المحاضرة</label>
              <input
                className="fis"
                type="number"
                value={form.lecture_price}
                onChange={(e) => onUpdateForm({ lecture_price: e.target.value })}
                disabled={!canManage}
              />
            </div>

            <div className="ff">
              <label className="fl">حصص أسبوعية</label>
              <input
                className="fis"
                type="number"
                value={form.weekly_hours}
                onChange={(e) => onUpdateForm({ weekly_hours: e.target.value })}
                disabled={!canManage}
              />
            </div>

            <div className="ff">
              <label className="fl">الحالة</label>
              <select
                className="fis"
                value={form.status}
                onChange={(e) => onUpdateForm({ status: e.target.value as any })}
                disabled={!canManage}
              >
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
            </div>

            <div className="ff full">
              <label className="fl">الصفوف والشعب</label>
              {form.classes_taught.map((cls, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    marginBottom: "0.35rem",
                    alignItems: "flex-end",
                  }}
                >
                  <select
                    className="fis"
                    value={cls.grade}
                    onChange={(e) => onUpdateClassRow(i, "grade", e.target.value)}
                    disabled={!canManage}
                  >
                    <option value="">الصف...</option>
                    {CLASS_GRADES.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  <select
                    className="fis"
                    value={cls.section}
                    onChange={(e) => onUpdateClassRow(i, "section", e.target.value)}
                    disabled={!canManage}
                  >
                    <option value="">الشعبة...</option>
                    {SECTIONS_LIST.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {form.classes_taught.length > 1 && (
                    <button
                      type="button"
                      className="bc"
                      onClick={() => onRemoveClassRow(i)}
                      disabled={!canManage}
                    >
                      <AppIcon token="✕" size={12} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="bc"
                style={{ marginTop: "0.35rem" }}
                onClick={onAddClassRow}
                disabled={!canManage}
              >
                + صف
              </button>
            </div>
          </div>

          <div className="fa">
            <button type="submit" className="bs" disabled={saving || !canManage}>
              {saving ? "جارٍ الحفظ..." : "حفظ"}
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
