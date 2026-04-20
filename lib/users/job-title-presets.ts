import type { PageCode } from "@/lib/authorization/page-access";
import type { Permission, UserRole } from "@/types/roles";

export type UserJobTitlePreset = {
  id: string;
  label: string;
  description: string;
  jobTitle: string;
  role: UserRole;
  permissions: Permission[];
  allowedPages: PageCode[];
};

export const JOB_TITLE_PRESETS: UserJobTitlePreset[] = [
  {
    id: "accountant",
    label: "محاسب",
    description: "وصول إلى الحسابات والمصروفات والتقارير المالية ضمن شريط جانبي محدود.",
    jobTitle: "محاسب",
    role: "admin",
    permissions: [
      "view_payments",
      "add_payments",
      "delete_payments",
      "view_expenses",
      "add_expenses",
      "delete_expenses",
      "view_reports",
      "export_reports",
    ],
    allowedPages: ["payments", "expenses", "reports"],
  },
  {
    id: "attendance-officer",
    label: "مسؤول حضور",
    description: "وصول مخصص إلى صفحة الحضور فقط بدون قائمة جانبية.",
    jobTitle: "مسؤول حضور",
    role: "employee",
    permissions: [
      "view_attendance",
      "take_attendance",
      "edit_attendance",
      "export_attendance",
    ],
    allowedPages: ["attendance"],
  },
  {
    id: "student-affairs",
    label: "شؤون الطلاب",
    description: "وصول إلى إدارة الطلاب فقط مع صلاحيات إدخال وتعديل وحذف السجلات.",
    jobTitle: "شؤون الطلاب",
    role: "employee",
    permissions: [
      "view_students",
      "add_students",
      "edit_students",
      "delete_students",
    ],
    allowedPages: ["students"],
  },
  {
    id: "hr",
    label: "HR / الرواتب",
    description: "وصول إلى الأساتذة والرواتب والتقارير المرتبطة بهما.",
    jobTitle: "مسؤول HR والرواتب",
    role: "admin",
    permissions: [
      "view_teachers",
      "manage_teachers",
      "view_salaries",
      "manage_salaries",
      "view_reports",
      "export_reports",
    ],
    allowedPages: ["teachers", "salaries", "reports"],
  },
];

export function findJobTitlePresetById(presetId: string | null | undefined) {
  if (!presetId) {
    return null;
  }

  return JOB_TITLE_PRESETS.find((preset) => preset.id === presetId) ?? null;
}
