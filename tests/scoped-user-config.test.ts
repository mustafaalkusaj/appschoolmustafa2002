import { describe, expect, it } from "vitest";

import {
  ScopedUserConfigError,
  resolveScopedUserConfig,
} from "@/lib/authorization/scoped-user-config";

describe("resolveScopedUserConfig", () => {
  it("forces super admin users into global scope", () => {
    expect(
      resolveScopedUserConfig({
        role: "super_admin",
        schoolId: "school-1",
        branchId: "branch-1",
        scopeLevel: "restricted",
        allowedPages: ["students"],
        permissions: ["full_access"],
      }),
    ).toMatchObject({
      schoolId: null,
      branchId: null,
      scopeLevel: "super_admin",
      isSinglePageUser: false,
      allowedPages: [],
    });
  });

  it("builds focused page grants for a restricted branch user", () => {
    expect(
      resolveScopedUserConfig({
        role: "employee",
        schoolId: "school-1",
        branchId: "branch-1",
        scopeLevel: "restricted",
        allowedPages: ["students", "accounts"],
        permissions: ["view_students", "add_students", "view_payments", "add_payments"],
      }),
    ).toMatchObject({
      schoolId: "school-1",
      branchId: "branch-1",
      defaultBranchId: "branch-1",
      scopeLevel: "restricted",
      isSinglePageUser: true,
      allowedPages: ["students", "payments"],
      allowedModule: "students",
    });
  });

  it("rejects restricted users without a branch", () => {
    expect(() =>
      resolveScopedUserConfig({
        role: "employee",
        schoolId: "school-1",
        scopeLevel: "restricted",
        allowedPages: ["students"],
        permissions: ["view_students"],
      }),
    ).toThrow(ScopedUserConfigError);
  });

  it("rejects dashboard as a focused page", () => {
    expect(() =>
      resolveScopedUserConfig({
        role: "admin",
        schoolId: "school-1",
        branchId: "branch-1",
        scopeLevel: "restricted",
        allowedPages: ["dashboard"],
        permissions: ["full_access"],
      }),
    ).toThrow("لا تصلح كمجال مقيّد");
  });
});
