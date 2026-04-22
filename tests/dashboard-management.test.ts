import { describe, expect, it } from "vitest";

import {
  buildLegacyDashboardSections,
  hasDuplicateDashboardFeeClass,
  hasDuplicateDashboardSection,
  normalizeDashboardEntityName,
  resolveCanonicalDashboardClassName,
} from "@/app/[locale]/dashboard/_hooks/dashboardManagement";

describe("dashboardManagement helpers", () => {
  it("normalizes repeated whitespace in dashboard entity names", () => {
    expect(normalizeDashboardEntityName("  الصف    الأول  ")).toBe("الصف الأول");
  });

  it("resolves canonical class names from the available list", () => {
    expect(
      resolveCanonicalDashboardClassName(" الصف الأول ", ["الصف الأول", "الصف الثاني"]),
    ).toBe("الصف الأول");
  });

  it("detects duplicate fee classes after normalization", () => {
    expect(
      hasDuplicateDashboardFeeClass(
        [
          {
            id: "fee-1",
            class_name: "الصف الأول",
            total_fee: 100,
            installments: 4,
            installment_amount: 25,
            notes: "",
            created_at: "",
          },
        ],
        "  الصف   الأول  ",
      ),
    ).toBe(true);
  });

  it("ignores the current fee while editing", () => {
    expect(
      hasDuplicateDashboardFeeClass(
        [
          {
            id: "fee-1",
            class_name: "الصف الأول",
            total_fee: 100,
            installments: 4,
            installment_amount: 25,
            notes: "",
            created_at: "",
          },
        ],
        "الصف الأول",
        "fee-1",
      ),
    ).toBe(false);
  });

  it("detects duplicate section names inside the same class", () => {
    expect(
      hasDuplicateDashboardSection(
        [
          { id: "section-1", class_id: "legacy:الصف الأول", name: "أ" },
          { id: "section-2", class_id: "legacy:الصف الثاني", name: "أ" },
        ],
        "legacy:الصف الأول",
        " أ ",
      ),
    ).toBe(true);
  });

  it("allows the same section label in a different class", () => {
    expect(
      hasDuplicateDashboardSection(
        [
          { id: "section-1", class_id: "legacy:الصف الأول", name: "أ" },
          { id: "section-2", class_id: "legacy:الصف الثاني", name: "أ" },
        ],
        "legacy:الصف الثالث",
        "أ",
      ),
    ).toBe(false);
  });

  it("keeps legacy section inserts non-null when sections are optional", () => {
    expect(buildLegacyDashboardSections(["", "   "])).toEqual([""]);
  });

  it("normalizes and deduplicates legacy section inserts", () => {
    expect(buildLegacyDashboardSections([" أ ", "ب", "أ", ""])).toEqual(["أ", "ب"]);
  });
});
