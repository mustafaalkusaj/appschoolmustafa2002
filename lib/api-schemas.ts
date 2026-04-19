import { z } from "zod";

const uuidMessage = "المعرّف المرسل غير صالح.";
const moneyMessage = "أدخل قيمة رقمية صحيحة أكبر من أو تساوي صفراً.";
const canonicalEntityIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function entityIdSchema() {
  return z.string().trim().regex(canonicalEntityIdPattern, uuidMessage);
}

function optionalTrimmedString(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .nullable()
    .transform((value) => {
      if (typeof value !== "string") {
        return null;
      }

      const normalized = value.trim();
      return normalized.length > 0 ? normalized : null;
    });
}

function positiveMoney(fieldLabel: string) {
  return z.coerce
    .number({
      error: `${fieldLabel} يجب أن يكون رقماً صالحاً.`,
    })
    .finite(`${fieldLabel} يجب أن يكون رقماً صالحاً.`)
    .positive(`${fieldLabel} يجب أن يكون أكبر من صفر.`);
}

function nonNegativeMoney(fieldLabel: string) {
  return z.coerce
    .number({
      error: `${fieldLabel} يجب أن يكون رقماً صالحاً.`,
    })
    .finite(`${fieldLabel} يجب أن يكون رقماً صالحاً.`)
    .min(0, moneyMessage);
}

function optionalIsoDateTime(fieldLabel: string) {
  return z
    .string()
    .trim()
    .max(64)
    .optional()
    .nullable()
    .superRefine((value, ctx) => {
      if (!value) {
        return;
      }

      if (Number.isNaN(new Date(value).getTime())) {
        ctx.addIssue({
          code: "custom",
          message: `${fieldLabel} غير صالح.`,
        });
      }
    })
    .transform((value) => {
      if (!value) {
        return null;
      }

      return new Date(value).toISOString();
    });
}

function optionalDateOnly(fieldLabel: string) {
  return z
    .string()
    .trim()
    .max(32)
    .optional()
    .nullable()
    .superRefine((value, ctx) => {
      if (!value) {
        return;
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        ctx.addIssue({
          code: "custom",
          message: `${fieldLabel} يجب أن يكون بالصيغة YYYY-MM-DD.`,
        });
      }
    })
    .transform((value) => {
      if (!value) {
        return null;
      }

      return value;
    });
}

export const loginRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .max(320)
    .email("أدخل بريداً إلكترونياً صحيحاً.")
    .transform((value) => value.toLowerCase()),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل.").max(256),
});

export const forgotPasswordRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .max(320)
    .email("أدخل بريداً إلكترونياً صحيحاً.")
    .transform((value) => value.toLowerCase()),
  locale: z.enum(["ar", "en"]).default("ar"),
});

export const createPaymentSchema = z.object({
  school_id: entityIdSchema(),
  student_id: entityIdSchema(),
  amount: positiveMoney("المبلغ"),
  payment_method: z.enum(["cash", "bank_transfer", "check"]).default("cash"),
  notes: optionalTrimmedString(1000),
  receipt_date: optionalIsoDateTime("تاريخ السند"),
  receipt_number: optionalTrimmedString(80),
  manual_receipt_number: optionalTrimmedString(80),
  branch_id: entityIdSchema().optional().nullable(),
});

export const deletePaymentSchema = z.object({
  school_id: entityIdSchema(),
});

export const schoolScopedDeleteSchema = z.object({
  school_id: entityIdSchema(),
});

export const salaryPaymentSchema = z
  .object({
    school_id: entityIdSchema(),
    teacher_id: entityIdSchema(),
    branch_id: entityIdSchema().optional().nullable(),
    month: z
      .string()
      .trim()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "الشهر يجب أن يكون بالصيغة YYYY-MM."),
    gross_salary: nonNegativeMoney("إجمالي الراتب"),
    deductions: nonNegativeMoney("الخصومات"),
    notes: optionalTrimmedString(1000),
  })
  .superRefine((value, ctx) => {
    if (value.deductions > value.gross_salary) {
      ctx.addIssue({
        code: "custom",
        path: ["deductions"],
        message: "الخصومات لا يمكن أن تكون أكبر من إجمالي الراتب.",
      });
    }
  });

export const dashboardOverviewQuerySchema = z.object({
  schoolId: entityIdSchema(),
});

export const expensesListQuerySchema = z
  .object({
    schoolId: entityIdSchema(),
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(120).optional().default(""),
    expenseTypeId: entityIdSchema().optional().nullable(),
    fromDate: optionalDateOnly("من تاريخ"),
    toDate: optionalDateOnly("إلى تاريخ"),
  })
  .superRefine((value, ctx) => {
    if (value.fromDate && value.toDate && value.fromDate > value.toDate) {
      ctx.addIssue({
        code: "custom",
        path: ["toDate"],
        message: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية.",
      });
    }
  });

export const expenseMutationSchema = z.object({
  school_id: entityIdSchema(),
  expense_type_id: entityIdSchema(),
  amount: positiveMoney("المبلغ"),
  expense_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ المصروف يجب أن يكون بالصيغة YYYY-MM-DD."),
  recipient: optionalTrimmedString(160),
  receipt_number: optionalTrimmedString(120),
  notes: optionalTrimmedString(1000),
});

export const expenseTypesListQuerySchema = z.object({
  schoolId: entityIdSchema(),
  search: z.string().trim().max(120).optional().default(""),
});

export const expenseTypeMutationSchema = z.object({
  school_id: entityIdSchema(),
  name: z.string().trim().min(1, "اسم النوع مطلوب.").max(120, "اسم النوع طويل جداً."),
  notes: optionalTrimmedString(1000),
});

