import { describe, it, expect } from "vitest";
import {
  assertBranchBelongsToUserContext,
  assertAllBranchesBelongToUserContext,
  getValidatedBranchId,
} from "@/lib/branch-validation";
import type { SchoolScopedActorContext } from "@/lib/managed-users/types";

const ctx = (allowedBranchIds: string[]) => ({ allowedBranchIds }) as SchoolScopedActorContext;

describe("assertBranchBelongsToUserContext", () => {
  it("no branch → ok (no throw)", () => {
    expect(() => assertBranchBelongsToUserContext(null, ctx([]))).not.toThrow();
    expect(() => assertBranchBelongsToUserContext(undefined, ctx(["b1"]))).not.toThrow();
  });
  it("whitespace-only branch → ok", () => {
    expect(() => assertBranchBelongsToUserContext("   ", ctx(["b1"]))).not.toThrow();
  });
  it("branch set but user has no branch access → throws", () => {
    expect(() => assertBranchBelongsToUserContext("b1", ctx([]))).toThrow(/branch-level access/);
  });
  it("branch not in allowed → throws", () => {
    expect(() => assertBranchBelongsToUserContext("bX", ctx(["b1"]))).toThrow(/does not belong/);
  });
  it("branch in allowed → ok", () => {
    expect(() => assertBranchBelongsToUserContext("b1", ctx(["b1", "b2"]))).not.toThrow();
  });
  it("uses custom field name in message", () => {
    expect(() => assertBranchBelongsToUserContext("bX", ctx(["b1"]), "homeroom")).toThrow(/homeroom/);
  });
});

describe("assertAllBranchesBelongToUserContext", () => {
  it("all valid → ok", () => {
    expect(() => assertAllBranchesBelongToUserContext(["b1", "b2", null], ctx(["b1", "b2"]))).not.toThrow();
  });
  it("one invalid → throws", () => {
    expect(() => assertAllBranchesBelongToUserContext(["b1", "bX"], ctx(["b1"]))).toThrow();
  });
});

describe("getValidatedBranchId", () => {
  it("returns trimmed id when valid", () => {
    expect(getValidatedBranchId(" b1 ", ctx(["b1"]))).toBe("b1");
  });
  it("returns null for empty", () => {
    expect(getValidatedBranchId(null, ctx([]))).toBeNull();
  });
  it("throws for invalid", () => {
    expect(() => getValidatedBranchId("bX", ctx(["b1"]))).toThrow();
  });
});
