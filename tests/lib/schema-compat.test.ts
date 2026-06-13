import { describe, expect, it, beforeEach } from "vitest";

import { detectAppSchemaCompatWithClient, __TEST_ONLY_resetAllCaches } from "@/lib/schema-compat";

type FakeCompatClient = {
  from: (table: string) => {
    select: (columns: string) => {
      limit: (_count: number) => Promise<{ error: null | { code: string; message: string } }>;
    };
  };
};

function createCompatClient(missingColumns: string[] = []): FakeCompatClient {
  const missing = new Set(missingColumns);

  return {
    from(table: string) {
      return {
        select(columns: string) {
          const parts = columns
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean);
          const columnName = parts[parts.length - 1] || "id";

          return {
            async limit() {
              const key = `${table}.${columnName}`;
              if (missing.has(key)) {
                return {
                  error: {
                    code: "42703",
                    message: `column ${table}.${columnName} does not exist`,
                  },
                };
              }

              return { error: null };
            },
          };
        },
      };
    },
  };
}

describe("detectAppSchemaCompatWithClient", () => {
  beforeEach(() => {
    __TEST_ONLY_resetAllCaches();
  });

  it("detects branch branding columns when they exist", async () => {
    const compat = await detectAppSchemaCompatWithClient(createCompatClient());

    expect(compat.schoolColors).toBe(true);
    expect(compat.schoolThemePreset).toBe(true);
    expect(compat.branchColors).toBe(true);
    expect(compat.branchUiColors).toBe(true);
  });

  it("falls back cleanly when branch branding columns are missing", async () => {
    const compat = await detectAppSchemaCompatWithClient(
      createCompatClient(["branches.primary_color", "branches.sidebar_color"]),
    );

    expect(compat.branchColors).toBe(false);
    expect(compat.branchUiColors).toBe(false);
    expect(compat.schoolColors).toBe(true);
  });
});
