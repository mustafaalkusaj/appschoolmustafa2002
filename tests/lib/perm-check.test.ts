import { describe, it, expect } from "vitest";
import {
  checkPermission,
  canReadPage,
  getDataScope,
  filterFields,
  filterFieldsArray,
  STUDENT_FIELD_MAP,
  TEACHER_FIELD_MAP,
  PAYMENT_FIELD_MAP,
  SALARY_FIELD_MAP,
} from "@/lib/perm-check";
import type { DeepPermissionMap } from "@/types/deep-permissions";

const map: DeepPermissionMap = {
  students: {
    actions: { read: true, create: false },
    fields: { view_phone: true, view_fees: false },
    special: { export: true, print: false },
    data_scope: "own_class",
  },
} as unknown as DeepPermissionMap;

describe("checkPermission", () => {
  it("returns false for null/undefined map", () => {
    expect(checkPermission(null, "students.read")).toBe(false);
    expect(checkPermission(undefined, "students.read")).toBe(false);
  });
  it("returns false when key has no dot", () => {
    expect(checkPermission(map, "students")).toBe(false);
  });
  it("returns false for unknown page", () => {
    expect(checkPermission(map, "teachers.read")).toBe(false);
  });
  it("reads from actions", () => {
    expect(checkPermission(map, "students.read")).toBe(true);
    expect(checkPermission(map, "students.create")).toBe(false);
  });
  it("reads from fields", () => {
    expect(checkPermission(map, "students.view_phone")).toBe(true);
    expect(checkPermission(map, "students.view_fees")).toBe(false);
  });
  it("reads from special", () => {
    expect(checkPermission(map, "students.export")).toBe(true);
    expect(checkPermission(map, "students.print")).toBe(false);
  });
  it("returns false for unknown subkey", () => {
    expect(checkPermission(map, "students.nonexistent")).toBe(false);
  });
});

describe("canReadPage", () => {
  it("delegates to <page>.read", () => {
    expect(canReadPage(map, "students")).toBe(true);
    expect(canReadPage(map, "teachers")).toBe(false);
    expect(canReadPage(null, "students")).toBe(false);
  });
});

describe("getDataScope", () => {
  it("returns scope or null", () => {
    expect(getDataScope(map, "students")).toBe("own_class");
    expect(getDataScope(map, "teachers")).toBeNull();
    expect(getDataScope(null, "students")).toBeNull();
  });
});

describe("filterFields", () => {
  it("removes forbidden fields, keeps allowed", () => {
    const row = { id: "1", phone: "123", fees: 500, name: "A" };
    const out = filterFields(row, map, "students", { phone: "view_phone", fees: "view_fees" });
    expect(out.phone).toBe("123");
    expect(out).not.toHaveProperty("fees");
    expect(out.id).toBe("1");
    expect(out.name).toBe("A");
  });
  it("removes all mapped fields when map is null", () => {
    const row = { phone: "1", fees: 2 };
    const out = filterFields(row, null, "students", { phone: "view_phone", fees: "view_fees" });
    expect(out).not.toHaveProperty("phone");
    expect(out).not.toHaveProperty("fees");
  });
  it("does not mutate input", () => {
    const row = { phone: "1" };
    filterFields(row, null, "students", { phone: "view_phone" });
    expect(row.phone).toBe("1");
  });
});

describe("filterFieldsArray", () => {
  it("filters each element", () => {
    const rows = [{ phone: "1", fees: 9 }, { phone: "2", fees: 8 }];
    const out = filterFieldsArray(rows, map, "students", { phone: "view_phone", fees: "view_fees" });
    expect(out).toHaveLength(2);
    expect(out[0].phone).toBe("1");
    expect(out[0]).not.toHaveProperty("fees");
    expect(out[1].phone).toBe("2");
  });
});

describe("field map constants", () => {
  it("expose stable sensitive-field mappings", () => {
    expect(STUDENT_FIELD_MAP.phone).toBe("view_phone");
    expect(STUDENT_FIELD_MAP.total_fees).toBe("view_fees");
    expect(TEACHER_FIELD_MAP.salary).toBe("view_salary");
    expect(TEACHER_FIELD_MAP.bank_account).toBe("view_bank_account");
    expect(PAYMENT_FIELD_MAP.amount).toBe("view_amount");
    expect(SALARY_FIELD_MAP.net_salary).toBe("view_net");
  });
});
