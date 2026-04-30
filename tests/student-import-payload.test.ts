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
      school_id: "school-1",
      branch_id: "branch-a",
      full_name: "أحمد علي",
      class_name: "الأول متوسط",
      status: "active",
      created_at: "2026-04-22T06:00:00.000Z",
    });
  });
});
