import { describe, expect, it } from "vitest";

import {
  buildSchoolCacheTag,
  invalidateCacheTags,
  rememberWithTtl,
} from "@/lib/server-cache";

describe("server cache", () => {
  it("deduplicates concurrent loaders for the same key", async () => {
    let calls = 0;
    const loader = async () => {
      calls += 1;
      return { ok: true };
    };

    const [first, second] = await Promise.all([
      rememberWithTtl("tests:dedupe", 10_000, loader),
      rememberWithTtl("tests:dedupe", 10_000, loader),
    ]);

    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: true });
    expect(calls).toBe(1);
  });

  it("invalidates entries by school tag", async () => {
    let calls = 0;
    const tag = buildSchoolCacheTag("school-1", "reports-overview");

    await rememberWithTtl(
      "tests:tagged",
      10_000,
      async () => {
        calls += 1;
        return calls;
      },
      { tags: [tag] },
    );

    invalidateCacheTags([tag]);

    const value = await rememberWithTtl(
      "tests:tagged",
      10_000,
      async () => {
        calls += 1;
        return calls;
      },
      { tags: [tag] },
    );

    expect(value).toBe(2);
  });
});

