import { describe, expect, it } from "vitest";

import { buildSchoolManagerOverview } from "@/lib/school-manager/overview";

describe("school manager overview", () => {
  it("aggregates branch financial metrics using student balances and expenses", () => {
    const overview = buildSchoolManagerOverview({
      branches: [
        { id: "branch-a", name: "الفرع الأول" },
        { id: "branch-b", name: "الفرع الثاني" },
      ],
      students: [
        {
          branch_id: "branch-a",
          total_fee: 1_000,
          discount_value: 100,
          paid_fee: 500,
          remaining_fee: 400,
          status: "active",
        },
        {
          branch_id: "branch-a",
          total_fee: 600,
          discount_value: 0,
          paid_fee: 600,
          remaining_fee: 0,
          status: "active",
        },
        {
          branch_id: "branch-b",
          total_fee: 800,
          discount_value: 200,
          paid_fee: 200,
          remaining_fee: 400,
          status: "active",
        },
        {
          branch_id: "branch-b",
          total_fee: 999,
          discount_value: 0,
          paid_fee: 0,
          remaining_fee: 999,
          status: "deleted",
        },
      ],
      expenses: [
        { branch_id: "branch-a", amount: 90 },
        { branch_id: "branch-a", amount: 10 },
        { branch_id: "branch-b", amount: 50 },
      ],
      classFees: [],
    });

    expect(overview.branches).toHaveLength(2);
    expect(overview.branches[0]).toMatchObject({
      branchName: "الفرع الأول",
      studentsCount: 2,
      totalFeesBeforeDiscount: 1_600,
      totalDiscount: 100,
      totalFeesAfterDiscount: 1_500,
      totalPaid: 1_100,
      totalRemaining: 400,
      totalExpenses: 100,
      paidPercentage: 73,
    });
    expect(overview.branches[1]).toMatchObject({
      branchName: "الفرع الثاني",
      studentsCount: 1,
      totalFeesBeforeDiscount: 800,
      totalDiscount: 200,
      totalFeesAfterDiscount: 600,
      totalPaid: 200,
      totalRemaining: 400,
      totalExpenses: 50,
      paidPercentage: 33,
    });

    expect(overview.totals).toMatchObject({
      studentsCount: 3,
      totalFeesBeforeDiscount: 2_400,
      totalDiscount: 300,
      totalFeesAfterDiscount: 2_100,
      totalPaid: 1_300,
      totalRemaining: 800,
      totalExpenses: 150,
      paidPercentage: 62,
    });
  });

  it("keeps totals accurate by moving orphan records into a dedicated bucket", () => {
    const overview = buildSchoolManagerOverview({
      branches: [{ id: "branch-a", name: "الفرع الأول" }],
      students: [
        {
          branch_id: null,
          total_fee: 700,
          discount_value: 100,
          paid_fee: 300,
          remaining_fee: 300,
          status: "active",
        },
      ],
      expenses: [{ branch_id: null, amount: 25 }],
      classFees: [],
    });

    expect(overview.branches).toHaveLength(1);
    expect(overview.branches[0]).toMatchObject({
      branchId: "branch-a",
      branchName: "الفرع الأول",
      studentsCount: 0,
      totalFeesBeforeDiscount: 0,
      totalDiscount: 0,
      totalFeesAfterDiscount: 0,
      totalPaid: 0,
      totalRemaining: 0,
      totalExpenses: 0,
      paidPercentage: 0,
    });
    expect(overview.totals).toMatchObject({
      studentsCount: 1,
      totalFeesBeforeDiscount: 700,
      totalDiscount: 100,
      totalFeesAfterDiscount: 600,
      totalPaid: 300,
      totalRemaining: 300,
      totalExpenses: 25,
      paidPercentage: 50,
    });
    expect(overview.warnings[0]).toContain("غير مرتبطة");
  });

  it("preserves branch names when the source branches are provided by school scope", () => {
    const overview = buildSchoolManagerOverview({
      branches: [
        { id: "branch-a", name: "فرع الكرخ" },
        { id: "branch-b", name: "فرع الرصافة" },
      ],
      students: [
        {
          branch_id: "branch-a",
          total_fee: 400,
          discount_value: 0,
          paid_fee: 100,
          remaining_fee: 300,
          status: "active",
        },
      ],
      expenses: [],
      classFees: [],
    });

    expect(overview.branches.map((branch) => branch.branchName)).toEqual([
      "فرع الكرخ",
      "فرع الرصافة",
    ]);
    expect(overview.branches[0].studentsCount).toBe(1);
    expect(overview.branches[1].studentsCount).toBe(0);
  });
});
