/**
 * Comprehensive unit tests for grades-related schemas and pure logic.
 *
 * Covers:
 * - dashboardOverviewQuerySchema from lib/api-schemas.ts
 * - GradeCategory / GradeStatus / GRADE_LABELS constants from lib/grades/types.ts
 * - GradeEntryInput shape validation (via manual logic mirroring the route's normalizeGradeInput)
 *
 * No DB calls — purely schema / pure-function tests.
 */

vi.mock("server-only", () => ({}));

import { describe, it, expect, vi } from "vitest";
import { dashboardOverviewQuerySchema } from "@/lib/api-schemas";
import { GRADE_LABELS, DEFAULT_GRADE_TYPES } from "@/lib/grades/types";
import type { GradeCategory, GradeStatus } from "@/lib/grades/types";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const VALID_UUID_2 = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

// ── dashboardOverviewQuerySchema ──────────────────────────────────────────────

describe("dashboardOverviewQuerySchema — schoolId", () => {
  it("accepts a valid schoolId UUID", () => {
    const result = dashboardOverviewQuerySchema.safeParse({ schoolId: VALID_UUID });
    expect(result.success).toBe(true);
  });

  it("accepts schoolId with optional branchId", () => {
    const result = dashboardOverviewQuerySchema.safeParse({
      schoolId: VALID_UUID,
      branchId: VALID_UUID_2,
    });
    expect(result.success).toBe(true);
  });

  it("accepts schoolId with null branchId (branchId is optional/nullable)", () => {
    const result = dashboardOverviewQuerySchema.safeParse({
      schoolId: VALID_UUID,
      branchId: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts schoolId without branchId (branchId is optional)", () => {
    const result = dashboardOverviewQuerySchema.safeParse({
      schoolId: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing schoolId", () => {
    const result = dashboardOverviewQuerySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects null schoolId", () => {
    const result = dashboardOverviewQuerySchema.safeParse({ schoolId: null });
    expect(result.success).toBe(false);
  });

  it("rejects invalid UUID schoolId (plain string)", () => {
    const result = dashboardOverviewQuerySchema.safeParse({ schoolId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects empty string schoolId", () => {
    const result = dashboardOverviewQuerySchema.safeParse({ schoolId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects numeric schoolId", () => {
    const result = dashboardOverviewQuerySchema.safeParse({ schoolId: 12345 });
    expect(result.success).toBe(false);
  });

  it("rejects schoolId that looks like UUID but is missing segments", () => {
    const result = dashboardOverviewQuerySchema.safeParse({
      schoolId: "550e8400-e29b-41d4",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid branchId UUID when provided", () => {
    const result = dashboardOverviewQuerySchema.safeParse({
      schoolId: VALID_UUID,
      branchId: "bad-branch-id",
    });
    expect(result.success).toBe(false);
  });
});

// ── GRADE_LABELS constants ────────────────────────────────────────────────────

describe("GRADE_LABELS — structural integrity", () => {
  it("has at least one label defined", () => {
    expect(GRADE_LABELS.length).toBeGreaterThan(0);
  });

  it("each label has required fields: label, labelAr, minPercent, maxPercent, color, badge", () => {
    for (const entry of GRADE_LABELS) {
      expect(typeof entry.label).toBe("string");
      expect(typeof entry.labelAr).toBe("string");
      expect(typeof entry.minPercent).toBe("number");
      expect(typeof entry.maxPercent).toBe("number");
      expect(typeof entry.color).toBe("string");
      expect(typeof entry.badge).toBe("string");
    }
  });

  it("minPercent is always less than or equal to maxPercent for each label", () => {
    for (const entry of GRADE_LABELS) {
      expect(entry.minPercent).toBeLessThanOrEqual(entry.maxPercent);
    }
  });

  it("percentage ranges start at 0 and reach 100", () => {
    const min = Math.min(...GRADE_LABELS.map((l) => l.minPercent));
    const max = Math.max(...GRADE_LABELS.map((l) => l.maxPercent));
    expect(min).toBe(0);
    expect(max).toBe(100);
  });

  it('contains a "Fail" label (for scores below passing threshold)', () => {
    const fail = GRADE_LABELS.find((l) => l.label === "Fail");
    expect(fail).toBeDefined();
    expect(fail!.minPercent).toBe(0);
  });

  it('contains an "Excellent" label', () => {
    const excellent = GRADE_LABELS.find((l) => l.label === "Excellent");
    expect(excellent).toBeDefined();
  });
});

// ── DEFAULT_GRADE_TYPES constants ─────────────────────────────────────────────

describe("DEFAULT_GRADE_TYPES — structural integrity", () => {
  const validCategories: GradeCategory[] = [
    "quiz", "homework", "monthly", "midterm", "final",
    "oral", "project", "participation", "other",
  ];

  it("has at least one default grade type", () => {
    expect(DEFAULT_GRADE_TYPES.length).toBeGreaterThan(0);
  });

  it("each grade type has a name, name_ar, name_en, category, and default_max_score", () => {
    for (const gt of DEFAULT_GRADE_TYPES) {
      expect(typeof gt.name).toBe("string");
      expect(gt.name.length).toBeGreaterThan(0);
      expect(typeof gt.name_ar).toBe("string");
      expect(typeof gt.name_en).toBe("string");
      expect(validCategories).toContain(gt.category);
      expect(typeof gt.default_max_score).toBe("number");
      expect(gt.default_max_score).toBeGreaterThan(0);
    }
  });

  it("all grade types are active by default", () => {
    for (const gt of DEFAULT_GRADE_TYPES) {
      expect(gt.is_active).toBe(true);
    }
  });

  it("includes a 'final' category grade type", () => {
    const finalGrade = DEFAULT_GRADE_TYPES.find((gt) => gt.category === "final");
    expect(finalGrade).toBeDefined();
  });

  it("includes a 'quiz' category grade type", () => {
    const quiz = DEFAULT_GRADE_TYPES.find((gt) => gt.category === "quiz");
    expect(quiz).toBeDefined();
  });

  it("sort_order values are positive integers", () => {
    for (const gt of DEFAULT_GRADE_TYPES) {
      expect(Number.isInteger(gt.sort_order)).toBe(true);
      expect(gt.sort_order).toBeGreaterThan(0);
    }
  });
});

// ── GradeCategory type exhaustiveness ─────────────────────────────────────────

describe("GradeCategory — known valid values", () => {
  const validCategories: GradeCategory[] = [
    "quiz",
    "homework",
    "monthly",
    "midterm",
    "final",
    "oral",
    "project",
    "participation",
    "other",
  ];

  it("each known category string is a non-empty string", () => {
    for (const cat of validCategories) {
      expect(typeof cat).toBe("string");
      expect(cat.length).toBeGreaterThan(0);
    }
  });
});

// ── GradeStatus type exhaustiveness ───────────────────────────────────────────

describe("GradeStatus — known valid values", () => {
  const validStatuses: GradeStatus[] = ["draft", "confirmed", "locked"];

  it("each status is a non-empty string", () => {
    for (const status of validStatuses) {
      expect(typeof status).toBe("string");
      expect(status.length).toBeGreaterThan(0);
    }
  });

  it("contains exactly draft, confirmed, and locked", () => {
    expect(validStatuses).toEqual(["draft", "confirmed", "locked"]);
  });
});

// ── normalizeGradeInput logic (pure JS re-implementation of route helper) ─────
// The route's normalizeGradeInput function is not exported, so we replicate
// its validation rules here to ensure the rules stay correct.

type Semester = 1 | 2;

interface GradeEntryInput {
  student_id: string;
  subject_id: string;
  academic_year: string;
  semester: Semester;
  score: number;
  max_score: number;
  note?: string | null;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeScore(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && isFinite(value) && value >= 0) return value;
  if (typeof value === "string") {
    const n = parseFloat(value);
    if (isFinite(n) && n >= 0) return n;
  }
  return null;
}

function normalizeGradeInput(raw: Record<string, unknown>): GradeEntryInput | null {
  const studentId = normalizeString(raw.student_id);
  const subjectId = normalizeString(raw.subject_id);
  const academicYear = normalizeString(raw.academic_year);
  const semesterRaw =
    typeof raw.semester === "number"
      ? raw.semester
      : parseInt(String(raw.semester ?? ""), 10);

  if (!studentId || !subjectId || !academicYear) return null;
  if (semesterRaw !== 1 && semesterRaw !== 2) return null;

  const score = normalizeScore(raw.score);
  const maxScore = normalizeScore(raw.max_score);
  if (score === null || maxScore === null || maxScore <= 0) return null;
  if (score > maxScore) return null;

  return {
    student_id: studentId,
    subject_id: subjectId,
    academic_year: academicYear,
    semester: semesterRaw as Semester,
    score,
    max_score: maxScore,
    note: typeof raw.note === "string" ? raw.note.trim() || null : null,
  };
}

const BASE_ENTRY = {
  student_id: VALID_UUID,
  subject_id: VALID_UUID_2,
  academic_year: "2025-2026",
  semester: 1,
  score: 80,
  max_score: 100,
};

describe("normalizeGradeInput — valid inputs", () => {
  it("returns a valid entry for a fully correct record", () => {
    expect(normalizeGradeInput(BASE_ENTRY)).not.toBeNull();
  });

  it("accepts semester 2", () => {
    expect(normalizeGradeInput({ ...BASE_ENTRY, semester: 2 })).not.toBeNull();
  });

  it("accepts score of 0", () => {
    expect(normalizeGradeInput({ ...BASE_ENTRY, score: 0 })).not.toBeNull();
  });

  it("accepts score equal to max_score (perfect score)", () => {
    expect(normalizeGradeInput({ ...BASE_ENTRY, score: 100, max_score: 100 })).not.toBeNull();
  });

  it("accepts numeric-string score", () => {
    expect(normalizeGradeInput({ ...BASE_ENTRY, score: "85" })).not.toBeNull();
  });

  it("accepts decimal scores", () => {
    expect(normalizeGradeInput({ ...BASE_ENTRY, score: 78.5, max_score: 100 })).not.toBeNull();
  });

  it("preserves note when provided", () => {
    const result = normalizeGradeInput({ ...BASE_ENTRY, note: "  Good work  " });
    expect(result?.note).toBe("Good work");
  });

  it("returns null note for empty string note", () => {
    const result = normalizeGradeInput({ ...BASE_ENTRY, note: "   " });
    expect(result?.note).toBeNull();
  });
});

describe("normalizeGradeInput — invalid inputs return null", () => {
  it("returns null when student_id is missing", () => {
    const { student_id: _, ...without } = BASE_ENTRY;
    expect(normalizeGradeInput(without as Record<string, unknown>)).toBeNull();
  });

  it("returns null when subject_id is missing", () => {
    const { subject_id: _, ...without } = BASE_ENTRY;
    expect(normalizeGradeInput(without as Record<string, unknown>)).toBeNull();
  });

  it("returns null when academic_year is missing", () => {
    const { academic_year: _, ...without } = BASE_ENTRY;
    expect(normalizeGradeInput(without as Record<string, unknown>)).toBeNull();
  });

  it("returns null for semester 0 (invalid)", () => {
    expect(normalizeGradeInput({ ...BASE_ENTRY, semester: 0 })).toBeNull();
  });

  it("returns null for semester 3 (invalid)", () => {
    expect(normalizeGradeInput({ ...BASE_ENTRY, semester: 3 })).toBeNull();
  });

  it("returns null when score exceeds max_score", () => {
    expect(normalizeGradeInput({ ...BASE_ENTRY, score: 110, max_score: 100 })).toBeNull();
  });

  it("returns null when max_score is 0", () => {
    expect(normalizeGradeInput({ ...BASE_ENTRY, max_score: 0 })).toBeNull();
  });

  it("returns null when max_score is negative", () => {
    expect(normalizeGradeInput({ ...BASE_ENTRY, max_score: -10 })).toBeNull();
  });

  it("returns null when score is negative", () => {
    expect(normalizeGradeInput({ ...BASE_ENTRY, score: -5 })).toBeNull();
  });

  it("returns null when score is Infinity", () => {
    expect(normalizeGradeInput({ ...BASE_ENTRY, score: Infinity })).toBeNull();
  });

  it("returns null when score is non-numeric string", () => {
    expect(normalizeGradeInput({ ...BASE_ENTRY, score: "abc" })).toBeNull();
  });

  it("returns null for completely empty object", () => {
    expect(normalizeGradeInput({})).toBeNull();
  });
});
