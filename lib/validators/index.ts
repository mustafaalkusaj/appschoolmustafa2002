/**
 * Validation Schemas
 * Central location for all Zod validation schemas
 * Used for request body and query parameter validation
 */

import { z } from "zod";

// ============================================================================
// AUTH VALIDATORS
// ============================================================================

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(10, "Password must be at least 10 characters"),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  schoolId: z.string().uuid("Invalid school ID")
});

export const resetPasswordSchema = z.object({
  currentPassword: z.string().min(6, "Current password required"),
  newPassword: z.string().min(10, "New password must be at least 10 characters"),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// ============================================================================
// STUDENT VALIDATORS
// ============================================================================

export const studentSchema = z.object({
  nameAr: z.string().min(2, "Arabic name required").max(100, "Name too long"),
  nameEn: z.string().min(2, "English name required").max(100, "Name too long"),
  classId: z.string().uuid("Invalid class ID"),
  registrationNumber: z.string().min(1, "Registration number required").max(50),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  status: z.enum(["active", "inactive", "graduated"]).default("active"),
  branchId: z.string().min(1, "Branch ID is required").max(36)
});

export const studentQuerySchema = z.object({
  classId: z.string().uuid("Invalid class ID").optional(),
  status: z.enum(["active", "inactive", "graduated"]).optional(),
  page: z.coerce.number().min(1, "Page must be at least 1").default(1),
  limit: z.coerce.number().min(1, "Limit must be at least 1").max(100, "Limit cannot exceed 100").default(20)
});

export const bulkStudentImportSchema = z.object({
  students: z.array(studentSchema).min(1, "At least one student required").max(1000, "Maximum 1000 students per import")
});

// ============================================================================
// PAYMENT VALIDATORS
// ============================================================================

export const paymentSchema = z.object({
  studentId: z.string().uuid("Invalid student ID"),
  amount: z.number().positive("Amount must be positive"),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  paymentMethod: z.enum(["cash", "check", "bank_transfer", "credit_card"]),
  notes: z.string().max(500, "Notes too long").optional()
});

export const paymentQuerySchema = z.object({
  studentId: z.string().uuid("Invalid student ID").optional(),
  status: z.enum(["pending", "completed", "cancelled"]).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
});

// ============================================================================
// SALARY VALIDATORS
// ============================================================================

export const salarySchema = z.object({
  employeeId: z.string().uuid("Invalid employee ID"),
  baseSalary: z.number().positive("Salary must be positive"),
  deductions: z.number().min(0, "Deductions cannot be negative").default(0),
  bonus: z.number().min(0, "Bonus cannot be negative").default(0),
  month: z.number().min(1, "Invalid month").max(12, "Invalid month"),
  year: z.number().min(2000, "Invalid year").max(2100, "Invalid year"),
  notes: z.string().max(500, "Notes too long").optional()
});

export const salaryQuerySchema = z.object({
  employeeId: z.string().uuid("Invalid employee ID").optional(),
  month: z.coerce.number().min(1).max(12).optional(),
  year: z.coerce.number().min(2000).optional(),
  status: z.enum(["pending", "approved", "paid"]).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
});

// ============================================================================
// ATTENDANCE VALIDATORS
// ============================================================================

export const attendanceSchema = z.object({
  studentId: z.string().uuid("Invalid student ID"),
  attendanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  status: z.enum(["present", "absent", "excused", "late"]),
  notes: z.string().max(500, "Notes too long").optional()
});

export const attendanceQuerySchema = z.object({
  studentId: z.string().uuid("Invalid student ID").optional(),
  classId: z.string().uuid("Invalid class ID").optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
  status: z.enum(["present", "absent", "excused", "late"]).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
});

// ============================================================================
// ACCOUNT VALIDATORS
// ============================================================================

export const accountSchema = z.object({
  accountCode: z.string().min(1, "Account code required").max(50),
  accountNameAr: z.string().min(2, "Arabic name required").max(100),
  accountNameEn: z.string().min(2, "English name required").max(100),
  accountType: z.enum(["asset", "liability", "equity", "income", "expense"]),
  balance: z.number().default(0)
});

export const accountQuerySchema = z.object({
  accountType: z.enum(["asset", "liability", "equity", "income", "expense"]).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
});

// ============================================================================
// TRANSACTION VALIDATORS
// ============================================================================

export const transactionSchema = z.object({
  accountId: z.string().uuid("Invalid account ID"),
  amount: z.number().positive("Amount must be positive"),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  transactionType: z.enum(["debit", "credit"]),
  description: z.string().min(1, "Description required").max(500),
  referenceNumber: z.string().max(50).optional()
});

export const transactionQuerySchema = z.object({
  accountId: z.string().uuid("Invalid account ID").optional(),
  transactionType: z.enum(["debit", "credit"]).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
});

// ============================================================================
// EMPLOYEE VALIDATORS
// ============================================================================

export const employeeSchema = z.object({
  employeeCode: z.string().min(1, "Employee code required").max(50),
  fullNameAr: z.string().min(2, "Arabic name required").max(100),
  fullNameEn: z.string().min(2, "English name required").max(100),
  position: z.string().min(2, "Position required").max(100),
  email: z.string().email("Invalid email").optional(),
  phone: z.string().min(10, "Invalid phone number").optional(),
  baseSalary: z.number().positive("Salary must be positive"),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
});

export const employeeQuerySchema = z.object({
  position: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
});

// ============================================================================
// SCHOOL/BRANCH VALIDATORS
// ============================================================================

export const schoolSchema = z.object({
  name: z.string().min(2, "School name required").max(100),
  address: z.string().max(200).optional(),
  phone: z.string().max(20).optional(),
  owner_email: z.string().email("Invalid email").optional(),
  city: z.string().max(50).optional(),
  logo_url: z.string().url("Invalid URL").optional(),
  primary_color: z.string().regex(/^#[0-9A-F]{6}$/, "Invalid color format").optional(),
  secondary_color: z.string().regex(/^#[0-9A-F]{6}$/, "Invalid color format").optional(),
  plan: z.enum(["basic", "premium", "enterprise"]).default("basic")
});

export const branchSchema = z.object({
  nameAr: z.string().min(2, "Arabic name required").max(100),
  nameEn: z.string().min(2, "English name required").max(100),
  branchCode: z.string().min(2, "Branch code required").max(50).optional(),
  principalName: z.string().max(100).optional(),
  phoneNumber: z.string().max(20).optional(),
  addressAr: z.string().max(255).optional(),
  addressEn: z.string().max(255).optional()
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Safely parse data with a schema
 * Returns parsed data or null with error details
 */
export function safeValidate<T>(
  schema: z.ZodSchema,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors: Record<string, string> = {};
    result.error.issues.forEach((issue) => {
      const path = issue.path.join(".");
      errors[path || "root"] = issue.message;
    });
    return { success: false, errors };
  }

  return { success: true, data: result.data as T };
}

/**
 * Extract validation error message for API response
 */
export function getValidationError(error: unknown): string {
  if (error instanceof z.ZodError) {
    const firstError = error.issues[0];
    return firstError?.message || "Validation failed";
  }
  return "Validation failed";
}
