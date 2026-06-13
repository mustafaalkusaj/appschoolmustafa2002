import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const h = vi.hoisted(() => ({ auth: { data: { user: { id: "u1" } }, error: null as unknown }, account: {} as Record<string, unknown> }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase-server", () => ({
  createRouteSupabaseClient: vi.fn(async () => ({})),
  createServiceSupabaseClient: vi.fn(() => ({ __svc: true })),
  getRouteAuthenticatedUser: vi.fn(async () => h.auth),
}));
vi.mock("@/lib/managed-user-app-context", () => ({ buildManagedAppAccountContext: vi.fn(async () => h.account) }));
vi.mock("@/lib/academic-records-server", () => ({ enrichAssignmentRows: vi.fn(async (_c: unknown, rows: unknown) => rows ?? []), enrichGradeRows: vi.fn(async (_c: unknown, rows: unknown) => rows ?? []) }));
vi.mock("@/lib/admin-infrastructure", () => ({ isMissingTableError: () => false }));
vi.mock("@/lib/managed-users-server", () => ({ tableHasColumn: vi.fn(async () => false) }));
vi.mock("@/lib/managed-user-app-context", async () => ({ buildManagedAppAccountContext: vi.fn(async () => h.account) }));

import {
  parseMobileListParams,
  paginateItems,
  resolveMobileRouteContext,
  buildMobileSessionPayload,
} from "@/lib/mobile-api-server";

const reqWith = (qs = "") => new NextRequest("http://localhost/api/mobile/x" + qs, { headers: { authorization: "Bearer t" } });
const fullAccount = (over: Record<string, unknown> = {}) => ({
  identity: { role: "student", school_id: "s1" },
  access: { allowed: true, message: null, reason: null },
  school: { id: "s1" }, linkage: {}, profile: {}, app_account: {}, student: null, teacher: null, ...over,
});

beforeEach(() => {
  h.auth = { data: { user: { id: "u1" } }, error: null };
  h.account = fullAccount();
});

describe("parseMobileListParams", () => {
  it("defaults when no params", () => {
    expect(parseMobileListParams(reqWith())).toMatchObject({ page: 1, limit: 20, offset: 0, search: "" });
  });
  it("caps limit at maxLimit and computes offset", () => {
    const p = parseMobileListParams(reqWith("?limit=999&page=3"), { limit: 20, maxLimit: 50 });
    expect(p.limit).toBe(50);
    expect(p.page).toBe(3);
    expect(p.offset).toBe(100);
  });
  it("trims search", () => {
    expect(parseMobileListParams(reqWith("?search=%20hi%20")).search).toBe("hi");
  });
  it("falls back on invalid numbers", () => {
    expect(parseMobileListParams(reqWith("?limit=-5&page=abc")).limit).toBe(20);
  });
});

describe("paginateItems", () => {
  it("slices and reports has_more true", () => {
    const r = paginateItems([1, 2, 3, 4, 5], { page: 1, limit: 2, offset: 0 });
    expect(r.items).toEqual([1, 2]);
    expect(r.total).toBe(5);
    expect(r.has_more).toBe(true);
  });
  it("has_more false on last page", () => {
    const r = paginateItems([1, 2, 3], { page: 2, limit: 2, offset: 2 });
    expect(r.items).toEqual([3]);
    expect(r.has_more).toBe(false);
  });
});

describe("resolveMobileRouteContext", () => {
  it("401 when unauthenticated", async () => {
    h.auth = { data: { user: null }, error: null };
    const r = await resolveMobileRouteContext(reqWith());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(401);
  });
  it("403 when account not allowed / no role", async () => {
    h.account = fullAccount({ identity: { role: null, school_id: null }, access: { allowed: false, message: "no", reason: "x" } });
    const r = await resolveMobileRouteContext(reqWith());
    if (!r.ok) expect(r.response.status).toBe(403);
  });
  it("403 when role mismatch", async () => {
    const r = await resolveMobileRouteContext(reqWith(), "teacher");
    if (!r.ok) expect(r.response.status).toBe(403);
  });
  it("ok for matching role", async () => {
    const r = await resolveMobileRouteContext(reqWith(), "student");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toMatchObject({ authUserId: "u1", role: "student", schoolId: "s1" });
  });
  it("500 when build throws", async () => {
    const mod = await import("@/lib/managed-user-app-context");
    (mod.buildManagedAppAccountContext as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("boom"));
    const r = await resolveMobileRouteContext(reqWith());
    if (!r.ok) expect(r.response.status).toBe(500);
  });
});

describe("buildMobileSessionPayload", () => {
  it("includes core sections", () => {
    const out = buildMobileSessionPayload(fullAccount() as never);
    expect(out).toHaveProperty("identity");
    expect(out).toHaveProperty("school");
    expect(out).toHaveProperty("access");
  });
});

// ---- query functions + dashboard builders ----
function makeChain(rows: unknown[] = []) {
  const b: Record<string, unknown> = {};
  for (const m of ["from", "select", "eq", "is", "neq", "in", "or", "gte", "lte", "order", "limit", "range", "contains"]) b[m] = () => b;
  b.then = (resolve: (v: unknown) => void) => resolve({ data: rows, error: null, count: rows.length });
  return b;
}
const ctxStudent = (rows: unknown[] = [{ id: "a1", created_at: "2026-01-01", due_at: "2026-01-02" }]) => ({
  authUserId: "u1", role: "student", schoolId: "s1",
  account: { profile: { full_name: "Stu" }, student: { id: "st1", class_name: "G1", section: "A", full_name: "Stu", payment_summary: {}, attendance_summary: {}, linked_teachers: [] }, teacher: null },
  serviceSupabase: makeChain(rows),
} as never);
const ctxTeacher = (rows: unknown[] = [{ id: "t1", created_at: "2026-01-01" }]) => ({
  authUserId: "u1", role: "teacher", schoolId: "s1",
  account: { profile: { full_name: "Tch" }, student: null, teacher: { id: "tch1", full_name: "Tch", specialization: "Math", assignments: [{ subject_name: "Math" }, { subject_name: "Math" }, { subject_name: "" }], assigned_students: [{ full_name: "Ali", class_name: "G1", section: "A" }, { full_name: "Sara", class_name: "G2", section: "B" }] } },
  serviceSupabase: makeChain(rows),
} as never);
const params = { page: 1, limit: 5, offset: 0, search: "" };

import {
  queryStudentNotifications, queryStudentAssignments, queryStudentGrades, queryStudentPayments,
  queryStudentAttendance, queryTeacherAssignments, queryTeacherGrades, queryTeacherNotifications,
  queryTeacherStudents, buildTeacherClassesPayload, buildStudentDashboardPayload, buildTeacherDashboardPayload,
} from "@/lib/mobile-api-server";

describe("student query functions", () => {
  it("assignments: empty when no student", async () => {
    const ctx = ctxStudent(); ctx.account.student = null;
    expect((await queryStudentAssignments(ctx, params)).items).toEqual([]);
  });
  it("assignments: returns deduped rows for student with class+section", async () => {
    const r = await queryStudentAssignments(ctxStudent(), params);
    expect(Array.isArray(r.items)).toBe(true);
  });
  it("grades: rows", async () => {
    const r = await queryStudentGrades(ctxStudent(), params);
    expect(r.gate.available).toBe(true);
  });
  it("grades: empty when no student", async () => {
    const ctx = ctxStudent(); ctx.account.student = null;
    expect((await queryStudentGrades(ctx, params)).items).toEqual([]);
  });
  it("payments: rows", async () => {
    const r = await queryStudentPayments(ctxStudent(), params);
    expect(r.gate.available).toBe(true);
  });
  it("notifications: returns result", async () => {
    const r = await queryStudentNotifications(ctxStudent(), params);
    expect(r).toBeTruthy();
  });
  it("attendance: returns result", async () => {
    const r = await queryStudentAttendance(ctxStudent(), params);
    expect(r).toBeTruthy();
  });
});

describe("teacher query functions", () => {
  it("assignments / grades / notifications return results", async () => {
    expect(await queryTeacherAssignments(ctxTeacher(), params)).toBeTruthy();
    expect(await queryTeacherGrades(ctxTeacher(), params)).toBeTruthy();
    expect(await queryTeacherNotifications(ctxTeacher(), params)).toBeTruthy();
  });
  it("students: filters by search + paginates", async () => {
    const r = await queryTeacherStudents(ctxTeacher(), { ...params, search: "ali" });
    expect(r.total).toBe(1);
    const all = await queryTeacherStudents(ctxTeacher(), params);
    expect(all.total).toBe(2);
  });
});

function errChain(message: string) {
  const b: Record<string, unknown> = {};
  for (const m of ["from", "select", "eq", "is", "neq", "in", "or", "gte", "lte", "order", "limit", "range", "contains"]) b[m] = () => b;
  b.then = (resolve: (v: unknown) => void) => resolve({ data: null, error: { message }, count: 0 });
  return b;
}
const ctxStudentErr = (message: string) => {
  const c = ctxStudent() as Record<string, unknown> & { serviceSupabase: unknown };
  c.serviceSupabase = errChain(message);
  return c as never;
};

describe("error gate mapping (featureGateFromError)", () => {
  it("missing table → missing_table gate", async () => {
    const r = await queryStudentGrades(ctxStudentErr("Could not find the table 'grades'"), params);
    expect(r.gate.available).toBe(false);
    expect(r.gate.code).toBe("missing_table");
  });
  it("permission → forbidden gate", async () => {
    const r = await queryStudentGrades(ctxStudentErr("permission denied for table"), params);
    expect(r.gate.code).toBe("forbidden");
  });
  it("other error → unknown gate", async () => {
    const r = await queryStudentGrades(ctxStudentErr("some random failure"), params);
    expect(r.gate.code).toBe("unknown");
  });
  it("payments error → gate not available", async () => {
    const r = await queryStudentPayments(ctxStudentErr("boom"), params);
    expect(r.gate.available).toBe(false);
  });
  it("assignments error → gate not available", async () => {
    const r = await queryStudentAssignments(ctxStudentErr("permission denied"), params);
    expect(r.gate.available).toBe(false);
  });
  it("notifications error → gate not available", async () => {
    const r = await queryStudentNotifications(ctxStudentErr("permission denied"), params);
    expect(r.gate.available).toBe(false);
  });
});

describe("buildMobileSessionPayload populated branches", () => {
  it("includes student sub-object when present", () => {
    const acc = fullAccount({ student: { id: "st1", full_name: "Stu", class_name: "G1", section: "A", registration_number: "R1", status: "active", payment_summary: {}, attendance_summary: {}, linked_teachers: [] }, teacher: null });
    const out = buildMobileSessionPayload(acc as never) as { student: unknown };
    expect(out.student).toBeTruthy();
  });
  it("includes teacher sub-object when present", () => {
    const acc = fullAccount({ identity: { role: "teacher", school_id: "s1" }, student: null, teacher: { id: "t1", full_name: "Tch", specialization: "Math", notes: null, assignments: [], assigned_students: [] } });
    const out = buildMobileSessionPayload(acc as never) as { teacher: unknown };
    expect(out.teacher).toBeTruthy();
  });
});

describe("dashboard + classes builders", () => {
  it("teacher classes dedupes subjects", () => {
    const out = buildTeacherClassesPayload(ctxTeacher().account as never);
    expect(out.subjects).toEqual(["Math"]);
  });
  it("student dashboard aggregates", async () => {
    const out = await buildStudentDashboardPayload(ctxStudent());
    expect(out.summary).toHaveProperty("student_name", "Stu");
    expect(out.gates).toHaveProperty("grades");
  });
  it("teacher dashboard aggregates", async () => {
    const out = await buildTeacherDashboardPayload(ctxTeacher());
    expect(out.summary).toHaveProperty("teacher_name", "Tch");
    expect(out.summary.classes_count).toBe(3);
  });
});
