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
  onInitTransfer: (s: StudentWithFees) => void;
  onInitSuspend: (s: StudentWithFees) => void;
  onInitRestore: (s: StudentWithFees) => void;
  onOpenEdit: (s: StudentWithFees) => void;
  onOpenCredentials: (s: StudentWithFees) => void;
  onInitDelete: (s: StudentWithFees) => void;
  onQuickPay: (s: StudentWithFees) => void;
  onCopyData: (s: StudentWithFees) => void;
  onWhatsApp: (s: StudentWithFees) => void;
  onViewPayments: (s: StudentWithFees) => void;
  onChangeClass: (s: StudentWithFees) => void;
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
    onInitTransfer,
    onInitSuspend,
    onInitRestore,
    onOpenEdit,
    onOpenCredentials,
    onInitDelete,
    onQuickPay,
    onCopyData,
    onWhatsApp,
    onViewPayments,
    onChangeClass,
    setActiveMenu,
  } = options;

  const copy = locale === "en"
    ? {
        credentials: "Account card",
        print: "Print",
        transfer: "Transfer student",
        suspend: "Suspend student",
        edit: "Edit",
        delete: "Delete",
        restore: "Restore student",
        reactivate: "Reactivate student",
        quickPay: "Add payment",
        copyData: "Copy data",
        whatsapp: "WhatsApp",
        viewPayments: "Payment history",
        changeClass: "Change class",
      }
    : {
        credentials: "بطاقة الدخول",
        print: "طباعة",
        transfer: "نقل الطالب",
        suspend: "توقيف الطالب",
        edit: "تعديل",
        delete: "حذف",
        restore: "استعادة الطالب",
        reactivate: "إعادة التفعيل",
        quickPay: "إضافة دفعة",
        copyData: "نسخ البيانات",
        whatsapp: "واتساب",
        viewPayments: "سجل الدفعات",
        changeClass: "تغيير الصف",
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

  // Extra utility actions available on all tabs
  const utilityActions: StudentActionItem[] = [
    { sep: true as const },
    {
      icon: "📊",
      label: copy.viewPayments,
      fn: () => {
        onViewPayments(student);
        setActiveMenu(null);
      },
    },
    {
      icon: "📋",
      label: copy.copyData,
      fn: () => {
        onCopyData(student);
        setActiveMenu(null);
      },
    },
    ...(student.phone
      ? [
          {
            icon: "💬",
            label: copy.whatsapp,
            fn: () => {
              onWhatsApp(student);
              setActiveMenu(null);
            },
          } as StudentActionItem,
        ]
      : []),
  ];

  if (isReadOnlyView) {
    return [...credentialActions, printAction, ...utilityActions];
  }

  if (activeTab === "active") {
    return [
      ...credentialActions,
      printAction,
      ...utilityActions,
      ...(canEditStudents
        ? [
            { sep: true as const },
            {
              icon: "🔄",
              label: copy.changeClass,
              fn: () => {
                onChangeClass(student);
                setActiveMenu(null);
              },
            },
            {
              icon: "📦",
              label: copy.transfer,
              fn: () => {
                onInitTransfer(student);
                setActiveMenu(null);
              },
            },
            {
              icon: "⏸️",
              label: copy.suspend,
              fn: () => {
                onInitSuspend(student);
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
            { sep: true as const },
            {
              icon: "↩️",
              label: copy.restore,
              fn: () => {
                onInitRestore(student);
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
            { sep: true as const },
            {
              icon: "↩️",
              label: copy.reactivate,
              fn: () => {
                onInitRestore(student);
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
          onInitRestore(student);
          setActiveMenu(null);
        },
      },
      ...(canDeleteStudents
        ? [
            { sep: true as const },
            {
              icon: "🗑️",
              label: locale === "en" ? "Delete permanently" : "حذف نهائي",
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

  return [];
}
