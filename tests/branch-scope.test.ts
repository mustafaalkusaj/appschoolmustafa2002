import { describe, expect, it } from "vitest";

import {
  applyBranchScopeToQuery,
  resolveBranchIdForWrite,
  resolveBranchScope,
} from "@/lib/branch-scope";

describe("branch scope helpers", () => {
  it("restricts reads to the actor branch when no branch is explicitly requested", () => {
    const result = resolveBranchScope({
      actorBranchId: "branch-a",
      allowedBranchIds: ["branch-a"],
    });

    expect(result).toEqual({
      ok: true,
      value: {
        branchId: "branch-a",
        branchIds: ["branch-a"],
        cacheKeySuffix: "branch:branch-a",
      },
    });
  });

  it("rejects access to another branch outside the allowed list", () => {
    const result = resolveBranchScope(
      {
        actorBranchId: "branch-a",
        allowedBranchIds: ["branch-a"],
      },
      "branch-b",
    );

    expect(result).toMatchObject({
      ok: false,
      status: 403,
    });
  });

  it("requires an explicit branch for ambiguous writes across multiple allowed branches", () => {
    const scope = resolveBranchScope({
      actorBranchId: null,
      allowedBranchIds: ["branch-a", "branch-b"],
    });

    expect(scope.ok).toBe(true);
    if (!scope.ok) {
      throw new Error("Expected scope to be resolved.");
    }

    const writeResult = resolveBranchIdForWrite(scope.value);
    expect(writeResult).toMatchObject({
      ok: false,
      status: 400,
    });
  });

  it("applies branch filters to a query-like object", () => {
    const calls: Array<{ method: string; column: string; value: unknown }> = [];
    const query = {
      eq(column: string, value: unknown) {
        calls.push({ method: "eq", column, value });
        return this;
      },
      in(column: string, value: unknown[]) {
        calls.push({ method: "in", column, value });
        return this;
      },
    };

    const scope = resolveBranchScope({
      actorBranchId: null,
      allowedBranchIds: ["branch-a", "branch-b"],
    });
    if (!scope.ok) {
      throw new Error("Expected scope to be resolved.");
    }

    applyBranchScopeToQuery(query, scope.value);

    expect(calls).toEqual([
      {
        method: "in",
        column: "branch_id",
        value: ["branch-a", "branch-b"],
      },
    ]);
  });

  it("rejects write attempt without explicit branch when multiple allowed", () => {
    const scope = resolveBranchScope({
      actorBranchId: null,
      allowedBranchIds: ["branch-a", "branch-b", "branch-c"],
    });

    if (!scope.ok) {
      throw new Error("Expected scope to be resolved.");
    }

    const writeResult = resolveBranchIdForWrite(scope.value);

    expect(writeResult).toMatchObject({
      ok: false,
      status: 400,
    });
  });

  it("allows write with explicit branch within allowed list", () => {
    const scope = resolveBranchScope({
      actorBranchId: null,
      allowedBranchIds: ["branch-a", "branch-b"],
    });

    if (!scope.ok) {
      throw new Error("Expected scope to be resolved.");
    }

    const writeResult = resolveBranchIdForWrite(scope.value, "branch-a");

    expect(writeResult).toEqual({
      ok: true,
      value: "branch-a",
    });
  });

  it("rejects write attempt with unauthorized branch", () => {
    const scope = resolveBranchScope({
      actorBranchId: null,
      allowedBranchIds: ["branch-a", "branch-b"],
    });

    if (!scope.ok) {
      throw new Error("Expected scope to be resolved.");
    }

    const writeResult = resolveBranchIdForWrite(scope.value, "branch-unauthorized");

    expect(writeResult).toMatchObject({
      ok: false,
      status: 403,
    });
  });

  it("allows write with single allowed branch without explicit request", () => {
    const scope = resolveBranchScope({
      actorBranchId: "branch-x",
      allowedBranchIds: ["branch-x"],
    });

    if (!scope.ok) {
      throw new Error("Expected scope to be resolved.");
    }

    const writeResult = resolveBranchIdForWrite(scope.value);

    expect(writeResult).toEqual({
      ok: true,
      value: "branch-x",
    });
  });

  it("returns null branch for school-level access when no branch requested", () => {
    const scope = resolveBranchScope({
      actorBranchId: null,
      allowedBranchIds: [],
    });

    if (!scope.ok) {
      throw new Error("Expected scope to be resolved.");
    }

    const writeResult = resolveBranchIdForWrite(scope.value);

    expect(writeResult).toEqual({
      ok: true,
      value: null,
    });
  });
});

