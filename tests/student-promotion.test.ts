import { describe, expect, it } from "vitest";

import {
  buildStudentPromotionPlan,
  promoteClassName,
} from "@/lib/students/promotion";

describe("student promotion helpers", () => {
  it("promotes common Arabic class labels", () => {
    expect(promoteClassName("الصف الأول")).toMatchObject({
      promoted: true,
      nextClassName: "الصف الثاني",
    });
  });

  it("promotes numeric grade labels", () => {
    expect(promoteClassName("Grade 5 - A")).toMatchObject({
      promoted: true,
      nextClassName: "Grade 6 - A",
    });
  });

  it("keeps terminal classes without promotion", () => {
    expect(promoteClassName("الثاني عشر")).toMatchObject({
      promoted: false,
      reason: "terminal",
    });
  });

  it("builds a promotion plan with promoted and skipped students", () => {
    const plan = buildStudentPromotionPlan([
      { id: "1", class_name: "الأول" },
      { id: "2", class_name: "الثاني عشر" },
      { id: "3", class_name: "برنامج خاص" },
    ]);

    expect(plan.summary).toMatchObject({
      promotedCount: 1,
      skippedCount: 2,
      terminalCount: 1,
      unrecognizedCount: 1,
    });
    expect(plan.updates[0]).toMatchObject({
      id: "1",
      fromClassName: "الأول",
      toClassName: "الثاني",
    });
  });
});
