import { describe, expect, it } from "vitest";

import {
  ALLOWED_PAYMENT_METHODS,
  buildEditedArchiveSnapshot,
  sanitizeArchivePayments,
  sanitizeArchiveStudents,
} from "@/lib/payments/archive-edit";

const NOW = "2026-01-01T00:00:00.000Z";

describe("sanitizeArchiveStudents", () => {
  it("recomputes remaining_fee as total - paid - discount (matching the live generated column)", () => {
    const [s] = sanitizeArchiveStudents([
      { id: "a", full_name: "Ali", class_name: "1", total_fee: 100000, paid_fee: 30000, discount_value: 20000, status: "active" },
    ]);
    expect(s.remaining_fee).toBe(50000);
  });

  it("floors remaining_fee at 0 when paid + discount exceed total", () => {
    const [s] = sanitizeArchiveStudents([{ total_fee: 100, paid_fee: 80, discount_value: 50 }]);
    expect(s.remaining_fee).toBe(0);
  });

  it("coerces negative/garbage numeric fields to 0 and non-strings to empty", () => {
    const [s] = sanitizeArchiveStudents([
      { total_fee: -500, paid_fee: "abc", discount_value: null, full_name: 123, id: undefined },
    ]);
    expect(s.total_fee).toBe(0);
    expect(s.paid_fee).toBe(0);
    expect(s.discount_value).toBe(0);
    expect(s.full_name).toBe("");
    expect(s.id).toBe("");
    expect(s.remaining_fee).toBe(0);
  });

  it("truncates over-long strings", () => {
    const [s] = sanitizeArchiveStudents([{ full_name: "x".repeat(500) }]);
    expect(s.full_name.length).toBe(200);
  });
});

describe("sanitizeArchivePayments", () => {
  it("whitelists payment_method, falling back to cash for unknown values", () => {
    const rows = sanitizeArchivePayments(
      [{ payment_method: "cash" }, { payment_method: "bank_transfer" }, { payment_method: "crypto" }, {}],
      NOW,
    );
    expect(rows.map((r) => r.payment_method)).toEqual(["cash", "bank_transfer", "cash", "cash"]);
    rows.forEach((r) => expect(ALLOWED_PAYMENT_METHODS.has(r.payment_method)).toBe(true));
  });

  it("uses the fallback date when created_at is missing", () => {
    const [r] = sanitizeArchivePayments([{ amount: 100 }], NOW);
    expect(r.created_at).toBe(NOW);
  });

  it("preserves a provided created_at and coerces amount to an integer", () => {
    const [r] = sanitizeArchivePayments([{ amount: "2500.7", created_at: "2025-05-05T10:00:00.000Z" }], NOW);
    expect(r.amount).toBe(2500);
    expect(r.created_at).toBe("2025-05-05T10:00:00.000Z");
  });
});

describe("buildEditedArchiveSnapshot", () => {
  it("recomputes totals from the edited rows", () => {
    const { snapshot, totals } = buildEditedArchiveSnapshot({
      archiveYear: 2026,
      existingSummary: { student_promotion: { promoted: 3 } },
      students: [{ id: "a" }, { id: "b" }],
      payments: [{ amount: 100000 }, { amount: 50000 }],
      now: NOW,
    });
    expect(totals).toEqual({ total_students: 2, total_payments: 2, total_amount: 150000 });
    expect(snapshot.summary.total_amount).toBe(150000);
    expect(snapshot.year).toBe(2026);
  });

  it("preserves the existing student_promotion summary", () => {
    const { snapshot } = buildEditedArchiveSnapshot({
      archiveYear: 2026,
      existingSummary: { student_promotion: { promoted: 7 } },
      students: [],
      payments: [],
      now: NOW,
    });
    expect(snapshot.summary.student_promotion).toEqual({ promoted: 7 });
  });

  it("handles empty arrays and a null summary (zeroed totals, null promotion)", () => {
    const { snapshot, totals } = buildEditedArchiveSnapshot({
      archiveYear: 2025,
      existingSummary: null,
      students: [],
      payments: [],
      now: NOW,
    });
    expect(totals).toEqual({ total_students: 0, total_payments: 0, total_amount: 0 });
    expect(snapshot.summary.student_promotion).toBeNull();
  });
});
