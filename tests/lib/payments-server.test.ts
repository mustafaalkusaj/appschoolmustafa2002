import { describe, expect, it } from "vitest";

import { pickAuthoritativePaidFee, sumPaymentAmounts } from "@/lib/payments-server";

describe("payments server helpers", () => {
  it("sums recorded payment rows", () => {
    expect(sumPaymentAmounts([{ amount: 125 }, { amount: "75" }, { amount: null }])).toBe(200);
  });

  it("prefers recorded payments over manual paid fee", () => {
    expect(pickAuthoritativePaidFee([{ amount: 300 }, { amount: 150 }], 50)).toBe(450);
  });

  it("falls back to stored paid fee when no payments exist", () => {
    expect(pickAuthoritativePaidFee([], 275)).toBe(275);
  });
});
