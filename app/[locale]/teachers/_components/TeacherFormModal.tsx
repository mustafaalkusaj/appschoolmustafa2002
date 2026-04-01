"use client";

// Teacher form modal for create/edit

import { BookOpen, CheckCircle2, CircleOff, Loader2, Sparkles } from "@/lib/icons";
import type { ClassOption, FieldErrors, SectionOption, SubjectOption, TeacherAssignmentFormState, UserFormState } from "../_types";
import type { ManagedUserRecord } from "@/lib/managed-users";
import { FieldError } from "./ui";
import { createEmptyTeacherAssignment, inputClass } from "../_utils";
import { getSectionsForClass, getSectionOptionsByClass } from "../_utils";

type TeacherFormModalProps = {
  showing: boolean;
  editingUser: ManagedUserRecord | null;
  form: UserFormState;
  fieldErrors: FieldErrors;
  saving: boolean;
  classes: ClassOption[];
  subjects: SubjectOption[];
  sections: SectionOption[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  updateTeacherAssignment: (key: keyof TeacherAssignmentFormState, value: string) => void;
  updateFormField: <K extends keyof UserFormState>(field: K, value: UserFormState[K]) => void;
  updateStudentField: <K extends keyof UserFormState['student']>(field: K, value: UserFormState['student'][K]) => void;
};

export function TeacherFormModal({
  showing,
  editingUser,
  form,
  fieldErrors,
  saving,
  classes,
  subjects,
  sections,
  onClose,
  onSubmit,
  updateTeacherAssignment,
  updateFormField,
  updateStudentField,
}: TeacherFormModalProps) {
  if (!showing) return null;

  const isStudentForm = form.role === "student";
  const teacherAssignment = form.teacher.assignments[0] ?? createEmptyTeacherAssignment();
  const sectionOptionsByClass = getSectionOptionsByClass(sections);
  const teacherSections = getSectionsForClass(teacherAssignment.class_name, classes, sectionOptionsByClass);
  const availableStudentSections = getSectionsForClass(form.student.class_name, classes, sectionOptionsByClass);

  const modalTitle = editingUser ? "تعديل حساب الأستاذ" : "إضافة أستاذ";
  const modalDescription = editingUser
    ? "يتم تعديل بيانات الدخول وربط الحساب الحالي دون المساس بتدفق الطباعة أو التكامل الخلفي."
    : "هذا النموذج يركز على بيانات حساب الأستاذ وتكليفاته الأساسية فقط.";

  return (
    <div
      className="ui-backdrop flex items-center justify-center p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={`ui-dialog w-full overflow-hidden ${isStudentForm ? "max-w-[760px]" : "max-w-[920px]"}`}>
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-5 sm:px-7">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-sm font-black text-[var(--text-primary)]">
              <BookOpen size={15} />
              مسار حساب الأستاذ
            </div>
            <h2 className="text-xl font-black text-[var(--text-primary)]">{modalTitle}</h2>
            <p className="text-sm leading-7 text-[var(--text-secondary)]">{modalDescription}</p>
          </div>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            onClick={onClose}
            aria-label="إغلاق"
          >
            <CircleOff size={18} />
          </button>
        </div>

        <form className="max-h-[calc(100dvh-10rem)] space-y-5 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6" onSubmit={onSubmit} noValidate>
          <section className="space-y-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
            <div>
              <h3 className="text-lg font-black text-[var(--text-primary)]">بيانات الحساب الأساسية</h3>
              <p className="mt-1 text-sm leading-7 text-[var(--text-secondary)]">
                الاسم وبيانات الدخول والحالة وربط الحساب الجاهز للاستخدام.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-black text-[var(--text-primary)]">الحالة</span>
                <select
                  className={inputClass()}
                  value={form.is_active ? "active" : "inactive"}
                  onChange={(event) =>
                    updateFormField("is_active", event.target.value === "active")
                  }
                >
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-[var(--text-primary)]">الاسم الكامل</span>
                <input
                  className={inputClass(Boolean(fieldErrors.full_name))}
                  value={form.full_name}
                  onChange={(event) => updateFormField("full_name", event.target.value)}
                />
                <FieldError message={fieldErrors.full_name} />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-[var(--text-primary)]">رقم الهاتف</span>
                <input
                  className={inputClass(Boolean(fieldErrors.phone))}
                  value={form.phone}
                  onChange={(event) => updateFormField("phone", event.target.value)}
                />
                <FieldError message={fieldErrors.phone} />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-[var(--text-primary)]">
                  معرّف الدخول / البريد الإلكتروني
                </span>
                <input
                  type="email"
                  dir="ltr"
                  className={inputClass(Boolean(fieldErrors.email))}
                  value={form.email}
                  onChange={(event) => updateFormField("email", event.target.value)}
                  placeholder="اختياري: إذا تُرك فارغاً سيُولد تلقائياً"
                />
                <FieldError message={fieldErrors.email} />
              </label>

              {!editingUser ? (
                <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4 text-sm leading-7 text-[var(--text-secondary)] md:col-span-2">
                  <div className="mb-1 flex items-center gap-2 font-black text-[var(--text-primary)]">
                    <Sparkles size={16} />
                    توليد تلقائي لبيانات التطبيق
                  </div>
                  سيتم إنشاء مستخدم Supabase Auth حقيقي ومعرّف دخول وكلمة مرور مؤقتة آمنة تلقائياً، ثم عرض بطاقة حساب قابلة للطباعة فور الحفظ.
                </div>
              ) : (
                <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4 text-sm leading-7 text-[var(--text-secondary)] md:col-span-2">
                  تغيير الدور أو كلمة المرور غير مشمول هنا. استخدم زر "إعادة ضبط المؤقتة" من الجدول لإصدار كلمة مرور جديدة وفتح بطاقة الحساب مباشرة.
                </div>
              )}
            </div>
          </section>

          {form.role === "student" ? (
            <section className="space-y-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              <div>
                <h3 className="text-lg font-black text-[var(--text-primary)]">ربط الطالب</h3>
                <p className="mt-1 text-sm leading-7 text-[var(--text-secondary)]">
                  اختر الصف والشعبة فقط. تفاصيل العنوان والرسوم تُدار من شاشة الطلاب خارج هذا المودال.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-black text-[var(--text-primary)]">الصف</span>
                  <select
                    className={inputClass(Boolean(fieldErrors["student.class_name"]))}
                    value={form.student.class_name}
                    onChange={(event) => {
                      updateStudentField("class_name", event.target.value);
                      updateStudentField("section", "");
                    }}
                  >
                    <option value="">اختر الصف</option>
                    {classes.map((classOption) => (
                      <option key={classOption.id} value={classOption.name}>
                        {classOption.name}
                      </option>
                    ))}
                  </select>
                  <FieldError message={fieldErrors["student.class_name"]} />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-black text-[var(--text-primary)]">الشعبة</span>
                  <select
                    className={inputClass(Boolean(fieldErrors["student.section"]))}
                    value={form.student.section}
                    onChange={(event) => updateStudentField("section", event.target.value)}
                  >
                    <option value="">كل الشعب / غير محددة</option>
                    {availableStudentSections.map((sectionOption) => (
                      <option key={sectionOption.id} value={sectionOption.name}>
                        {sectionOption.name}
                      </option>
                    ))}
                  </select>
                  <FieldError message={fieldErrors["student.section"]} />
                </label>
              </div>
            </section>
          ) : (
            <section className="space-y-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              <div>
                <h3 className="text-lg font-black text-[var(--text-primary)]">بيانات المدرس الأكاديمية</h3>
                <p className="mt-1 text-sm leading-7 text-[var(--text-secondary)]">
                  أدخل مادة واحدة مع الصف والشعبة المرتبطين بالحساب.
                </p>
              </div>
              <div className="space-y-3 rounded-[20px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                <FieldError message={fieldErrors["teacher.assignments"]} />
                <div className="grid gap-3 rounded-[20px] border border-[var(--border)] bg-[var(--surface-muted)] p-4 md:grid-cols-3">
                  <label className="space-y-2">
                    <span className="text-sm font-black text-[var(--text-primary)]">المادة</span>
                    <input
                      list="subjects-list"
                      className={inputClass(Boolean(fieldErrors["teacher.assignments.0.subject_name"]))}
                      value={teacherAssignment.subject_name}
                      onChange={(event) => updateTeacherAssignment("subject_name", event.target.value)}
                    />
                    <FieldError message={fieldErrors["teacher.assignments.0.subject_name"]} />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-black text-[var(--text-primary)]">الصف</span>
                    <select
                      className={inputClass(Boolean(fieldErrors["teacher.assignments.0.class_name"]))}
                      value={teacherAssignment.class_name}
                      onChange={(event) => updateTeacherAssignment("class_name", event.target.value)}
                    >
                      <option value="">اختر الصف</option>
                      {classes.map((classOption) => (
                        <option key={classOption.id} value={classOption.name}>
                          {classOption.name}
                        </option>
                      ))}
                    </select>
                    <FieldError message={fieldErrors["teacher.assignments.0.class_name"]} />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-black text-[var(--text-primary)]">الشعبة</span>
                    <select
                      className={inputClass()}
                      value={teacherAssignment.section ?? ""}
                      onChange={(event) => updateTeacherAssignment("section", event.target.value)}
                    >
                      <option value="">كل الشعب</option>
                      {teacherSections.map((sectionOption) => (
                        <option key={sectionOption.id} value={sectionOption.name}>
                          {sectionOption.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <datalist id="subjects-list">
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.name} />
                  ))}
                </datalist>
              </div>
            </section>
          )}

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button
              type="button"
              className="ui-button ui-button--secondary"
              onClick={onClose}
            >
              إلغاء
            </button>
            <button type="submit" className="ui-button ui-button--primary inline-flex items-center gap-2" disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {editingUser ? "حفظ التعديلات" : "إنشاء الحساب"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
