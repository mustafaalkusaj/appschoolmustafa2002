import type { StudentWithFees, StudentActionItem } from "../_types";

interface GetStudentActionsOptions {
  student: StudentWithFees;
  activeTab: string;
  locale: "ar" | "en";
  isReadOnlyView: boolean;
  canEditStudents: boolean;
  canDeleteStudents: boolean;
  canManageStudentAccounts: boolean;
  onPrint: (s: StudentWithFees) => void;
  onChangeStatus: (s: StudentWithFees, status: StudentWithFees["status"], msg: string) => void;
  onOpenEdit: (s: StudentWithFees) => void;
  onOpenCredentials: (s: StudentWithFees) => void;
  onInitDelete: (s: StudentWithFees) => void;
  setActiveMenu: (menu: string | null) => void;
}

export function getStudentActions(options: GetStudentActionsOptions): StudentActionItem[] {
  const {
    student,
    activeTab,
    locale,
    isReadOnlyView,
    canEditStudents,
    canDeleteStudents,
    canManageStudentAccounts,
    onPrint,
    onChangeStatus,
    onOpenEdit,
    onOpenCredentials,
    onInitDelete,
    setActiveMenu,
  } = options;
  const copy = locale === "en"
    ? {
        credentials: "Account card",
        print: "Print",
        transfer: "Transfer student",
        transferSuccess: "Student transferred successfully.",
        suspend: "Suspend student",
        suspendSuccess: "Student suspended successfully.",
        edit: "Edit",
        delete: "Delete",
        restore: "Restore student",
        restoreSuccess: "Student restored successfully.",
        reactivate: "Reactivate student",
        reactivateSuccess: "Student reactivated successfully.",
      }
    : {
        credentials: "بطاقة الدخول",
        print: "طباعة",
        transfer: "نقل الطالب",
        transferSuccess: "تم نقل الطالب ✓",
        suspend: "توقيف الطالب",
        suspendSuccess: "تم توقيف الطالب ✓",
        edit: "تعديل",
        delete: "حذف",
        restore: "استعادة الطالب",
        restoreSuccess: "تم استعادة الطالب ✓",
        reactivate: "إعادة التفعيل",
        reactivateSuccess: "تم تفعيل الطالب ✓",
      };

  const credentialActions: StudentActionItem[] = canManageStudentAccounts
    ? [
        {
          icon: "🔐",
          label: copy.credentials,
          fn: () => {
            onOpenCredentials(student);
            setActiveMenu(null);
          },
        },
      ]
    : [];

  const printAction: StudentActionItem = {
    icon: "🖨️",
    label: copy.print,
    fn: () => {
      onPrint(student);
      setActiveMenu(null);
    },
  };

  if (isReadOnlyView) {
    return [...credentialActions, printAction];
  }

  if (activeTab === "active") {
    return [
      ...credentialActions,
      printAction,
      ...(canEditStudents
        ? [
            {
              icon: "📦",
              label: copy.transfer,
              fn: () => {
                onChangeStatus(student, "transferred", copy.transferSuccess);
                setActiveMenu(null);
              },
            },
            {
              icon: "⏸️",
              label: copy.suspend,
              fn: () => {
                onChangeStatus(student, "suspended", copy.suspendSuccess);
                setActiveMenu(null);
              },
            },
            {
              icon: "✏️",
              label: copy.edit,
              fn: () => onOpenEdit(student),
            },
          ]
        : []),
      ...(canDeleteStudents
        ? [
            { sep: true as const },
            {
              icon: "🗑️",
              label: copy.delete,
              danger: true,
              fn: () => {
                onInitDelete(student);
                setActiveMenu(null);
              },
            },
          ]
        : []),
    ];
  }

  if (activeTab === "transferred") {
    return [
      ...credentialActions,
      printAction,
      ...(canEditStudents
        ? [
            {
              icon: "↩️",
              label: copy.restore,
              fn: () => {
                onChangeStatus(student, "active", copy.restoreSuccess);
                setActiveMenu(null);
              },
            },
            {
              icon: "✏️",
              label: copy.edit,
              fn: () => onOpenEdit(student),
            },
          ]
        : []),
    ];
  }

  if (activeTab === "suspended") {
    return [
      ...credentialActions,
      printAction,
      ...(canEditStudents
        ? [
            {
              icon: "↩️",
              label: copy.reactivate,
              fn: () => {
                onChangeStatus(student, "active", copy.reactivateSuccess);
                setActiveMenu(null);
              },
            },
            {
              icon: "✏️",
              label: copy.edit,
              fn: () => onOpenEdit(student),
            },
          ]
        : []),
    ];
  }

  if (activeTab === "deleted" && canEditStudents) {
    return [
      {
        icon: "↩️",
        label: copy.restore,
        fn: () => {
          onChangeStatus(student, "active", copy.restoreSuccess);
          setActiveMenu(null);
        },
      },
    ];
  }

  return [];
}
