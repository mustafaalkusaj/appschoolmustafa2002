// Teachers page utility functions

import { escapeHtml, wrapPrintDocument } from "@/lib/print/branding";
import type {
  ManagedUserAccountCard,
  ManagedUserRecord,
  ManagedUserRole,
} from "@/lib/managed-users";
import type {
  ClassOption,
  RawClassOption,
  RawSectionOption,
  SectionOption,
  SubjectOption,
  TeacherAssignmentFormState,
  UserFormState,
} from "./_types";

// Constants
export const TEACHER_IMPORT_ALLOWED_EXTENSIONS = [".xlsx"] as const;
export const TEACHER_IMPORT_MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

// Form helpers
export function createEmptyTeacherAssignment(): TeacherAssignmentFormState {
  return {
    subject_name: "",
    class_name: "",
    section: "",
  };
}

export function createEmptyForm(role: ManagedUserRole = "teacher"): UserFormState {
  return {
    role,
    full_name: "",
    email: "",
    password: "",
    phone: "",
    is_active: true,
    student: {
      class_name: "",
      section: "",
    },
    teacher: {
      assignments: [createEmptyTeacherAssignment()],
    },
  };
}

export function mapUserToForm(user: ManagedUserRecord): UserFormState {
  return {
    role: user.role,
    full_name: user.full_name,
    email: user.email,
    password: "",
    phone: user.phone ?? "",
    is_active: user.is_active,
    student: {
      class_name: user.student?.class_name ?? "",
      section: user.student?.section ?? "",
    },
    teacher: {
      assignments:
        user.teacher?.assignments.length
          ? user.teacher.assignments.map((assignment) => ({
              subject_name: assignment.subject_name,
              class_name: assignment.class_name,
              section: assignment.section_name ?? "",
            }))
          : [createEmptyTeacherAssignment()],
    },
  };
}

export function buildPayload(form: UserFormState, schoolId: string) {
  return {
    school_id: schoolId,
    role: form.role,
    full_name: form.full_name,
    email: form.email,
    phone: form.phone,
    is_active: form.is_active,
    password: form.password,
    student:
      form.role === "student"
        ? {
            class_name: form.student.class_name,
            section: form.student.section,
          }
        : null,
    teacher:
      form.role === "teacher"
        ? {
            assignments: form.teacher.assignments,
          }
        : null,
  };
}

// Option normalization helpers
export function normalizeOptionText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function getClassOptionName(option: RawClassOption) {
  return normalizeOptionText(option.name) || normalizeOptionText(option.grade);
}

export function getSectionOptionName(option: RawSectionOption | RawClassOption) {
  return normalizeOptionText(option.name) || normalizeOptionText(option.section) || null;
}

// API helpers
export function readApiError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const candidate = payload as { error?: { message?: string } };
  return candidate.error?.message || fallback;
}

// Excel import helpers
export function validateTeacherImportFile(file: File) {
  const normalizedName = file.name.trim().toLowerCase();
  if (!normalizedName) {
    return "اسم الملف غير صالح.";
  }

  const hasAllowedExtension = TEACHER_IMPORT_ALLOWED_EXTENSIONS.some((extension) =>
    normalizedName.endsWith(extension),
  );
  if (!hasAllowedExtension) {
    return "صيغة الملف غير مدعومة. استخدم ملف xlsx فقط.";
  }

  if (file.size <= 0) {
    return "ملف الإكسل فارغ.";
  }

  if (file.size > TEACHER_IMPORT_MAX_FILE_SIZE_BYTES) {
    return "حجم ملف الاستيراد كبير جداً. الحد الأقصى 2 ميغابايت.";
  }

  return null;
}

export function normalizeExcelCell(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function readExcelColumn(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = normalizeExcelCell(row[key]);
    if (value) return value;
  }
  return "";
}

export function parseImportRole(value: string): ManagedUserRole | null {
  const normalized = value.toLowerCase();
  if (!normalized) return null;
  if (["student", "طالب", "طلاب"].some((token) => normalized.includes(token))) return "student";
  if (["teacher", "مدرس", "معلم", "مدرسة"].some((token) => normalized.includes(token))) return "teacher";
  return null;
}

export function parseImportActive(value: string) {
  const normalized = value.toLowerCase();
  if (!normalized) return true;
  if (["inactive", "disabled", "غير نشط", "موقوف", "0", "no", "false"].includes(normalized)) return false;
  return true;
}

// Date formatting
export function formatDateLabel(value: string | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("ar-IQ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

// Print template
export function buildPrintableCardHtml(card: ManagedUserAccountCard, _autoPrint = true) {
  const instructions = card.instructions.map((instruction) => `<li>${escapeHtml(instruction)}</li>`).join("");
  const classLine = [card.class_name, card.section ? `الشعبة ${card.section}` : null].filter(Boolean).join(" • ");
  const roleLabel = card.role === "student" ? "الطالب" : "المدرس";
  return wrapPrintDocument({
    title: "بطاقة حساب التطبيق",
    subtitle: `بطاقة بيانات دخول ${roleLabel}`,
    branding: {
      schoolName: card.school_name,
      logoUrl: card.school_logo_url,
      locale: "ar",
    },
    autoPrint: false,
    extraStyles: `
      .teacher-card-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-bottom:16px}
      .teacher-card-note{margin-top:16px;font-size:12px;color:var(--print-muted)}
      @media (max-width:700px){.teacher-card-grid{grid-template-columns:1fr}}
    `,
    bodyHtml: `
      <div class="teacher-card-grid">
        <div class="print-panel">
          <span class="print-label">الاسم الكامل</span>
          <div class="print-value">${escapeHtml(card.full_name)}</div>
          <div style="margin-top:8px;color:var(--print-muted);font-size:13px">${card.role === "student" ? "حساب طالب" : "حساب مدرس"}</div>
        </div>
        <div class="print-panel">
          <span class="print-label">الصف والشعبة</span>
          <div class="print-value">${escapeHtml(classLine || "—")}</div>
          <div style="margin-top:8px;color:var(--print-muted);font-size:13px">${card.role === "student" ? "يظهر للطلاب فقط" : "حسب التكليفات المسندة"}</div>
        </div>
      </div>
      <div class="teacher-card-grid">
        <div class="print-panel">
          <span class="print-label">معرّف الدخول</span>
          <div class="print-value" style="direction:ltr;text-align:left">${escapeHtml(card.login_identifier)}</div>
        </div>
        <div class="print-panel">
          <span class="print-label">كلمة المرور المؤقتة</span>
          <div class="print-value" style="direction:ltr;text-align:left">${escapeHtml(card.temporary_password)}</div>
        </div>
      </div>
      <div class="print-panel">
        <span class="print-label">إرشادات الدخول</span>
        <ol class="print-list">${instructions}</ol>
      </div>
      <div class="teacher-card-note">تم التوليد: ${escapeHtml(formatDateLabel(card.generated_at))}</div>
    `,
  });
}

// Class name helper for inputs
export function inputClass(hasError = false) {
  return `ui-input ${hasError ? "!border-[rgba(240,90,90,0.48)] !bg-[rgba(240,90,90,0.04)]" : ""}`;
}

// Option processing for classes and sections
export function processClassOptions(rawClasses: RawClassOption[]): ClassOption[] {
  const normalizedClasses = new Map<string, ClassOption>();

  rawClasses.forEach((item) => {
    const name = getClassOptionName(item);
    if (!name) return;
    normalizedClasses.set(name, { id: name, name });
  });

  return Array.from(normalizedClasses.values());
}

export function processSectionOptions(
  rawSections: RawSectionOption[],
  rawClasses: RawClassOption[],
  classNamesByRecordId: Map<string, string>,
): SectionOption[] {
  const normalizedSections = new Map<string, SectionOption>();

  ((rawSections ?? []) as RawSectionOption[]).forEach((item) => {
    const name = getSectionOptionName(item);
    const className = item.class_id ? classNamesByRecordId.get(item.class_id) ?? null : null;
    if (!name || !className) return;
    normalizedSections.set(`${className}::${name}`, {
      id: `${className}::${name}`,
      name,
      class_id: className,
    });
  });

  rawClasses.forEach((item) => {
    const className = getClassOptionName(item);
    const sectionName = getSectionOptionName(item);
    if (!className || !sectionName) return;
    normalizedSections.set(`${className}::${sectionName}`, {
      id: `${className}::${sectionName}`,
      name: sectionName,
      class_id: className,
    });
  });

  return Array.from(normalizedSections.values());
}

export function processSubjectOptions(rawSubjects: SubjectOption[]): SubjectOption[] {
  return rawSubjects.map((item) => ({ id: item.id, name: item.name }));
}

// Build class name lookup map
export function buildClassNamesByRecordId(rawClasses: RawClassOption[]): Map<string, string> {
  const map = new Map<string, string>();
  rawClasses.forEach((item) => {
    const name = getClassOptionName(item);
    if (name) {
      map.set(item.id, name);
    }
  });
  return map;
}

// Section options by class
export function getSectionOptionsByClass(sections: SectionOption[]): Map<string, SectionOption[]> {
  const map = new Map<string, SectionOption[]>();

  sections.forEach((section) => {
    const current = map.get(section.class_id) ?? [];
    current.push(section);
    map.set(section.class_id, current);
  });

  return map;
}

// Get sections for a specific class
export function getSectionsForClass(className: string, classes: ClassOption[], sectionOptionsByClass: Map<string, SectionOption[]>) {
  const classRow = classes.find((item) => item.name === className);
  return classRow ? sectionOptionsByClass.get(classRow.id) ?? [] : [];
}
