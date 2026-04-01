import type { StudentWithFees, StudentActionItem } from "../_types";

interface GetStudentActionsOptions {
  student: StudentWithFees;
  activeTab: string;
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

  const credentialActions: StudentActionItem[] = canManageStudentAccounts
    ? [
        {
          icon: "🔐",
          label: "بطاقة الدخول",
          fn: () => {
            onOpenCredentials(student);
            setActiveMenu(null);
          },
        },
      ]
    : [];

  const printAction: StudentActionItem = {
    icon: "🖨️",
    label: "طباعة",
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
              label: "نقل الطالب",
              fn: () => {
                onChangeStatus(student, "transferred", "تم نقل الطالب ✓");
                setActiveMenu(null);
              },
            },
            {
              icon: "⏸️",
              label: "توقيف الطالب",
              fn: () => {
                onChangeStatus(student, "suspended", "تم توقيف الطالب ✓");
                setActiveMenu(null);
              },
            },
            {
              icon: "✏️",
              label: "تعديل",
              fn: () => onOpenEdit(student),
            },
          ]
        : []),
      ...(canDeleteStudents
        ? [
            { sep: true as const },
            {
              icon: "🗑️",
              label: "حذف",
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
              label: "استعادة الطالب",
              fn: () => {
                onChangeStatus(student, "active", "تم استعادة الطالب ✓");
                setActiveMenu(null);
              },
            },
            {
              icon: "✏️",
              label: "تعديل",
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
              label: "إعادة التفعيل",
              fn: () => {
                onChangeStatus(student, "active", "تم تفعيل الطالب ✓");
                setActiveMenu(null);
              },
            },
            {
              icon: "✏️",
              label: "تعديل",
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
        label: "استعادة الطالب",
        fn: () => {
          onChangeStatus(student, "active", "تم استعادة الطالب ✓");
          setActiveMenu(null);
        },
      },
    ];
  }

  return [];
}
