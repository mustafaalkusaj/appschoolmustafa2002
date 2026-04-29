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
  nameAr: string;
  schoolId: string;
  branchId: string;
  classId?: string | null; // UUID foreign key (not string class_name)
  registrationNumber?: string;
  status: "active";
  createdAt: string;
  updatedAt: string;
  parentName?: string | null;
  parentPhone?: string | null;
  dateOfBirth?: string;
};

export function buildStudentInsertPayloads(
  rows: StudentImportRow[],
  schoolId: string,
  branchId: string,
  now = new Date(),
): StudentInsertPayload[] {
  const timestamp = now.toISOString();

  return rows.map((row) => ({
    nameAr: row.fullName, // Use fullName as Arabic name
    schoolId,
    branchId,
    classId: row.classId || null, // Use classId (UUID), not class_name
    status: "active" as const,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...(row.parentName ? { parentName: row.parentName } : {}),
    ...(row.parentPhone ? { parentPhone: row.parentPhone } : {}),
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
