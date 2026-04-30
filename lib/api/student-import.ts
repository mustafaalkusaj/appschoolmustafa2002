import { z } from "zod";

const optionalTrimmedString = (maxLength: number) =>
  z
    .union([z.string().trim().max(maxLength), z.null(), z.undefined()])
    .transform((value) => (typeof value === "string" && value.length > 0 ? value : null));

export const studentImportRowSchema = z.object({
  fullName: z.string().trim().min(3).max(160),
  className: z.string().trim().min(1).max(120),
  sectionName: z.string().trim().min(1).max(120),
  phoneNumber: optionalTrimmedString(32),
  dateOfBirth: optionalTrimmedString(32),
  gender: optionalTrimmedString(32),
  address: optionalTrimmedString(240),
  parentName: optionalTrimmedString(160),
  parentPhone: optionalTrimmedString(32),
  notes: optionalTrimmedString(500),
});

export const studentImportRequestSchema = z.object({
  chunk: z.array(studentImportRowSchema).min(1).max(1000),
});

export type StudentImportRow = z.infer<typeof studentImportRowSchema> & {
  classId?: string; // UUID of matched class (added by validator)
  sectionId?: string; // UUID of matched section (added by validator)
};

export type StudentInsertPayload = {
  full_name: string;
  school_id: string;
  branch_id: string;
  class_name: string;
  section?: string | null; // TEXT field - section/division name
  registration_number?: string;
  status: "active";
  created_at: string;
  parent_name?: string | null;
  parent_phone?: string | null;
  date_of_birth?: string;
};

export function buildStudentInsertPayloads(
  rows: StudentImportRow[],
  schoolId: string,
  branchId: string,
  now = new Date(),
): StudentInsertPayload[] {
  const timestamp = now.toISOString();

  return rows.map((row) => ({
    full_name: row.fullName,
    school_id: schoolId,
    branch_id: branchId,
    class_name: row.className,
    section: row.sectionName || null,
    status: "active" as const,
    created_at: timestamp,
    ...(row.parentName ? { parent_name: row.parentName } : {}),
    ...(row.parentPhone ? { parent_phone: row.parentPhone } : {}),
    ...(row.dateOfBirth ? { date_of_birth: row.dateOfBirth } : {}),
  }));
}

export function getStudentImportValidationMessage(error: z.ZodError) {
  const firstIssue = error.issues[0];

  if (!firstIssue) {
    return "بيانات الاستيراد غير صالحة.";
  }

  if (firstIssue.path[0] === "chunk" && firstIssue.path.length === 1) {
    return "يجب إرسال دفعة استيراد تحتوي على صف واحد على الأقل وبحد أقصى 1000 صف.";
  }

  const rowIndex = typeof firstIssue.path[1] === "number" ? Number(firstIssue.path[1]) + 1 : null;
  const fieldName = typeof firstIssue.path[2] === "string" ? String(firstIssue.path[2]) : "row";

  if (rowIndex) {
    return `الصف ${rowIndex} يحتوي على قيمة غير صالحة في الحقل ${fieldName}.`;
  }

  return "بيانات الاستيراد غير صالحة.";
}

export function readStudentImportErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallback;
}
