export const MANAGED_USER_ROLES = ["student", "teacher"] as const;
export type ManagedUserRole = (typeof MANAGED_USER_ROLES)[number];

export const MANAGED_USER_ROLE_LABELS: Record<ManagedUserRole, string> = {
  student: "طالب",
  teacher: "مدرس",
};

export const MANAGED_USER_INACTIVE_BAN_DURATION = "876000h";
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 72;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ManagedStudentRecord {
  id: string;
  full_name: string | null;
  class_name: string | null;
  section: string | null;
  address: string | null;
  total_fee: number | null;
  paid_fee: number | null;
  discount_value: number | null;
  status: string | null;
}

export interface ManagedTeacherRecord {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  specialization: string | null;
  notes: string | null;
  is_active: boolean | null;
  assignments: ManagedTeacherAssignmentRecord[];
}

export interface ManagedUserRecord {
  auth_user_id: string;
  school_id: string;
  role: ManagedUserRole;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  student: ManagedStudentRecord | null;
  teacher: ManagedTeacherRecord | null;
  app_account: ManagedUserAppAccountSummary | null;
}

export interface ManagedStudentInput {
  class_name: string;
  section: string | null;
  address: string | null;
  total_fee: number;
  paid_fee: number;
  discount_value: number;
  branch_id?: string; // CRITICAL FIX: User-selected branch_id
}

export interface ManagedTeacherInput {
  specialization: string | null;
  notes: string | null;
  assignments: ManagedTeacherAssignmentInput[];
  branch_id?: string; // CRITICAL FIX: User-selected branch_id for multi-branch isolation
}

export interface ManagedUserInput {
  school_id: string | null;
  role: ManagedUserRole;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  student: ManagedStudentInput | null;
  teacher: ManagedTeacherInput | null;
}

export interface CreateManagedUserInput extends ManagedUserInput {
  password: string;
}

export interface ManagedTeacherAssignmentRecord {
  id: string;
  subject_id: string | null;
  subject_name: string;
  class_id: string | null;
  class_name: string;
  section_id: string | null;
  section_name: string | null;
  is_active: boolean;
}

export interface ManagedTeacherAssignmentInput {
  subject_name: string;
  class_name: string;
  section: string | null;
}

export interface ManagedUserAppAccountSummary {
  login_identifier: string;
  has_temporary_password: boolean;
  password_last_reset_at: string | null;
  card_last_printed_at: string | null;
}

export interface ManagedUserAccountCard {
  auth_user_id: string;
  role: ManagedUserRole;
  school_name: string;
  school_logo_url: string | null;
  full_name: string;
  class_name: string | null;
  section: string | null;
  login_identifier: string;
  temporary_password: string;
  instructions: string[];
  generated_at: string;
}

type ValidationFailure = {
  ok: false;
  message: string;
  fieldErrors: Record<string, string>;
};

type ValidationSuccess<T> = {
  ok: true;
  value: T;
};

type ValidationResult<T> = ValidationFailure | ValidationSuccess<T>;

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableString(value: unknown, maxLength: number) {
  const nextValue = normalizeString(value);
  if (!nextValue) return null;
  return nextValue.slice(0, maxLength);
}

function normalizeEmail(value: unknown) {
  return normalizeString(value).toLowerCase();
}

function normalizeManagedUserRole(value: unknown): ManagedUserRole | null {
  return value === "student" || value === "teacher" ? value : null;
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeMoneyValue(value: unknown, fieldName: string, fieldErrors: Record<string, string>) {
  if (value === null || value === undefined || value === "") return 0;

  const parsed =
    typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : Number.NaN;

  if (!Number.isFinite(parsed) || parsed < 0) {
    fieldErrors[fieldName] = "أدخل قيمة رقمية صحيحة تساوي صفراً أو أكثر.";
    return 0;
  }

  return Math.round(parsed);
}

function normalizeTeacherAssignments(
  value: unknown,
  fieldErrors: Record<string, string>,
): ManagedTeacherAssignmentInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = value
    .map((entry, index) => {
      const row = (entry ?? {}) as Record<string, unknown>;
      const subjectName = normalizeString(row.subject_name);
      const className = normalizeString(row.class_name);
      const section = normalizeNullableString(row.section, 120);

      if (!subjectName && !className && !section) {
        return null;
      }

      if (!subjectName) {
        fieldErrors[`teacher.assignments.${index}.subject_name`] = "اسم المادة مطلوب لكل تكليف.";
      }

      if (!className) {
        fieldErrors[`teacher.assignments.${index}.class_name`] = "اسم الصف مطلوب لكل تكليف.";
      }

      if (!subjectName || !className) {
        return null;
      }

      return {
        subject_name: subjectName,
        class_name: className,
        section,
      };
    })
    .filter((entry): entry is ManagedTeacherAssignmentInput => Boolean(entry));

  const deduped = new Map<string, ManagedTeacherAssignmentInput>();
  normalized.forEach((assignment) => {
    deduped.set(
      `${assignment.subject_name.toLowerCase()}::${assignment.class_name.toLowerCase()}::${assignment.section?.toLowerCase() ?? "*"}`,
      assignment,
    );
  });

  return Array.from(deduped.values());
}

function validateCommonManagedUserInput(
  body: unknown,
  options: { requirePassword: boolean; allowGeneratedEmail?: boolean; allowGeneratedPassword?: boolean },
): ValidationResult<ManagedUserInput & { password?: string }> {
  const data = (body ?? {}) as Record<string, unknown>;
  const fieldErrors: Record<string, string> = {};

  const role = normalizeManagedUserRole(data.role);
  if (!role) {
    fieldErrors.role = "اختر نوع الحساب: طالب أو مدرس.";
  }

  const schoolId = normalizeString(data.school_id) || null;
  const fullName = normalizeString(data.full_name);
  if (fullName.length < 2) {
    fieldErrors.full_name = "الاسم الكامل مطلوب ويجب أن يكون من حرفين على الأقل.";
  }

  const email = normalizeEmail(data.email);
  if (!email && !options.allowGeneratedEmail) {
    fieldErrors.email = "أدخل بريداً إلكترونياً صحيحاً أو اتركه فارغاً ليتم توليد معرّف دخول تلقائي.";
  } else if (email && !EMAIL_PATTERN.test(email)) {
    fieldErrors.email = "أدخل بريداً إلكترونياً صحيحاً.";
  }

  const phone = normalizeNullableString(data.phone, 32);
  const isActive = normalizeBoolean(data.is_active, true);

  let password: string | undefined;
  if (options.requirePassword) {
    password = typeof data.password === "string" ? data.password : "";
    if (!password && options.allowGeneratedPassword) {
      password = "";
    } else if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
      fieldErrors.password = `كلمة المرور يجب أن تكون بين ${MIN_PASSWORD_LENGTH} و ${MAX_PASSWORD_LENGTH} حرفاً.`;
    }
  }

  const studentPayload = (data.student ?? {}) as Record<string, unknown>;
  const teacherPayload = (data.teacher ?? {}) as Record<string, unknown>;

  let student: ManagedStudentInput | null = null;
  let teacher: ManagedTeacherInput | null = null;

  if (role === "student") {
    const className = normalizeString(studentPayload.class_name);
    if (!className) {
      fieldErrors["student.class_name"] = "الصف مطلوب لحساب الطالب.";
    }

    const totalFee = normalizeMoneyValue(studentPayload.total_fee, "student.total_fee", fieldErrors);
    const paidFee = normalizeMoneyValue(studentPayload.paid_fee, "student.paid_fee", fieldErrors);
    const discountValue = normalizeMoneyValue(
      studentPayload.discount_value,
      "student.discount_value",
      fieldErrors,
    );

    if (paidFee > totalFee) {
      fieldErrors["student.paid_fee"] = "المدفوع لا يمكن أن يكون أكبر من إجمالي الرسوم.";
    }

    if (discountValue > totalFee) {
      fieldErrors["student.discount_value"] = "الخصم لا يمكن أن يكون أكبر من إجمالي الرسوم.";
    }

    student = {
      class_name: className,
      section: normalizeNullableString(studentPayload.section, 64),
      address: normalizeNullableString(studentPayload.address, 240),
      total_fee: totalFee,
      paid_fee: paidFee,
      discount_value: discountValue,
    };
  }

  if (role === "teacher") {
    teacher = {
      specialization: normalizeNullableString(teacherPayload.specialization, 120),
      notes: normalizeNullableString(teacherPayload.notes, 500),
      assignments: normalizeTeacherAssignments(teacherPayload.assignments, fieldErrors),
    };
  }

  if (Object.keys(fieldErrors).length > 0 || !role) {
    return {
      ok: false,
      message: "تحقق من الحقول المطلوبة ثم أعد المحاولة.",
      fieldErrors,
    };
  }

  return {
    ok: true,
    value: {
      school_id: schoolId,
      role,
      full_name: fullName,
      email,
      phone,
      is_active: isActive,
      student,
      teacher,
      ...(password !== undefined ? { password } : {}),
    },
  };
}

export function validateCreateManagedUserInput(body: unknown): ValidationResult<CreateManagedUserInput> {
  const result = validateCommonManagedUserInput(body, {
    requirePassword: true,
    allowGeneratedEmail: true,
    allowGeneratedPassword: true,
  });
  if (!result.ok) {
    return {
      ok: false,
      message: "message" in result ? result.message : "تحقق من الحقول المطلوبة ثم أعد المحاولة.",
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : {},
    };
  }

  return {
    ok: true,
    value: {
      ...result.value,
      password: result.value.password!,
    },
  };
}

export function validateUpdateManagedUserInput(body: unknown): ValidationResult<ManagedUserInput> {
  const result = validateCommonManagedUserInput(body, { requirePassword: false });
  if (!result.ok) {
    return {
      ok: false,
      message: "message" in result ? result.message : "تحقق من الحقول المطلوبة ثم أعد المحاولة.",
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : {},
    };
  }

  return {
    ok: true,
    value: {
      school_id: result.value.school_id,
      role: result.value.role,
      full_name: result.value.full_name,
      email: result.value.email,
      phone: result.value.phone,
      is_active: result.value.is_active,
      student: result.value.student,
      teacher: result.value.teacher,
    },
  };
}
