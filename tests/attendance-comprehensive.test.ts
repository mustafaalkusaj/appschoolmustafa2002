/**
 * Comprehensive unit tests for teacherAttendanceRecordSchema
 * from lib/api-schemas.ts.
 *
 * All tests are pure Zod schema tests — no DB calls, no network.
 */

vi.mock("server-only", () => ({}));

import { describe, it, expect, vi } from "vitest";
import { teacherAttendanceRecordSchema } from "@/lib/api-schemas";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

// ── Helpers ──────────────────────────────────────────────────────────────────

function valid(overrides: Record<string, unknown> = {}) {
  return {
    teacher_id: VALID_UUID,
    status: "present" as const,
    ...overrides,
  };
}

function accepted(data: Record<string, unknown>) {
  return teacherAttendanceRecordSchema.safeParse(data).success;
}

function rejected(data: Record<string, unknown>) {
  return !teacherAttendanceRecordSchema.safeParse(data).success;
}

// ── Status enum ───────────────────────────────────────────────────────────────

describe("teacherAttendanceRecordSchema — status field", () => {
  it('accepts "present" status', () => {
    expect(accepted(valid({ status: "present" }))).toBe(true);
  });

  it('accepts "absent" status', () => {
    expect(accepted(valid({ status: "absent" }))).toBe(true);
  });

  it('accepts "late" status', () => {
    expect(accepted(valid({ status: "late" }))).toBe(true);
  });

  it('accepts "excused" status', () => {
    expect(accepted(valid({ status: "excused" }))).toBe(true);
  });

  it('accepts "holiday" status', () => {
    expect(accepted(valid({ status: "holiday" }))).toBe(true);
  });

  it('rejects "on_vacation" status (not in enum)', () => {
    expect(rejected(valid({ status: "on_vacation" }))).toBe(true);
  });

  it('rejects "PRESENT" (uppercase — case-sensitive enum)', () => {
    expect(rejected(valid({ status: "PRESENT" }))).toBe(true);
  });

  it("rejects empty string status", () => {
    expect(rejected(valid({ status: "" }))).toBe(true);
  });
});

// ── teacher_id ────────────────────────────────────────────────────────────────

describe("teacherAttendanceRecordSchema — teacher_id field", () => {
  it("accepts a valid UUID teacher_id", () => {
    expect(accepted(valid())).toBe(true);
  });

  it("rejects missing teacher_id", () => {
    const { teacher_id: _, ...without } = valid();
    expect(rejected(without as Record<string, unknown>)).toBe(true);
  });

  it("rejects invalid teacher_id (not a UUID)", () => {
    expect(rejected(valid({ teacher_id: "not-a-uuid" }))).toBe(true);
  });

  it("rejects teacher_id that is a plain integer", () => {
    expect(rejected(valid({ teacher_id: 123 }))).toBe(true);
  });

  it("rejects teacher_id that is an empty string", () => {
    expect(rejected(valid({ teacher_id: "" }))).toBe(true);
  });

  it("rejects teacher_id that looks like a UUID but has wrong format", () => {
    expect(rejected(valid({ teacher_id: "550e8400-e29b-41d4-a716" }))).toBe(true);
  });
});

// ── check_in_time (optional) ──────────────────────────────────────────────────

describe("teacherAttendanceRecordSchema — check_in_time field", () => {
  it('accepts optional check_in_time "09:30"', () => {
    expect(accepted(valid({ check_in_time: "09:30" }))).toBe(true);
  });

  it('accepts check_in_time "00:00"', () => {
    expect(accepted(valid({ check_in_time: "00:00" }))).toBe(true);
  });

  it('accepts check_in_time "23:59"', () => {
    expect(accepted(valid({ check_in_time: "23:59" }))).toBe(true);
  });

  it("accepts null check_in_time (optional/nullable)", () => {
    expect(accepted(valid({ check_in_time: null }))).toBe(true);
  });

  it("accepts missing check_in_time (optional)", () => {
    expect(accepted(valid())).toBe(true);
  });

  it('rejects check_in_time "9:30" (missing leading zero)', () => {
    expect(rejected(valid({ check_in_time: "9:30" }))).toBe(true);
  });

  it('rejects check_in_time "09:30:00" (includes seconds)', () => {
    expect(rejected(valid({ check_in_time: "09:30:00" }))).toBe(true);
  });

  it('rejects check_in_time "not-a-time"', () => {
    expect(rejected(valid({ check_in_time: "not-a-time" }))).toBe(true);
  });
});

// ── check_out_time (optional) ─────────────────────────────────────────────────

describe("teacherAttendanceRecordSchema — check_out_time field", () => {
  it('accepts optional check_out_time "17:00"', () => {
    expect(accepted(valid({ check_out_time: "17:00" }))).toBe(true);
  });

  it("accepts null check_out_time", () => {
    expect(accepted(valid({ check_out_time: null }))).toBe(true);
  });

  it("accepts missing check_out_time", () => {
    expect(accepted(valid())).toBe(true);
  });

  it("accepts both check_in_time and check_out_time together", () => {
    expect(
      accepted(valid({ check_in_time: "08:00", check_out_time: "16:00" })),
    ).toBe(true);
  });

  it('rejects invalid check_out_time "5pm"', () => {
    expect(rejected(valid({ check_out_time: "5pm" }))).toBe(true);
  });
});

// ── notes (optional, max 500 chars) ──────────────────────────────────────────

describe("teacherAttendanceRecordSchema — notes field", () => {
  it("accepts notes within 500 characters", () => {
    expect(accepted(valid({ notes: "A".repeat(500) }))).toBe(true);
  });

  it("accepts short notes", () => {
    expect(accepted(valid({ notes: "Arrived on time." }))).toBe(true);
  });

  it("accepts null notes", () => {
    expect(accepted(valid({ notes: null }))).toBe(true);
  });

  it("accepts missing notes", () => {
    expect(accepted(valid())).toBe(true);
  });

  it("rejects notes exceeding 500 characters", () => {
    expect(rejected(valid({ notes: "A".repeat(501) }))).toBe(true);
  });
});

// ── Full valid record ─────────────────────────────────────────────────────────

describe("teacherAttendanceRecordSchema — full valid record", () => {
  it("accepts a fully populated valid record", () => {
    expect(
      accepted({
        teacher_id: VALID_UUID,
        status: "late",
        check_in_time: "09:15",
        check_out_time: "16:45",
        notes: "Arrived 15 minutes late due to traffic.",
      }),
    ).toBe(true);
  });

  it("accepts a minimal record with only required fields", () => {
    expect(
      accepted({
        teacher_id: VALID_UUID,
        status: "present",
      }),
    ).toBe(true);
  });
});
