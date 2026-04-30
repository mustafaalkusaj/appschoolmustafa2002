import { describe, expect, it, vi } from "vitest";

import { getStudentActions } from "@/app/[locale]/students/_utils/getStudentActions";
import type { StudentWithFees } from "@/app/[locale]/students/_types";

const student = {
  id: "student-1",
  full_name: "Test Student",
  class_name: "Grade 1",
  section: "A",
  status: "suspended",
} as StudentWithFees;

describe("student status actions", () => {
  it("routes restore actions through the restore handler", () => {
    const onInitRestore = vi.fn();
    const onInitSuspend = vi.fn();

    const actions = getStudentActions({
      student,
      activeTab: "suspended",
      locale: "ar",
      isReadOnlyView: false,
      canEditStudents: true,
      canDeleteStudents: true,
      canManageStudentAccounts: false,
      onPrint: vi.fn(),
      onInitTransfer: vi.fn(),
      onInitSuspend,
      onInitRestore,
      onOpenEdit: vi.fn(),
      onOpenCredentials: vi.fn(),
      onInitDelete: vi.fn(),
      setActiveMenu: vi.fn(),
    });

    const restoreAction = actions.find((action) => "label" in action && action.label === "إعادة التفعيل");
    expect(restoreAction).toBeTruthy();

    restoreAction?.fn?.();

    expect(onInitRestore).toHaveBeenCalledWith(student);
    expect(onInitSuspend).not.toHaveBeenCalled();
  });
});
