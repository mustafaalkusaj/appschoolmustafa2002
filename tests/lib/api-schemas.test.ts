import { describe, expect, it } from "vitest";

import {
  createPaymentSchema,
  expenseMutationSchema,
  expensesListQuerySchema,
  expenseTypeMutationSchema,
  salaryPaymentSchema,
} from "@/lib/api-schemas";

describe("api schemas", () => {
  it("accepts a valid payment payload", () => {
    const result = createPaymentSchema.safeParse({
      school_id: "11111111-1111-4111-8111-111111111111",
      student_id: "22222222-2222-4222-8222-222222222222",
      amount: "15000",
      payment_method: "cash",
      notes: "  دفعة شهر نيسان  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(15000);
      expect(result.data.notes).toBe("دفعة شهر نيسان");
    }
  });

  it("rejects salary deductions greater than gross salary", () => {
    const result = salaryPaymentSchema.safeParse({
      school_id: "11111111-1111-4111-8111-111111111111",
      teacher_id: "33333333-3333-4333-8333-333333333333",
      month: "2026-04",
      gross_salary: 100,
      deductions: 150,
    });

    expect(result.success).toBe(false);
  });

  it("normalizes expense payloads", () => {
    const result = expenseMutationSchema.safeParse({
      school_id: "11111111-1111-4111-8111-111111111111",
      expense_type_id: "44444444-4444-4444-8444-444444444444",
      amount: "2500.5",
      expense_date: "2026-04-03",
      recipient: "  المورد الرئيسي ",
      receipt_number: "  R-1001 ",
      notes: "  شراء مواد  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(2500.5);
      expect(result.data.recipient).toBe("المورد الرئيسي");
      expect(result.data.receipt_number).toBe("R-1001");
    }
  });

  it("rejects invalid expenses query ranges", () => {
    const result = expensesListQuerySchema.safeParse({
      schoolId: "11111111-1111-4111-8111-111111111111",
      page: "2",
      pageSize: "20",
      fromDate: "2026-04-10",
      toDate: "2026-04-01",
    });

    expect(result.success).toBe(false);
  });

  it("requires non-empty expense type names", () => {
    const result = expenseTypeMutationSchema.safeParse({
      school_id: "11111111-1111-4111-8111-111111111111",
      name: "   ",
    });

    expect(result.success).toBe(false);
  });
});

