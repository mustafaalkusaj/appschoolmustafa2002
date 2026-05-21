/**
 * isolation-comprehensive.test.ts
 *
 * Comprehensive tests for school/branch isolation logic.
 * Covers:
 *   1. resolveScopedUserConfig — role-based school/branch scoping
 *   2. createPaymentSchema — schema-level UUID isolation
 *   3. resolveBranchScope — pure branch access-control logic
 */

import { describe, expect, it } from "vitest";

import {
  ScopedUserConfigError,
  resolveScopedUserConfig,
} from "@/lib/authorization/scoped-user-config";

import { createPaymentSchema } from "@/lib/api-schemas";

import { resolveBranchScope } from "@/lib/branch-scope";

// ---------------------------------------------------------------------------
// 1. resolveScopedUserConfig
// ---------------------------------------------------------------------------

describe("resolveScopedUserConfig — school/branch isolation", () => {
  // super_admin bypasses school binding entirely
  it("super_admin with null schoolId returns global config without throwing", () => {
    const config = resolveScopedUserConfig({
      role: "super_admin",
      schoolId: null,
      branchId: null,
      permissions: ["full_access"],
    });

    expect(config.schoolId).toBeNull();
    expect(config.branchId).toBeNull();
    expect(config.scopeLevel).toBe("super_admin");
    expect(config.isSinglePageUser).toBe(false);
  });

  // admin (non-super_admin) must have a school
  it("admin with null schoolId throws ScopedUserConfigError", () => {
    expect(() =>
      resolveScopedUserConfig({
        role: "admin",
        schoolId: null,
        permissions: ["full_access"],
      }),
    ).toThrow(ScopedUserConfigError);
  });

  it("admin with null schoolId error message is Arabic", () => {
    expect(() =>
      resolveScopedUserConfig({
        role: "admin",
        schoolId: null,
        permissions: ["full_access"],
      }),
    ).toThrow("ربط المدرسة مطلوب");
  });

  // branch_user scope with branchId resolves correctly
  it("branch_user scope with branchId resolves with branchId in config", () => {
    const config = resolveScopedUserConfig({
      role: "admin",
      schoolId: "sch-001",
      branchId: "branch-001",
      scopeLevel: "branch_user",
      allowedPages: ["students"],
      permissions: ["full_access"],
    });

    expect(config.branchId).toBe("branch-001");
    expect(config.defaultBranchId).toBe("branch-001");
    expect(config.scopeLevel).toBe("branch_user");
    expect(config.schoolId).toBe("sch-001");
  });

  // branch_user scope without branchId must throw
  it("branch_user scope without branchId throws ScopedUserConfigError", () => {
    expect(() =>
      resolveScopedUserConfig({
        role: "admin",
        schoolId: "sch-001",
        branchId: null,
        scopeLevel: "branch_user",
        allowedPages: ["students"],
        permissions: ["full_access"],
      }),
    ).toThrow(ScopedUserConfigError);
  });

  it("branch_user without branchId error message mentions branch selection", () => {
    expect(() =>
      resolveScopedUserConfig({
        role: "admin",
        schoolId: "sch-001",
        branchId: undefined,
        scopeLevel: "branch_user",
        allowedPages: ["payments"],
        permissions: ["full_access"],
      }),
    ).toThrow("يجب اختيار الفرع");
  });

  // group_admin scope with schoolId resolves without requiring branchId
  it("group_admin scope with schoolId resolves without branchId requirement", () => {
    const config = resolveScopedUserConfig({
      role: "admin",
      schoolId: "sch-002",
      scopeLevel: "group_admin",
      permissions: ["full_access"],
    });

    expect(config.schoolId).toBe("sch-002");
    expect(config.branchId).toBeNull();
    expect(config.scopeLevel).toBe("group_admin");
  });

  // employee role with group_admin scope also resolves without branchId
  it("employee with group_admin scope and schoolId resolves successfully", () => {
    const config = resolveScopedUserConfig({
      role: "employee",
      schoolId: "sch-003",
      scopeLevel: "group_admin",
      allowedPages: ["attendance"],
      permissions: ["view_attendance", "take_attendance"],
    });

    expect(config.schoolId).toBe("sch-003");
    expect(config.branchId).toBeNull();
    expect(config.scopeLevel).toBe("group_admin");
    expect(config.allowedPages).toContain("attendance");
  });

  // super_admin always gets global scope even when schoolId and branchId are provided
  it("super_admin ignores provided schoolId and branchId, always returns global scope", () => {
    const config = resolveScopedUserConfig({
      role: "super_admin",
      schoolId: "sch-any",
      branchId: "branch-any",
      scopeLevel: "branch_user",
      allowedPages: ["payments"],
      permissions: ["full_access"],
    });

    expect(config.schoolId).toBeNull();
    expect(config.branchId).toBeNull();
    expect(config.scopeLevel).toBe("super_admin");
    // super_admin never has isSinglePageUser = true
    expect(config.isSinglePageUser).toBe(false);
  });

  // forbidden pages (dashboard, group, super-admin) must not be allowed as scoped pages
  it("throws when a forbidden page (group) is used as a scoped allowedPage", () => {
    expect(() =>
      resolveScopedUserConfig({
        role: "admin",
        schoolId: "sch-001",
        branchId: "branch-001",
        scopeLevel: "branch_user",
        allowedPages: ["group"],
        permissions: ["full_access"],
      }),
    ).toThrow(ScopedUserConfigError);
  });
});

// ---------------------------------------------------------------------------
// 2. createPaymentSchema — schema-level isolation via UUID validation
// ---------------------------------------------------------------------------

const VALID_UUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const VALID_STUDENT_UUID = "b1ffcd00-0d1c-5fg9-cc7e-7cc0ce491b22".replace(/[^0-9a-f-]/gi, "0");
const ANOTHER_VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("createPaymentSchema — UUID isolation for school_id", () => {
  const basePayload = {
    school_id: VALID_UUID,
    student_id: ANOTHER_VALID_UUID,
    amount: 100,
    payment_method: "cash" as const,
  };

  it("accepts a valid UUID for school_id", () => {
    const result = createPaymentSchema.safeParse(basePayload);
    expect(result.success).toBe(true);
  });

  it("rejects an invalid (non-UUID) string for school_id", () => {
    const result = createPaymentSchema.safeParse({
      ...basePayload,
      school_id: "not-a-valid-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a school_id that is an empty string", () => {
    const result = createPaymentSchema.safeParse({
      ...basePayload,
      school_id: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when school_id is missing entirely", () => {
    const { school_id: _omitted, ...payloadWithoutSchool } = basePayload;
    const result = createPaymentSchema.safeParse(payloadWithoutSchool);
    expect(result.success).toBe(false);
  });

  it("rejects a numeric value as school_id", () => {
    const result = createPaymentSchema.safeParse({
      ...basePayload,
      school_id: 12345,
    });
    expect(result.success).toBe(false);
  });

  it("accepts an optional branch_id as a valid UUID", () => {
    const result = createPaymentSchema.safeParse({
      ...basePayload,
      branch_id: VALID_UUID,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.branch_id).toBe(VALID_UUID);
    }
  });

  it("rejects an invalid UUID for branch_id", () => {
    const result = createPaymentSchema.safeParse({
      ...basePayload,
      branch_id: "bad-branch-id",
    });
    expect(result.success).toBe(false);
  });

  it("accepts null branch_id (no branch restriction)", () => {
    const result = createPaymentSchema.safeParse({
      ...basePayload,
      branch_id: null,
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Branch isolation logic — pure functions, no DB
// ---------------------------------------------------------------------------

describe("resolveBranchScope — branch access-control logic", () => {
  // allowedBranchIds=["branch-A"], requested="branch-B" → denied (not in list)
  it("denies access when requested branch is not in allowedBranchIds", () => {
    const result = resolveBranchScope(
      { actorBranchId: "branch-A", allowedBranchIds: ["branch-A"] },
      "branch-B",
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });

  // allowedBranchIds=["branch-A","branch-C"], requested="branch-A" → allowed
  it("grants access when requested branch is in allowedBranchIds", () => {
    const result = resolveBranchScope(
      { actorBranchId: null, allowedBranchIds: ["branch-A", "branch-C"] },
      "branch-A",
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.branchId).toBe("branch-A");
    }
  });

  it("grants access when requested branch matches actorBranchId", () => {
    const result = resolveBranchScope(
      { actorBranchId: "branch-C", allowedBranchIds: ["branch-C"] },
      "branch-C",
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.branchId).toBe("branch-C");
    }
  });

  /**
   * super_admin bypass note:
   * The super_admin role bypasses branch-level checks at the authorization layer
   * (resolveScopedUserConfig returns branchId: null and scopeLevel: "super_admin").
   * At the data-access layer, resolveBranchScope is called with allowedBranchIds: []
   * (empty = school-wide access), so no branch filter is applied to queries.
   * This test documents that behavior: empty allowedBranchIds + no actorBranchId
   * means unrestricted (school-wide) access.
   */
  it("super_admin: empty allowedBranchIds and no actorBranchId → school-wide access (no branch filter)", () => {
    // This simulates the context a super_admin operates in at the data layer.
    const result = resolveBranchScope(
      { actorBranchId: null, allowedBranchIds: [] },
      // no specific branch requested
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      // No branch restriction — branchId is null and branchIds is empty
      expect(result.value.branchId).toBeNull();
      expect(result.value.branchIds).toHaveLength(0);
      expect(result.value.cacheKeySuffix).toBe("school");
    }
  });

  it("defaults to the single actorBranchId when no branch is explicitly requested", () => {
    const result = resolveBranchScope(
      { actorBranchId: "branch-X", allowedBranchIds: ["branch-X"] },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.branchId).toBe("branch-X");
      expect(result.value.branchIds).toEqual(["branch-X"]);
    }
  });

  it("returns all allowed branches when actor has multiple and none is explicitly requested", () => {
    const result = resolveBranchScope(
      { actorBranchId: null, allowedBranchIds: ["branch-A", "branch-B"] },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      // branchId is null when multiple branches exist (ambiguous)
      expect(result.value.branchId).toBeNull();
      expect(result.value.branchIds).toEqual(expect.arrayContaining(["branch-A", "branch-B"]));
    }
  });

  it("cacheKeySuffix for a single branch includes the branch ID", () => {
    const result = resolveBranchScope(
      { actorBranchId: "br-42", allowedBranchIds: ["br-42"] },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.cacheKeySuffix).toBe("branch:br-42");
    }
  });

  it("cacheKeySuffix for multiple branches lists them sorted and joined", () => {
    const result = resolveBranchScope(
      { actorBranchId: null, allowedBranchIds: ["branch-Z", "branch-A"] },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      // sorted alphabetically
      expect(result.value.cacheKeySuffix).toBe("branches:branch-A,branch-Z");
    }
  });
});
