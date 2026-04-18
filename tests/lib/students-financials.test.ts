import { describe, expect, it } from "vitest";

import { calculateStudentPaidPercentage, calculateStudentRemainingFee } from "@/lib/students/financials";

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
});
