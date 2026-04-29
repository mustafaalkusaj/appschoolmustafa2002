import { describe, expect, it } from "vitest";

import { buildStudentInsertPayloads } from "@/lib/api/student-import";

describe("student import payloads", () => {
  it("binds imported students to the resolved branch", () => {
    const payloads = buildStudentInsertPayloads(
      [
        {
          fullName: "أحمد علي",
          className: "الأول متوسط",
          sectionName: "أ",
          phoneNumber: null,
          dateOfBirth: null,
          gender: null,
          address: "بغداد",
          parentName: null,
          parentPhone: null,
          notes: null,
        },
      ],
      "school-1",
      "branch-a",
      new Date("2026-04-22T06:00:00.000Z"),
    );

    expect(payloads).toHaveLength(1);
    expect(payloads[0]).toMatchObject({
      schoolId: "school-1",
      branchId: "branch-a",
      nameAr: "أحمد علي",
      classId: null, // Will be set by worker during validation
      status: "active",
      createdAt: "2026-04-22T06:00:00.000Z",
      updatedAt: "2026-04-22T06:00:00.000Z",
    });
  });
});

