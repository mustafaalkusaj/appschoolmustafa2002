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
    .min(1, "أدخل معرّف الدخول أو البريد الإلكتروني.")
    .max(320)
    .transform((value) => {
      const lower = value.toLowerCase();
      return lower.includes("@") ? lower : `${lower}@schoolapp.local`;
    }),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل.").max(256),
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
  branchId: entityIdSchema().optional().nullable(),
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
  branch_id: entityIdSchema().optional().nullable(),
  expense_type_id: entityIdSchema(),
  amount: positiveMoney("المبلغ"),
  expense_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ المصروف يجب أن يكون بالصيغة YYYY-MM-DD."),
  recipient: optionalTrimmedString(160),
  receipt_number: optionalTrimmedString(120),
  notes: optionalTrimmedString(1000),
  receipt_image_url: z.string().url().max(2048).optional().nullable(),
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

// ── Incomes ──────────────────────────────────────────────────────────────────

export const incomesListQuerySchema = z
  .object({
    schoolId: entityIdSchema(),
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(120).optional().default(""),
    incomeTypeId: entityIdSchema().optional().nullable(),
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

export const incomeMutationSchema = z.object({
  school_id: entityIdSchema(),
  branch_id: entityIdSchema().optional().nullable(),
  income_type_id: entityIdSchema(),
  amount: positiveMoney("المبلغ"),
  income_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ الإيراد يجب أن يكون بالصيغة YYYY-MM-DD."),
  source: optionalTrimmedString(160),
  receipt_number: optionalTrimmedString(120),
  notes: optionalTrimmedString(1000),
  receipt_image_url: z.string().url().max(2048).optional().nullable(),
});

export const incomeTypesListQuerySchema = z.object({
  schoolId: entityIdSchema(),
  search: z.string().trim().max(120).optional().default(""),
});

export const incomeTypeMutationSchema = z.object({
  school_id: entityIdSchema(),
  name: z.string().trim().min(1, "اسم النوع مطلوب.").max(120, "اسم النوع طويل جداً."),
  notes: optionalTrimmedString(1000),
});

// ── Teacher Attendance ────────────────────────────────────────────────────────

export const teacherAttendanceRecordSchema = z.object({
  teacher_id: z.string().uuid("معرّف الأستاذ غير صالح."),
  status: z.enum(["present", "absent", "late", "excused", "holiday"]),
  check_in_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "وقت الحضور يجب أن يكون بالصيغة HH:MM.")
    .optional()
    .nullable(),
  check_out_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "وقت الانصراف يجب أن يكون بالصيغة HH:MM.")
    .optional()
    .nullable(),
  notes: z.string().max(500, "الملاحظات يجب أن تكون أقل من 500 حرف.").optional().nullable(),
});

export const teacherAttendanceBulkSchema = z.object({
  schoolId: entityIdSchema(),
  branchId: entityIdSchema().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "التاريخ يجب أن يكون بالصيغة YYYY-MM-DD."),
  records: z
    .array(teacherAttendanceRecordSchema)
    .min(1, "يجب إرسال سجل واحد على الأقل.")
    .max(200, "لا يمكن حفظ أكثر من 200 سجل في المرة الواحدة."),
});

export const teacherAttendancePatchSchema = z.object({
  school_id: entityIdSchema(),
  status: z.enum(["present", "absent", "late", "excused", "holiday"]).optional(),
  check_in_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "وقت الحضور يجب أن يكون بالصيغة HH:MM.")
    .optional()
    .nullable(),
  check_out_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "وقت الانصراف يجب أن يكون بالصيغة HH:MM.")
    .optional()
    .nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const attendanceSettingsSchema = z.object({
  school_id: entityIdSchema(),
  branch_id: entityIdSchema().optional().nullable(),
  work_start_time: z.string().regex(/^\d{2}:\d{2}$/, "وقت بدء العمل يجب أن يكون بالصيغة HH:MM."),
  work_end_time: z.string().regex(/^\d{2}:\d{2}$/, "وقت انتهاء العمل يجب أن يكون بالصيغة HH:MM."),
  late_threshold_minutes: z.number().int().min(1).max(120),
  work_days: z
    .array(z.enum(["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]))
    .min(1, "يجب تحديد يوم عمل واحد على الأقل."),
  absent_deduction_type: z.enum(["none", "fixed", "daily_rate"]),
  absent_deduction_amount: z.number().min(0).optional().nullable(),
  late_deduction_type: z.enum(["none", "fixed", "per_minute"]),
  late_deduction_amount: z.number().min(0).optional().nullable(),
  max_late_days_before_absent: z.number().int().min(1).max(30),
});
