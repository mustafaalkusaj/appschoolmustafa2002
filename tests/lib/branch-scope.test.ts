import { describe, it, expect, vi } from "vitest";
import {
  resolveBranchScope,
  applyBranchScopeToQuery,
  resolveBranchIdForWrite,
  type ResolvedBranchScope,
} from "@/lib/branch-scope";

const actor = (actorBranchId: string | null, allowedBranchIds: string[] = []) =>
  ({ actorBranchId, allowedBranchIds }) as Parameters<typeof resolveBranchScope>[0];

describe("resolveBranchScope", () => {
  it("requested branch in allowed → ok scoped to it", () => {
    const r = resolveBranchScope(actor("b1", ["b1", "b2"]), "b2");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toMatchObject({ branchId: "b2", branchIds: ["b2"], cacheKeySuffix: "branch:b2" });
  });
  it("requested branch not in allowed → 403", () => {
    const r = resolveBranchScope(actor("b1", ["b1"]), "bX");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });
  it("requested branch but actor has no branches → allowed (school-level)", () => {
    const r = resolveBranchScope(actor(null, []), "bX");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.branchId).toBe("bX");
  });
  it("no requested + zero branches → school scope, null branchId", () => {
    const r = resolveBranchScope(actor(null, []));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toMatchObject({ branchId: null, branchIds: [], cacheKeySuffix: "school" });
  });
  it("no requested + single branch → that branch", () => {
    const r = resolveBranchScope(actor("b1", []));
    if (r.ok) expect(r.value).toMatchObject({ branchId: "b1", branchIds: ["b1"], cacheKeySuffix: "branch:b1" });
  });
  it("no requested + multi branches → null branchId, sorted suffix, deduped", () => {
    const r = resolveBranchScope(actor("b2", ["b2", "b1", "b1"]));
    if (r.ok) {
      expect(r.value.branchId).toBeNull();
      expect(r.value.branchIds.sort()).toEqual(["b1", "b2"]);
      expect(r.value.cacheKeySuffix).toBe("branches:b1,b2");
    }
  });
  it("normalizes blank/whitespace requested branch as none", () => {
    const r = resolveBranchScope(actor(null, []), "   ");
    if (r.ok) expect(r.value.cacheKeySuffix).toBe("school");
  });
});

describe("applyBranchScopeToQuery", () => {
  const makeQuery = () => {
    const q = { eq: vi.fn(() => q), in: vi.fn(() => q) };
    return q;
  };
  it("single branchId → eq", () => {
    const q = makeQuery();
    applyBranchScopeToQuery(q, { branchId: "b1", branchIds: ["b1"], cacheKeySuffix: "" });
    expect(q.eq).toHaveBeenCalledWith("branch_id", "b1");
  });
  it("multi branchIds → in", () => {
    const q = makeQuery();
    applyBranchScopeToQuery(q, { branchId: null, branchIds: ["b1", "b2"], cacheKeySuffix: "" });
    expect(q.in).toHaveBeenCalledWith("branch_id", ["b1", "b2"]);
  });
  it("no branches → query unchanged", () => {
    const q = makeQuery();
    const out = applyBranchScopeToQuery(q, { branchId: null, branchIds: [], cacheKeySuffix: "" });
    expect(q.eq).not.toHaveBeenCalled();
    expect(q.in).not.toHaveBeenCalled();
    expect(out).toBe(q);
  });
  it("honors custom column", () => {
    const q = makeQuery();
    applyBranchScopeToQuery(q, { branchId: "b1", branchIds: ["b1"], cacheKeySuffix: "" }, "br");
    expect(q.eq).toHaveBeenCalledWith("br", "b1");
  });
});

describe("resolveBranchIdForWrite", () => {
  const scope = (over: Partial<ResolvedBranchScope>): ResolvedBranchScope => ({ branchId: null, branchIds: [], cacheKeySuffix: "", ...over });
  it("requested within scope → ok", () => {
    const r = resolveBranchIdForWrite(scope({ branchIds: ["b1", "b2"] }), "b1");
    expect(r).toEqual({ ok: true, value: "b1" });
  });
  it("requested outside scope → 403", () => {
    const r = resolveBranchIdForWrite(scope({ branchIds: ["b1"] }), "bX");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });
  it("no requested + branchId set → branchId", () => {
    const r = resolveBranchIdForWrite(scope({ branchId: "b1" }));
    expect(r).toEqual({ ok: true, value: "b1" });
  });
  it("no requested + single branchIds → that", () => {
    const r = resolveBranchIdForWrite(scope({ branchIds: ["b9"] }));
    expect(r).toEqual({ ok: true, value: "b9" });
  });
  it("no requested + multi branchIds → 400 must choose", () => {
    const r = resolveBranchIdForWrite(scope({ branchIds: ["b1", "b2"] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(400);
  });
  it("no requested + no branches → null", () => {
    const r = resolveBranchIdForWrite(scope({}));
    expect(r).toEqual({ ok: true, value: null });
  });
});
