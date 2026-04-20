import { describe, expect, it } from "vitest";

import { findJobTitlePresetById, JOB_TITLE_PRESETS } from "@/lib/users/job-title-presets";

describe("job title presets", () => {
  it("defines the accountant preset with finance-focused access", () => {
    expect(findJobTitlePresetById("accountant")).toMatchObject({
      role: "admin",
      jobTitle: "محاسب",
      allowedPages: ["payments", "expenses", "reports"],
    });
  });

  it("keeps the attendance officer focused on a single page", () => {
    expect(findJobTitlePresetById("attendance-officer")).toMatchObject({
      role: "employee",
      allowedPages: ["attendance"],
    });
  });

  it("ensures every preset carries at least one permission and one page", () => {
    expect(JOB_TITLE_PRESETS.every((preset) => preset.permissions.length > 0 && preset.allowedPages.length > 0)).toBe(
      true,
    );
  });
});
