import { describe, expect, it } from "vitest";

import {
  filterAllowedPageCodes,
  getPathForPageCode,
  isPagePathAllowed,
  normalizePageCode,
  resolvePageCodeFromPath,
} from "@/lib/authorization/page-access";

describe("page access helpers", () => {
  it("normalizes legacy aliases to canonical page codes", () => {
    expect(normalizePageCode("accounts")).toBe("payments");
    expect(normalizePageCode("super_admin")).toBe("super-admin");
    expect(normalizePageCode("fee_notifications")).toBe("fee-notifications");
  });

  it("filters and deduplicates allowed page codes", () => {
    expect(filterAllowedPageCodes(["students", "accounts", "students", "unknown"])).toEqual([
      "students",
      "payments",
    ]);
  });

  it("resolves nested routes back to their page code", () => {
    expect(resolvePageCodeFromPath("/ar/students/123")).toBe("students");
    expect(resolvePageCodeFromPath("/en/super-admin/users")).toBe("super-admin");
    expect(resolvePageCodeFromPath("/unknown")).toBeNull();
  });

  it("checks whether a route is inside the allowed page scope", () => {
    expect(isPagePathAllowed("/ar/payments/records", ["payments"])).toBe(true);
    expect(isPagePathAllowed("/ar/dashboard", ["payments"])).toBe(false);
  });

  it("returns the canonical path for a page code", () => {
    expect(getPathForPageCode("students")).toBe("/students");
    expect(getPathForPageCode("accounts")).toBe("/payments");
  });
});
