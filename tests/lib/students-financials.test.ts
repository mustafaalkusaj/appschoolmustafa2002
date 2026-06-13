import { describe, expect, it } from "vitest";

import {
  buildResolvedStudentFinancials,
  calculateStudentPaidPercentage,
  calculateStudentRemainingFee,
  resolveStudentFeeTotal,
} from "@/lib/students/financials";

describe("student financials", () => {
  it("calculates remaining fees after discount", () => {
    expect(
      calculateStudentRemainingFee({
        total_fee: 1000,
        paid_fee: 400,
        discount_value: 200,
      }),
    ).toBe(400);
  });

  it("calculates paid percentage against fees after discount", () => {
    expect(
      calculateStudentPaidPercentage({
        total_fee: 1000,
        paid_fee: 400,
        discount_value: 200,
      }),
    ).toBe(50);
  });

  it("returns zero paid percentage when fees are fully discounted", () => {
    expect(
      calculateStudentPaidPercentage({
        total_fee: 1000,
        paid_fee: 0,
        discount_value: 1000,
      }),
    ).toBe(0);
  });

  it("prefers class fee totals over stored student totals", () => {
    expect(resolveStudentFeeTotal(0, 1_250_000)).toBe(1_250_000);
  });

  it("falls back to the student total fee when no class fee is configured", () => {
    expect(resolveStudentFeeTotal(900_000, 0)).toBe(900_000);
  });

  it("builds resolved financials using the shared fee resolution logic", () => {
    expect(
      buildResolvedStudentFinancials(
        {
          total_fee: 0,
          paid_fee: 250_000,
          discount_value: 0,
        },
        1_250_000,
      ),
    ).toMatchObject({
      total_fee: 1_250_000,
      paid_fee: 250_000,
      discount_value: 0,
      resolved_total_fee: 1_250_000,
      remaining_fee: 1_000_000,
    });
  });
});
