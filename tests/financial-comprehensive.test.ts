import { describe, expect, it } from "vitest";

import {
  createPaymentSchema,
  salaryPaymentSchema,
  expenseMutationSchema,
  expensesListQuerySchema,
} from "@/lib/api-schemas";
import { parsePaymentsListFilters } from "@/lib/payments/overview";

// ── Shared test UUIDs ────────────────────────────────────────────────────────

const UUID_A = "11111111-1111-1111-1111-111111111111";
const UUID_B = "22222222-2222-2222-2222-222222222222";

// ── createPaymentSchema ──────────────────────────────────────────────────────

describe("createPaymentSchema", () => {
  function basePayment(overrides: Record<string, unknown> = {}) {
    return {
      school_id: UUID_A,
      student_id: UUID_B,
      amount: 1000,
      payment_method: "cash",
      ...overrides,
    };
  }

  it('coerces amount string "15000" to number 15000', () => {
    const result = createPaymentSchema.safeParse(basePayment({ amount: "15000" }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(15000);
      expect(typeof result.data.amount).toBe("number");
    }
  });

  it('trims notes "  دفعة  " to "دفعة"', () => {
    const result = createPaymentSchema.safeParse(basePayment({ notes: "  دفعة  " }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBe("دفعة");
    }
  });

  it('rejects payment_method "bitcoin"', () => {
    const result = createPaymentSchema.safeParse(basePayment({ payment_method: "bitcoin" }));
    expect(result.success).toBe(false);
  });

  it('accepts payment_method "check"', () => {
    const result = createPaymentSchema.safeParse(basePayment({ payment_method: "check" }));
    expect(result.success).toBe(true);
  });

  it('accepts payment_method "cash"', () => {
    const result = createPaymentSchema.safeParse(basePayment({ payment_method: "cash" }));
    expect(result.success).toBe(true);
  });

  it('accepts payment_method "bank_transfer"', () => {
    const result = createPaymentSchema.safeParse(basePayment({ payment_method: "bank_transfer" }));
    expect(result.success).toBe(true);
  });

  it("rejects amount -100 (negative)", () => {
    const result = createPaymentSchema.safeParse(basePayment({ amount: -100 }));
    expect(result.success).toBe(false);
  });

  it("rejects amount 0 (zero not positive)", () => {
    const result = createPaymentSchema.safeParse(basePayment({ amount: 0 }));
    expect(result.success).toBe(false);
  });
});

// ── salaryPaymentSchema ──────────────────────────────────────────────────────

describe("salaryPaymentSchema", () => {
  function baseSalary(overrides: Record<string, unknown> = {}) {
    return {
      school_id: UUID_A,
      teacher_id: UUID_B,
      month: "2026-04",
      gross_salary: 5000,
      deductions: 0,
      ...overrides,
    };
  }

  it("accepts valid payload (gross=5000, deductions=200)", () => {
    const result = salaryPaymentSchema.safeParse(baseSalary({ deductions: 200 }));
    expect(result.success).toBe(true);
  });

  it("rejects when deductions > gross_salary", () => {
    const result = salaryPaymentSchema.safeParse(
      baseSalary({ gross_salary: 3000, deductions: 3500 }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("deductions");
    }
  });

  it('accepts month "2026-04"', () => {
    const result = salaryPaymentSchema.safeParse(baseSalary({ month: "2026-04" }));
    expect(result.success).toBe(true);
  });

  it('rejects month "April 2026" (wrong format)', () => {
    const result = salaryPaymentSchema.safeParse(baseSalary({ month: "April 2026" }));
    expect(result.success).toBe(false);
  });

  it('rejects month "2026-1" (single-digit month)', () => {
    const result = salaryPaymentSchema.safeParse(baseSalary({ month: "2026-1" }));
    expect(result.success).toBe(false);
  });

  it("rejects negative gross_salary", () => {
    const result = salaryPaymentSchema.safeParse(baseSalary({ gross_salary: -500 }));
    expect(result.success).toBe(false);
  });
});

// ── expenseMutationSchema ────────────────────────────────────────────────────

describe("expenseMutationSchema", () => {
  function baseExpense(overrides: Record<string, unknown> = {}) {
    return {
      school_id: UUID_A,
      expense_type_id: UUID_B,
      amount: 1000,
      expense_date: "2026-05-01",
      ...overrides,
    };
  }

  it('coerces amount string "2500.5" to 2500.5', () => {
    const result = expenseMutationSchema.safeParse(baseExpense({ amount: "2500.5" }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(2500.5);
      expect(typeof result.data.amount).toBe("number");
    }
  });

  it('trims recipient "  المورد  " to "المورد"', () => {
    const result = expenseMutationSchema.safeParse(baseExpense({ recipient: "  المورد  " }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.recipient).toBe("المورد");
    }
  });

  it('trims receipt_number "  R-1001 " to "R-1001"', () => {
    const result = expenseMutationSchema.safeParse(baseExpense({ receipt_number: "  R-1001 " }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.receipt_number).toBe("R-1001");
    }
  });

  it("rejects when expense_type_id is missing", () => {
    const { expense_type_id: _omitted, ...payload } = baseExpense() as Record<string, unknown>;
    const result = expenseMutationSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});

// ── expensesListQuerySchema ──────────────────────────────────────────────────

describe("expensesListQuerySchema", () => {
  it("defaults page=1 and pageSize=20 when only required schoolId is provided", () => {
    const result = expensesListQuerySchema.safeParse({ schoolId: UUID_A });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
    }
  });

  it("rejects pageSize=200 (exceeds max of 100)", () => {
    const result = expensesListQuerySchema.safeParse({ schoolId: UUID_A, pageSize: 200 });
    expect(result.success).toBe(false);
  });

  it("accepts pageSize=100 (at max boundary)", () => {
    const result = expensesListQuerySchema.safeParse({ schoolId: UUID_A, pageSize: 100 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pageSize).toBe(100);
    }
  });
});

// ── parsePaymentsListFilters ─────────────────────────────────────────────────

describe("parsePaymentsListFilters", () => {
  it('returns defaults when params are empty: page=1, quickFilter="all", sort="name", dir="asc"', () => {
    const params = new URLSearchParams();
    const filters = parsePaymentsListFilters(params);
    expect(filters.page).toBe(1);
    expect(filters.quickFilter).toBe("all");
    expect(filters.sort).toBe("name");
    expect(filters.dir).toBe("asc");
  });

  it('sets quickFilter="no_invoice" when param is "no_invoice"', () => {
    const params = new URLSearchParams({ quickFilter: "no_invoice" });
    const filters = parsePaymentsListFilters(params);
    expect(filters.quickFilter).toBe("no_invoice");
  });

  it("parses minFee=1000 and maxFee=5000 as numbers", () => {
    const params = new URLSearchParams({ minFee: "1000", maxFee: "5000" });
    const filters = parsePaymentsListFilters(params);
    expect(filters.minFee).toBe(1000);
    expect(filters.maxFee).toBe(5000);
  });
});
