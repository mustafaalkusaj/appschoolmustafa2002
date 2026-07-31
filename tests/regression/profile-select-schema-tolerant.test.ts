import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Guards the login-loop regression.
 *
 * `allowed_pages`, `default_path` and `allowed_branch_ids` are DERIVED at
 * runtime (see buildAllowedPages / buildDefaultPath in
 * lib/authorization/snapshot.ts) — they are not columns on
 * public.user_profiles. PostgREST fails the WHOLE query with 42703 when an
 * explicit .select() list names a missing column, which nulls the profile and
 * bounces every user back to /login.
 *
 * Any profile read must therefore stay schema-tolerant.
 */

const DERIVED_ONLY_FIELDS = [
  "allowed_pages",
  "default_path",
  "allowed_branch_ids",
];

const PROFILE_READERS = ["lib/auth.ts", "lib/authorization/snapshot.ts"];

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

/** Returns the argument of every `.select("...")` string literal in `source`. */
function extractSelectLists(source: string): string[] {
  const matches = source.matchAll(/\.select\(\s*(["'`])([\s\S]*?)\1/g);
  return Array.from(matches, (match) => match[2]);
}

describe("user_profiles reads stay schema-tolerant", () => {
  for (const relativePath of PROFILE_READERS) {
    it(`${relativePath} never names a derived field in an explicit .select() list`, () => {
      const selectLists = extractSelectLists(readSource(relativePath));

      const offenders = selectLists.flatMap((list) =>
        DERIVED_ONLY_FIELDS.filter((field) =>
          new RegExp(`\\b${field}\\b`).test(list),
        ).map((field) => ({ field, list })),
      );

      expect(
        offenders,
        "Derived fields must not appear in a .select() list — PostgREST 42703 " +
          'would null the profile and cause a login loop. Use .select("*").',
      ).toEqual([]);
    });
  }

  it("lib/auth.ts reads the profile with a wildcard select", () => {
    expect(extractSelectLists(readSource("lib/auth.ts"))).toContain("*");
  });
});
