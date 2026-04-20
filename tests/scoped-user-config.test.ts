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

  it("allows school-scoped users to receive a single assigned page", () => {
    expect(
      resolveScopedUserConfig({
        role: "employee",
        schoolId: "school-1",
        scopeLevel: "group_admin",
        allowedPages: ["accounts"],
        permissions: ["view_payments", "add_payments"],
      }),
    ).toMatchObject({
      schoolId: "school-1",
      branchId: null,
      defaultBranchId: null,
      scopeLevel: "group_admin",
      isSinglePageUser: true,
      allowedPages: ["payments"],
      allowedModule: "payments",
    });
  });

  it("keeps multi-page branch users inside branch scope with a limited sidebar", () => {
    expect(
      resolveScopedUserConfig({
        role: "employee",
        schoolId: "school-1",
        branchId: "branch-1",
        scopeLevel: "branch_user",
        allowedPages: ["students", "attendance"],
        permissions: ["view_students", "add_students", "view_attendance", "take_attendance"],
      }),
    ).toMatchObject({
      schoolId: "school-1",
      branchId: "branch-1",
      defaultBranchId: "branch-1",
      scopeLevel: "branch_user",
      isSinglePageUser: false,
      allowedPages: ["students", "attendance"],
      allowedModule: "students",
    });
  });

  it("rejects branch-scoped users without a branch", () => {
    expect(() =>
      resolveScopedUserConfig({
        role: "employee",
        schoolId: "school-1",
        scopeLevel: "branch_user",
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
        scopeLevel: "branch_user",
        allowedPages: ["dashboard"],
        permissions: ["full_access"],
      }),
    ).toThrow("لا تصلح كمجال مقيّد");
  });

  it("supports the legacy restricted alias but normalizes it to a branch scope", () => {
    expect(
      resolveScopedUserConfig({
        role: "employee",
        schoolId: "school-1",
        branchId: "branch-1",
        scopeLevel: "restricted",
        allowedPages: ["attendance"],
        permissions: ["view_attendance"],
      }),
    ).toMatchObject({
      scopeLevel: "branch_user",
      branchId: "branch-1",
      allowedPages: ["attendance"],
      isSinglePageUser: true,
    });
  });
});
