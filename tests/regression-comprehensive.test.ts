import { describe, expect, it } from "vitest";

import {
  createPaymentSchema,
  expenseMutationSchema,
  expenseTypeMutationSchema,
  salaryPaymentSchema,
} from "@/lib/api-schemas";

// ── Helpers ───────────────────────────────────────────────────────────────────

const SCHOOL_ID = "11111111-1111-4111-8111-111111111111";
const STUDENT_ID = "22222222-2222-4222-8222-222222222222";
const TEACHER_ID = "33333333-3333-4333-8333-333333333333";
const EXPENSE_TYPE_ID = "44444444-4444-4444-8444-444444444444";

// ── createPaymentSchema — large number regression ─────────────────────────────

describe("createPaymentSchema — large number amounts", () => {
  it("accepts amount 9_999_999 and coerces it to a number", () => {
    const result = createPaymentSchema.safeParse({
      school_id: SCHOOL_ID,
      student_id: STUDENT_ID,
      amount: 9_999_999,
      payment_method: "cash",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(9_999_999);
    }
  });

  it("accepts amount 9_999_999 supplied as a string and coerces correctly", () => {
    const result = createPaymentSchema.safeParse({
      school_id: SCHOOL_ID,
      student_id: STUDENT_ID,
      amount: "9999999",
      payment_method: "cash",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(9_999_999);
    }
  });

  it("accepts fractional amount 0.01", () => {
    const result = createPaymentSchema.safeParse({
      school_id: SCHOOL_ID,
      student_id: STUDENT_ID,
      amount: 0.01,
      payment_method: "cash",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBeCloseTo(0.01);
    }
  });

  it("rejects amount 0 (must be strictly positive)", () => {
    const result = createPaymentSchema.safeParse({
      school_id: SCHOOL_ID,
      student_id: STUDENT_ID,
      amount: 0,
      payment_method: "cash",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative amount", () => {
    const result = createPaymentSchema.safeParse({
      school_id: SCHOOL_ID,
      student_id: STUDENT_ID,
      amount: -100,
      payment_method: "cash",
    });
    expect(result.success).toBe(false);
  });
});

// ── salaryPaymentSchema — month format regression ─────────────────────────────

describe("salaryPaymentSchema — month format", () => {
  const base = {
    school_id: SCHOOL_ID,
    teacher_id: TEACHER_ID,
    gross_salary: 500_000,
    deductions: 0,
  };

  it("accepts '2026-01' (zero-padded January)", () => {
    const result = salaryPaymentSchema.safeParse({ ...base, month: "2026-01" });
    expect(result.success).toBe(true);
  });

  it("accepts '2026-12' (December)", () => {
    const result = salaryPaymentSchema.safeParse({ ...base, month: "2026-12" });
    expect(result.success).toBe(true);
  });

  it("rejects '2026-1' (single-digit month)", () => {
    const result = salaryPaymentSchema.safeParse({ ...base, month: "2026-1" });
    expect(result.success).toBe(false);
  });

  it("rejects '2026-13' (invalid month 13)", () => {
    const result = salaryPaymentSchema.safeParse({ ...base, month: "2026-13" });
    expect(result.success).toBe(false);
  });

  it("rejects '26-01' (2-digit year)", () => {
    const result = salaryPaymentSchema.safeParse({ ...base, month: "26-01" });
    expect(result.success).toBe(false);
  });

  it("rejects '2026-00' (month 00 is invalid)", () => {
    const result = salaryPaymentSchema.safeParse({ ...base, month: "2026-00" });
    expect(result.success).toBe(false);
  });

  it("rejects empty string month", () => {
    const result = salaryPaymentSchema.safeParse({ ...base, month: "" });
    expect(result.success).toBe(false);
  });
});

// ── expenseMutationSchema — expense_date format regression ────────────────────

describe("expenseMutationSchema — expense_date format", () => {
  const base = {
    school_id: SCHOOL_ID,
    expense_type_id: EXPENSE_TYPE_ID,
    amount: 1000,
  };

  it("accepts '2026-04-03' (YYYY-MM-DD)", () => {
    const result = expenseMutationSchema.safeParse({
      ...base,
      expense_date: "2026-04-03",
    });
    expect(result.success).toBe(true);
  });

  it("rejects '04-03-2026' (MM-DD-YYYY format)", () => {
    const result = expenseMutationSchema.safeParse({
      ...base,
      expense_date: "04-03-2026",
    });
    expect(result.success).toBe(false);
  });

  it("rejects '2026/04/03' (slash-separated)", () => {
    const result = expenseMutationSchema.safeParse({
      ...base,
      expense_date: "2026/04/03",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty expense_date", () => {
    const result = expenseMutationSchema.safeParse({
      ...base,
      expense_date: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a date with a time component appended", () => {
    const result = expenseMutationSchema.safeParse({
      ...base,
      expense_date: "2026-04-03T00:00:00Z",
    });
    expect(result.success).toBe(false);
  });
});

// ── Notes/text trimming regression ───────────────────────────────────────────

describe("optionalTrimmedString trimming regression (via createPaymentSchema.notes)", () => {
  const base = {
    school_id: SCHOOL_ID,
    student_id: STUDENT_ID,
    amount: 1000,
    payment_method: "cash" as const,
  };

  it("collapses notes containing only spaces to null", () => {
    const result = createPaymentSchema.safeParse({
      ...base,
      notes: "     ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBeNull();
    }
  });

  it("trims leading/trailing spaces from Arabic notes", () => {
    const result = createPaymentSchema.safeParse({
      ...base,
      notes: "   دفعة شهر رمضان   ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBe("دفعة شهر رمضان");
    }
  });

  it("treats null notes as null", () => {
    const result = createPaymentSchema.safeParse({
      ...base,
      notes: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBeNull();
    }
  });

  it("treats omitted notes as null", () => {
    const result = createPaymentSchema.safeParse({ ...base });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBeNull();
    }
  });
});

describe("optionalTrimmedString trimming regression (via expenseTypeMutationSchema.notes)", () => {
  const base = {
    school_id: SCHOOL_ID,
    name: "مصاريف تشغيل",
  };

  it("collapses whitespace-only notes to null", () => {
    const result = expenseTypeMutationSchema.safeParse({
      ...base,
      notes: "   \t   ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBeNull();
    }
  });

  it("preserves Arabic text with internal spaces after trimming edges", () => {
    const result = expenseTypeMutationSchema.safeParse({
      ...base,
      notes: "  مصاريف متنوعة للفرع الرئيسي  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBe("مصاريف متنوعة للفرع الرئيسي");
    }
  });
});
