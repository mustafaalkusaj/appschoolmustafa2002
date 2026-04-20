import { describe, expect, it } from "vitest";

import {
  buildDuplicateStudentNameMessage,
  collectDuplicateStudentNames,
  findExistingDuplicateStudentNames,
  normalizeImportedStudentName,
} from "@/lib/students/import-dedup";

describe("student import duplicate detection", () => {
  it("normalizes Arabic variants before comparing names", () => {
    expect(normalizeImportedStudentName("  أَحمد   علي ")).toBe("احمد علي");
    expect(normalizeImportedStudentName("احمد علي")).toBe("احمد علي");
  });

  it("detects duplicate names inside the same import file", () => {
    const duplicates = collectDuplicateStudentNames([
      { fullName: "أحمد علي" },
      { fullName: "سارة محمد" },
      { fullName: " احمد   علي " },
    ]);

    expect(duplicates).toHaveLength(1);
    expect(duplicates[0]).toMatchObject({
      displayName: "أحمد علي",
      firstRow: 1,
      duplicateRows: [3],
    });
  });

  it("detects names that already exist in school records", () => {
    const duplicates = findExistingDuplicateStudentNames(
      ["محمد كريم", "زينب علي"],
      ["  محمد   كريم ", "طالب آخر"],
    );

    expect(duplicates).toEqual(["محمد كريم"]);
  });

  it("builds a user-facing message for file duplicates first", () => {
    const message = buildDuplicateStudentNameMessage({
      fileDuplicates: [
        {
          normalizedName: "احمد علي",
          displayName: "أحمد علي",
          firstRow: 2,
          duplicateRows: [5],
        },
      ],
      existingDuplicates: ["أحمد علي"],
    });

    expect(message).toContain("أحمد علي");
    expect(message).toContain("2");
    expect(message).toContain("5");
  });
});
