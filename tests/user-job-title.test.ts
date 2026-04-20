import { describe, expect, it } from "vitest";

import { JOB_TITLE_MAX_LENGTH, normalizeJobTitle } from "@/lib/users/job-title";

describe("normalizeJobTitle", () => {
  it("returns null for empty values", () => {
    expect(normalizeJobTitle("")).toBeNull();
    expect(normalizeJobTitle("   ")).toBeNull();
    expect(normalizeJobTitle(null)).toBeNull();
  });

  it("trims and collapses spaces", () => {
    expect(normalizeJobTitle("  مسؤول   حضور  ")).toBe("مسؤول حضور");
  });

  it("caps the title length", () => {
    const longTitle = "أ".repeat(JOB_TITLE_MAX_LENGTH + 50);
    expect(normalizeJobTitle(longTitle)).toHaveLength(JOB_TITLE_MAX_LENGTH);
  });
});
