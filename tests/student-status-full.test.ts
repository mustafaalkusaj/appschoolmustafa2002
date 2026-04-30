import { describe, it, expect, vi } from "vitest";
import { getStudentActions } from "@/app/[locale]/students/_utils/getStudentActions";
import type { StudentWithFees } from "@/app/[locale]/students/_types";

const createMockStudent = (overrides: Partial<StudentWithFees> = {}): StudentWithFees => ({
  id: "test-student-1",
  school_id: "school-1",
  branch_id: "branch-1",
  auth_user_id: null,
  full_name: "Test Student",
  class_name: "Grade 5",
  section: "A",
  phone: "05550123456",
  address: "Baghdad",
  status: "active",
  total_fee: 1000,
  paid_fee: 500,
  discount_value: 0,
  remaining_fee: 500,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe("Student Status Actions - Full Coverage", () => {
  describe("Active Tab Actions", () => {
    it("should show transfer, suspend, edit, and delete for active student", () => {
      const student = createMockStudent({ status: "active" });
      const handlers = {
        onPrint: vi.fn(),
        onInitTransfer: vi.fn(),
        onInitSuspend: vi.fn(),
        onInitRestore: vi.fn(),
        onOpenEdit: vi.fn(),
        onOpenCredentials: vi.fn(),
        onInitDelete: vi.fn(),
        setActiveMenu: vi.fn(),
      };

      const actions = getStudentActions({
        student,
        activeTab: "active",
        locale: "ar",
        isReadOnlyView: false,
        canEditStudents: true,
        canDeleteStudents: true,
        canManageStudentAccounts: false,
        ...handlers,
      });

      // Should have: credentials, print, transfer, suspend, edit, separator, delete
      expect(actions.length).toBeGreaterThan(5);

      // Check for transfer action
      const transferAction = actions.find(
        (a) => "label" in a && a.label?.includes("نقل")
      );
      expect(transferAction).toBeTruthy();
      transferAction?.fn?.();
      expect(handlers.onInitTransfer).toHaveBeenCalledWith(student);

      // Check for suspend action
      const suspendAction = actions.find(
        (a) => "label" in a && a.label?.includes("توقيف")
      );
      expect(suspendAction).toBeTruthy();
      suspendAction?.fn?.();
      expect(handlers.onInitSuspend).toHaveBeenCalledWith(student);

      // Check for delete action
      const deleteAction = actions.find(
        (a) => "label" in a && a.label?.includes("حذف") && a.danger === true
      );
      expect(deleteAction).toBeTruthy();
      deleteAction?.fn?.();
      expect(handlers.onInitDelete).toHaveBeenCalledWith(student);
    });

    it("should not show actions if no edit permission", () => {
      const student = createMockStudent({ status: "active" });
      const handlers = {
        onPrint: vi.fn(),
        onInitTransfer: vi.fn(),
        onInitSuspend: vi.fn(),
        onInitRestore: vi.fn(),
        onOpenEdit: vi.fn(),
        onOpenCredentials: vi.fn(),
        onInitDelete: vi.fn(),
        setActiveMenu: vi.fn(),
      };

      const actions = getStudentActions({
        student,
        activeTab: "active",
        locale: "ar",
        isReadOnlyView: false,
        canEditStudents: false, // No permission
        canDeleteStudents: false,
        canManageStudentAccounts: false,
        ...handlers,
      });

      // Should only have print (and credentials if admin)
      const transferAction = actions.find(
        (a) => "label" in a && a.label?.includes("نقل")
      );
      expect(transferAction).toBeUndefined();
    });
  });

  describe("Suspended Tab Actions", () => {
    it("should show reactivate and edit for suspended student", () => {
      const student = createMockStudent({ status: "suspended" });
      const handlers = {
        onPrint: vi.fn(),
        onInitTransfer: vi.fn(),
        onInitSuspend: vi.fn(),
        onInitRestore: vi.fn(),
        onOpenEdit: vi.fn(),
        onOpenCredentials: vi.fn(),
        onInitDelete: vi.fn(),
        setActiveMenu: vi.fn(),
      };

      const actions = getStudentActions({
        student,
        activeTab: "suspended",
        locale: "ar",
        isReadOnlyView: false,
        canEditStudents: true,
        canDeleteStudents: true,
        canManageStudentAccounts: false,
        ...handlers,
      });

      // Check for reactivate action
      const reactivateAction = actions.find(
        (a) => "label" in a && a.label?.includes("إعادة التفعيل")
      );
      expect(reactivateAction).toBeTruthy();
      reactivateAction?.fn?.();
      expect(handlers.onInitRestore).toHaveBeenCalledWith(student);
    });

    it("should route reactivate through restore handler", () => {
      const student = createMockStudent({ status: "suspended" });
      const onInitRestore = vi.fn();
      const onInitSuspend = vi.fn();

      const actions = getStudentActions({
        student,
        activeTab: "suspended",
        locale: "ar",
        isReadOnlyView: false,
        canEditStudents: true,
        canDeleteStudents: false,
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

      const reactivateAction = actions.find(
        (a) => "label" in a && a.label?.includes("إعادة")
      );
      reactivateAction?.fn?.();

      expect(onInitRestore).toHaveBeenCalledWith(student);
      expect(onInitSuspend).not.toHaveBeenCalled();
    });
  });

  describe("Transferred Tab Actions", () => {
    it("should show restore for transferred student", () => {
      const student = createMockStudent({ status: "transferred" });
      const handlers = {
        onPrint: vi.fn(),
        onInitTransfer: vi.fn(),
        onInitSuspend: vi.fn(),
        onInitRestore: vi.fn(),
        onOpenEdit: vi.fn(),
        onOpenCredentials: vi.fn(),
        onInitDelete: vi.fn(),
        setActiveMenu: vi.fn(),
      };

      const actions = getStudentActions({
        student,
        activeTab: "transferred",
        locale: "ar",
        isReadOnlyView: false,
        canEditStudents: true,
        canDeleteStudents: false,
        canManageStudentAccounts: false,
        ...handlers,
      });

      const restoreAction = actions.find(
        (a) => "label" in a && a.label?.includes("استعادة")
      );
      expect(restoreAction).toBeTruthy();
      restoreAction?.fn?.();
      expect(handlers.onInitRestore).toHaveBeenCalledWith(student);
    });
  });

  describe("Deleted Tab Actions", () => {
    it("should show restore for deleted student", () => {
      const student = createMockStudent({ status: "deleted" });
      const handlers = {
        onPrint: vi.fn(),
        onInitTransfer: vi.fn(),
        onInitSuspend: vi.fn(),
        onInitRestore: vi.fn(),
        onOpenEdit: vi.fn(),
        onOpenCredentials: vi.fn(),
        onInitDelete: vi.fn(),
        setActiveMenu: vi.fn(),
      };

      const actions = getStudentActions({
        student,
        activeTab: "deleted",
        locale: "ar",
        isReadOnlyView: false,
        canEditStudents: true,
        canDeleteStudents: true,
        canManageStudentAccounts: false,
        ...handlers,
      });

      const restoreAction = actions.find(
        (a) => "label" in a && a.label?.includes("استعادة")
      );
      expect(restoreAction).toBeTruthy();
      restoreAction?.fn?.();
      expect(handlers.onInitRestore).toHaveBeenCalledWith(student);
    });

    it("should show delete permanently option with delete permission", () => {
      const student = createMockStudent({ status: "deleted" });
      const handlers = {
        onPrint: vi.fn(),
        onInitTransfer: vi.fn(),
        onInitSuspend: vi.fn(),
        onInitRestore: vi.fn(),
        onOpenEdit: vi.fn(),
        onOpenCredentials: vi.fn(),
        onInitDelete: vi.fn(),
        setActiveMenu: vi.fn(),
      };

      const actions = getStudentActions({
        student,
        activeTab: "deleted",
        locale: "ar",
        isReadOnlyView: false,
        canEditStudents: true,
        canDeleteStudents: true, // Has delete permission
        canManageStudentAccounts: false,
        ...handlers,
      });

      const permanentDeleteAction = actions.find(
        (a) => "label" in a && a.label?.includes("حذف نهائي")
      );
      expect(permanentDeleteAction).toBeTruthy();
      expect(permanentDeleteAction?.danger).toBe(true);
    });

    it("should NOT show delete permanently without permission", () => {
      const student = createMockStudent({ status: "deleted" });
      const handlers = {
        onPrint: vi.fn(),
        onInitTransfer: vi.fn(),
        onInitSuspend: vi.fn(),
        onInitRestore: vi.fn(),
        onOpenEdit: vi.fn(),
        onOpenCredentials: vi.fn(),
        onInitDelete: vi.fn(),
        setActiveMenu: vi.fn(),
      };

      const actions = getStudentActions({
        student,
        activeTab: "deleted",
        locale: "ar",
        isReadOnlyView: false,
        canEditStudents: true,
        canDeleteStudents: false, // No delete permission
        canManageStudentAccounts: false,
        ...handlers,
      });

      const permanentDeleteAction = actions.find(
        (a) => "label" in a && a.label?.includes("حذف نهائي")
      );
      expect(permanentDeleteAction).toBeUndefined();
    });
  });

  describe("Read-Only View", () => {
    it("should only show credentials and print in read-only mode", () => {
      const student = createMockStudent({ status: "active" });
      const handlers = {
        onPrint: vi.fn(),
        onInitTransfer: vi.fn(),
        onInitSuspend: vi.fn(),
        onInitRestore: vi.fn(),
        onOpenEdit: vi.fn(),
        onOpenCredentials: vi.fn(),
        onInitDelete: vi.fn(),
        setActiveMenu: vi.fn(),
      };

      const actions = getStudentActions({
        student,
        activeTab: "active",
        locale: "ar",
        isReadOnlyView: true, // Read-only
        canEditStudents: true,
        canDeleteStudents: true,
        canManageStudentAccounts: false,
        ...handlers,
      });

      // No action modifying buttons
      const transferAction = actions.find(
        (a) => "label" in a && a.label?.includes("نقل")
      );
      const suspendAction = actions.find(
        (a) => "label" in a && a.label?.includes("توقيف")
      );
      expect(transferAction).toBeUndefined();
      expect(suspendAction).toBeUndefined();
    });
  });

  describe("English Locale", () => {
    it("should show English action labels", () => {
      const student = createMockStudent({ status: "active" });
      const handlers = {
        onPrint: vi.fn(),
        onInitTransfer: vi.fn(),
        onInitSuspend: vi.fn(),
        onInitRestore: vi.fn(),
        onOpenEdit: vi.fn(),
        onOpenCredentials: vi.fn(),
        onInitDelete: vi.fn(),
        setActiveMenu: vi.fn(),
      };

      const actions = getStudentActions({
        student,
        activeTab: "active",
        locale: "en", // English
        isReadOnlyView: false,
        canEditStudents: true,
        canDeleteStudents: true,
        canManageStudentAccounts: false,
        ...handlers,
      });

      const transferAction = actions.find(
        (a) => "label" in a && a.label?.includes("Transfer")
      );
      expect(transferAction).toBeTruthy();
    });
  });

  describe("Credential Card Actions", () => {
    it("should show credentials button only for admin", () => {
      const student = createMockStudent({ status: "active" });
      const handlers = {
        onPrint: vi.fn(),
        onInitTransfer: vi.fn(),
        onInitSuspend: vi.fn(),
        onInitRestore: vi.fn(),
        onOpenEdit: vi.fn(),
        onOpenCredentials: vi.fn(),
        onInitDelete: vi.fn(),
        setActiveMenu: vi.fn(),
      };

      const actionsWithAdmin = getStudentActions({
        student,
        activeTab: "active",
        locale: "ar",
        isReadOnlyView: false,
        canEditStudents: true,
        canDeleteStudents: true,
        canManageStudentAccounts: true, // Admin
        ...handlers,
      });

      const credentialsAction = actionsWithAdmin.find(
        (a) => "label" in a && a.label?.includes("بطاقة")
      );
      expect(credentialsAction).toBeTruthy();

      const actionsWithoutAdmin = getStudentActions({
        student,
        activeTab: "active",
        locale: "ar",
        isReadOnlyView: false,
        canEditStudents: true,
        canDeleteStudents: true,
        canManageStudentAccounts: false, // Not admin
        ...handlers,
      });

      const nonAdminCredentials = actionsWithoutAdmin.find(
        (a) => "label" in a && a.label?.includes("بطاقة")
      );
      expect(nonAdminCredentials).toBeUndefined();
    });
  });

  describe("Menu Close Action", () => {
    it("should close menu after action", () => {
      const student = createMockStudent({ status: "active" });
      const setActiveMenu = vi.fn();

      const actions = getStudentActions({
        student,
        activeTab: "active",
        locale: "ar",
        isReadOnlyView: false,
        canEditStudents: true,
        canDeleteStudents: true,
        canManageStudentAccounts: false,
        onPrint: vi.fn(),
        onInitTransfer: vi.fn(),
        onInitSuspend: vi.fn(),
        onInitRestore: vi.fn(),
        onOpenEdit: vi.fn(),
        onOpenCredentials: vi.fn(),
        onInitDelete: vi.fn(),
        setActiveMenu,
      });

      const suspendAction = actions.find(
        (a) => "label" in a && a.label?.includes("توقيف")
      );
      suspendAction?.fn?.();

      expect(setActiveMenu).toHaveBeenCalledWith(null);
    });
  });
});
