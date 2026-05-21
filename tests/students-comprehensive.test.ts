/**
 * Comprehensive unit tests for student-related pure functions.
 *
 * Covers:
 * - import-engine: normalizeArabicText, normalizeClassName, normalizeSectionName,
 *                  mapExcelRow, generateImportPreview
 * - overview:      parseStudentsListFilters
 * - api-schemas:   createPaymentSchema (amount validation)
 */

import { describe, it, expect } from "vitest";

import {
  normalizeArabicText,
  normalizeClassName,
  normalizeSectionName,
  mapExcelRow,
  generateImportPreview,
} from "@/lib/students/import-engine";
import type { Class } from "@/lib/students/import-types";
import { parseStudentsListFilters } from "@/lib/students/overview";
import { createPaymentSchema } from "@/lib/api-schemas";

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const SCHOOL_ID = "school-test";
const BRANCH_ID = "branch-test";

const MOCK_CLASSES: Class[] = [
  {
    id: "cls-1",
    schoolId: SCHOOL_ID,
    branchId: BRANCH_ID,
    academicYearId: "year-1",
    nameAr: "الصف الأول متوسط",
    nameEn: "First Grade",
    gradeLevel: 7,
    name: "الصف الأول متوسط",
    sections: [
      { id: "sec-a", name: "أ" },
      { id: "sec-b", name: "ب" },
    ],
  },
];

// Valid UUIDs for schema tests
const VALID_SCHOOL_UUID = "11111111-1111-4111-8111-111111111111";
const VALID_STUDENT_UUID = "22222222-2222-4222-8222-222222222222";

// ---------------------------------------------------------------------------
// normalizeArabicText
// ---------------------------------------------------------------------------

describe("normalizeArabicText", () => {
  it("trims leading and trailing whitespace", () => {
    expect(normalizeArabicText("  محمد  ")).toBe("محمد");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeArabicText("")).toBe("");
  });

  it("normalizes alef forms: أ → ا", () => {
    expect(normalizeArabicText("أحمد")).toBe("احمد");
  });

  it("normalizes alef forms: إ → ا", () => {
    expect(normalizeArabicText("إبراهيم")).toBe("ابراهيم");
  });

  it("normalizes alef forms: آ → ا", () => {
    expect(normalizeArabicText("آمن")).toBe("امن");
  });

  it("collapses multiple internal spaces to one", () => {
    expect(normalizeArabicText("علي   حسن")).toBe("علي حسن");
  });
});

// ---------------------------------------------------------------------------
// normalizeClassName
// ---------------------------------------------------------------------------

describe("normalizeClassName", () => {
  it("returns a non-empty string for valid Arabic class name", () => {
    const result = normalizeClassName("الصف الأول");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns a non-empty string for valid English class name", () => {
    const result = normalizeClassName("Grade 1");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("trims surrounding whitespace", () => {
    const withSpaces = normalizeClassName("  الأول  ");
    const withoutSpaces = normalizeClassName("الأول");
    expect(withSpaces).toBe(withoutSpaces);
  });

  it("returns empty string for empty input", () => {
    expect(normalizeClassName("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// normalizeSectionName
// ---------------------------------------------------------------------------

describe("normalizeSectionName", () => {
  it("returns a non-empty string for valid section name", () => {
    const result = normalizeSectionName("أ");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("trims surrounding whitespace", () => {
    const withSpaces = normalizeSectionName("  ب  ");
    const withoutSpaces = normalizeSectionName("ب");
    expect(withSpaces).toBe(withoutSpaces);
  });

  it("returns empty string for empty input", () => {
    expect(normalizeSectionName("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// mapExcelRow
// ---------------------------------------------------------------------------

describe("mapExcelRow", () => {
  const HEADERS = ["الاسم الكامل", "الصف", "الشعبة"];

  it("maps a complete row with no errors and a truthy full_name", () => {
    const row = {
      "الاسم الكامل": "أحمد محمد",
      "الصف": "الأول متوسط",
      "الشعبة": "أ",
    };
    const { mapped, errors } = mapExcelRow(row, HEADERS, 1);

    expect(errors.length).toBe(0);
    expect(mapped.fullName).toBeTruthy();
    expect(mapped.fullName).toBe("أحمد محمد");
  });

  it("returns errors when the full_name column is absent from headers", () => {
    // Only class and section headers — no name column at all
    const headersWithoutName = ["الصف", "الشعبة"];
    const row = { "الصف": "الأول متوسط", "الشعبة": "أ" };
    const { errors } = mapExcelRow(row, headersWithoutName, 2);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("اسم الطالب"))).toBe(true);
  });

  it("maps optional fields when present", () => {
    const headersWithPhone = ["الاسم الكامل", "الصف", "الشعبة", "رقم الهاتف"];
    const row = {
      "الاسم الكامل": "فاطمة",
      "الصف": "الأول متوسط",
      "الشعبة": "ب",
      "رقم الهاتف": "07700123456",
    };
    const { mapped, errors } = mapExcelRow(row, headersWithPhone, 3);

    expect(errors.length).toBe(0);
    expect(mapped.phoneNumber).toBe("07700123456");
  });
});

// ---------------------------------------------------------------------------
// generateImportPreview
// ---------------------------------------------------------------------------

describe("generateImportPreview", () => {
  it("returns totalRows=0 and empty validRows for an empty rows array", () => {
    const preview = generateImportPreview([], MOCK_CLASSES, SCHOOL_ID, BRANCH_ID);

    expect(preview.totalRows).toBe(0);
    expect(preview.validRows).toHaveLength(0);
  });

  it("places a row with an unmatched class in invalidRows", () => {
    const rows: Record<string, unknown>[] = [
      // Row 0 acts as header (keys are the column names detected)
      { "الاسم الكامل": "اسم الطالب", "الصف": "الصف", "الشعبة": "الشعبة" },
      // Row 1 — class name does not match any available class
      { "الاسم الكامل": "علي كريم", "الصف": "الصف العاشر المجهول", "الشعبة": "أ" },
    ];

    const preview = generateImportPreview(rows, MOCK_CLASSES, SCHOOL_ID, BRANCH_ID);

    expect(preview.invalidRows.length).toBeGreaterThan(0);
    expect(preview.validRows).toHaveLength(0);
    const errorText = preview.invalidRows[0].errors.join(" ");
    expect(errorText).toMatch(/غير موجود/);
  });

  it("places a row with a matched class in validRows", () => {
    const rows: Record<string, unknown>[] = [
      // Header row
      { "الاسم الكامل": "اسم الطالب", "الصف": "الصف", "الشعبة": "الشعبة" },
      // Data row — class matches MOCK_CLASSES[0]
      { "الاسم الكامل": "سارة حسن", "الصف": "الأول متوسط", "الشعبة": "أ" },
    ];

    const preview = generateImportPreview(rows, MOCK_CLASSES, SCHOOL_ID, BRANCH_ID);

    expect(preview.validRows).toHaveLength(1);
    expect(preview.invalidRows).toHaveLength(0);
    expect(preview.validRows[0].fullName).toBe("سارة حسن");
    expect(preview.validRows[0].classId).toBe("cls-1");
  });

  it("handles no-header detection gracefully (rows with unrecognized keys)", () => {
    const rows: Record<string, unknown>[] = [
      { col1: "random", col2: "data" },
      { col1: "more", col2: "random" },
    ];

    const preview = generateImportPreview(rows, MOCK_CLASSES, SCHOOL_ID, BRANCH_ID);

    // No valid header detected → all end up as invalid (or totalRows reflects raw count)
    expect(preview.validRows).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// parseStudentsListFilters
// ---------------------------------------------------------------------------

describe("parseStudentsListFilters", () => {
  it("returns page=1, status=active, search='' for empty URLSearchParams", () => {
    const filters = parseStudentsListFilters(new URLSearchParams());

    expect(filters.page).toBe(1);
    expect(filters.status).toBe("active");
    expect(filters.search).toBe("");
  });

  it("preserves Arabic search term", () => {
    const filters = parseStudentsListFilters(new URLSearchParams({ search: "أحمد" }));

    expect(filters.search).toBe("أحمد");
  });

  it("returns status=suspended when status param is suspended", () => {
    const filters = parseStudentsListFilters(new URLSearchParams({ status: "suspended" }));

    expect(filters.status).toBe("suspended");
  });

  it("parses page number correctly", () => {
    const filters = parseStudentsListFilters(new URLSearchParams({ page: "3" }));

    expect(filters.page).toBe(3);
  });

  it("falls back to page=1 for invalid page param", () => {
    const filters = parseStudentsListFilters(new URLSearchParams({ page: "abc" }));

    expect(filters.page).toBe(1);
  });

  it("defaults unknown status to active", () => {
    const filters = parseStudentsListFilters(new URLSearchParams({ status: "unknown-status" }));

    expect(filters.status).toBe("active");
  });
});

// ---------------------------------------------------------------------------
// createPaymentSchema — amount validation
// ---------------------------------------------------------------------------

describe("createPaymentSchema", () => {
  const BASE = {
    school_id: VALID_SCHOOL_UUID,
    student_id: VALID_STUDENT_UUID,
    payment_method: "cash" as const,
  };

  it("rejects a negative amount", () => {
    const result = createPaymentSchema.safeParse({ ...BASE, amount: -100 });
    expect(result.success).toBe(false);
  });

  it("rejects zero amount", () => {
    const result = createPaymentSchema.safeParse({ ...BASE, amount: 0 });
    expect(result.success).toBe(false);
  });

  it("accepts a valid positive amount", () => {
    const result = createPaymentSchema.safeParse({ ...BASE, amount: 5000 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(5000);
    }
  });

  it("accepts amount supplied as a numeric string (coerced)", () => {
    const result = createPaymentSchema.safeParse({ ...BASE, amount: "250" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(250);
    }
  });
});
