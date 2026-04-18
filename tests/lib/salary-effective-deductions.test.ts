import { describe, expect, it } from "vitest";

import {
  applyEffectiveSalaryDeductions,
  buildAdditionalDeductionsIndex,
  calculateNetSalary,
} from "@/lib/salaries/effective-deductions";

describe("salary effective deductions", () => {
  it("aggregates deductions by teacher and month", () => {
    const index = buildAdditionalDeductionsIndex([
      { teacher_id: "teacher-1", amount: 25, deduction_date: "2026-04-02" },
      { teacher_id: "teacher-1", amount: "10", deduction_date: "2026-04-10" },
      { teacher_id: "teacher-1", amount: 7, deduction_date: "2026-05-01" },
    ]);

    expect(index.get("teacher-1:2026-04")).toBe(35);
    expect(index.get("teacher-1:2026-05")).toBe(7);
  });

  it("adds manual deductions table values on top of stored salary deductions", () => {
    const salaries = applyEffectiveSalaryDeductions(
      [
        { teacher_id: "teacher-1", month: "2026-04", gross_salary: 1000, deductions: 50 },
        { teacher_id: "teacher-2", month: "2026-04", gross_salary: 800, deductions: 0 },
      ],
      buildAdditionalDeductionsIndex([
        { teacher_id: "teacher-1", amount: 25, deduction_date: "2026-04-03" },
        { teacher_id: "teacher-1", amount: 10, deduction_date: "2026-04-12" },
      ]),
    );

    expect(salaries[0]?.deductions).toBe(85);
    expect(calculateNetSalary(salaries[0]?.gross_salary, salaries[0]?.deductions)).toBe(915);
    expect(salaries[1]?.deductions).toBe(0);
  });
});
