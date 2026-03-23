import { buildTemplatePermissions, normalizePermissions } from "@/lib/permissions";
import { buildSubscriptionNotifications } from "@/lib/saas";
import { shiftReferenceDate } from "@/lib/date";
import type {
  AdminRole,
  AppUser,
  AuditLogEntry,
  School,
  SessionUser,
  SuperAdminSnapshot,
  SystemNotification,
  SystemSettings,
} from "@/lib/types";

export interface DashboardSeed {
  roles: AdminRole[];
  schools: School[];
  users: AppUser[];
  notifications: SystemNotification[];
  auditLogs: AuditLogEntry[];
  settings: SystemSettings;
}

const rolesSeed: AdminRole[] = [
  {
    id: "role-super-admin",
    key: "super_admin",
    name: "Super Admin",
    description: "Global access across the platform, billing, audit, and system settings.",
    permissions: buildTemplatePermissions("super_admin"),
    isSystem: true,
    createdAt: dateOffset(-260),
    updatedAt: dateOffset(-10),
    deletedAt: null,
  },
  {
    id: "role-admin",
    key: "admin",
    name: "School Admin",
    description: "Runs daily school operations, staff access, and finance workflows.",
    permissions: buildTemplatePermissions("admin"),
    isSystem: true,
    createdAt: dateOffset(-260),
    updatedAt: dateOffset(-10),
    deletedAt: null,
  },
  {
    id: "role-employee",
    key: "employee",
    name: "Employee",
    description: "Handles student records and payment collection tasks.",
    permissions: buildTemplatePermissions("employee"),
    isSystem: true,
    createdAt: dateOffset(-260),
    updatedAt: dateOffset(-10),
    deletedAt: null,
  },
  {
    id: "role-teacher",
    key: "teacher",
    name: "Teacher",
    description: "Read-focused access for classroom and salary visibility.",
    permissions: buildTemplatePermissions("teacher"),
    isSystem: true,
    createdAt: dateOffset(-260),
    updatedAt: dateOffset(-10),
    deletedAt: null,
  },
  {
    id: "role-registrar",
    key: "registrar",
    name: "Registrar",
    description: "Custom role for admission and records teams with no billing access.",
    permissions: normalizePermissions(["view_students", "add_students", "edit_students"]),
    isSystem: false,
    createdAt: dateOffset(-40),
    updatedAt: dateOffset(-8),
    deletedAt: null,
  },
];

const schoolsSeed: School[] = [
  {
    id: "school-1",
    name: "أكاديمية الشروق",
    code: "SUN-01",
    status: "active",
    studentCount: 812,
    monthlyRevenue: 18000,
    createdAt: dateOffset(-180),
    deletedAt: null,
    subscription: {
      id: "sub-1",
      schoolId: "school-1",
      plan: "yearly",
      startedAt: dateOffset(-150),
      expiresAt: dateOffset(20),
      amount: 12000,
      deletedAt: null,
    },
  },
  {
    id: "school-2",
    name: "مدارس النور الدولية",
    code: "NOR-04",
    status: "active",
    studentCount: 560,
    monthlyRevenue: 12400,
    createdAt: dateOffset(-130),
    deletedAt: null,
    subscription: {
      id: "sub-2",
      schoolId: "school-2",
      plan: "monthly",
      startedAt: dateOffset(-20),
      expiresAt: dateOffset(5),
      amount: 900,
      deletedAt: null,
    },
  },
  {
    id: "school-3",
    name: "مدرسة قادة المستقبل",
    code: "FTR-11",
    status: "suspended",
    studentCount: 410,
    monthlyRevenue: 9100,
    createdAt: dateOffset(-95),
    deletedAt: null,
    subscription: {
      id: "sub-3",
      schoolId: "school-3",
      plan: "monthly",
      startedAt: dateOffset(-40),
      expiresAt: dateOffset(-2),
      amount: 850,
      deletedAt: null,
    },
  },
  {
    id: "school-4",
    name: "كلية المسار المشرق",
    code: "BRG-22",
    status: "active",
    studentCount: 936,
    monthlyRevenue: 22100,
    createdAt: dateOffset(-60),
    deletedAt: null,
    subscription: {
      id: "sub-4",
      schoolId: "school-4",
      plan: "yearly",
      startedAt: dateOffset(-30),
      expiresAt: dateOffset(300),
      amount: 14000,
      deletedAt: null,
    },
  },
  {
    id: "school-5",
    name: "مدرسة الحكمة الأهلية",
    code: "WIS-18",
    status: "active",
    studentCount: 670,
    monthlyRevenue: 15400,
    createdAt: dateOffset(-30),
    deletedAt: null,
    subscription: {
      id: "sub-5",
      schoolId: "school-5",
      plan: "monthly",
      startedAt: dateOffset(-9),
      expiresAt: dateOffset(25),
      amount: 1100,
      deletedAt: null,
    },
  },
];

const usersSeed: AppUser[] = [
  {
    id: "user-1",
    name: "مصطفى",
    email: "superadmin@saas.local",
    role: "super_admin",
    permissions: buildTemplatePermissions("super_admin"),
    schoolId: null,
    status: "active",
    createdAt: dateOffset(-220),
    deletedAt: null,
  },
  {
    id: "user-2",
    name: "نورة",
    email: "admin@sunrise.local",
    role: "admin",
    permissions: buildTemplatePermissions("admin"),
    schoolId: "school-1",
    status: "active",
    createdAt: dateOffset(-120),
    deletedAt: null,
  },
  {
    id: "user-3",
    name: "أحمد",
    email: "employee@sunrise.local",
    role: "employee",
    permissions: buildTemplatePermissions("employee"),
    schoolId: "school-1",
    status: "active",
    createdAt: dateOffset(-90),
    deletedAt: null,
  },
  {
    id: "user-4",
    name: "سارة",
    email: "teacher@sunrise.local",
    role: "teacher",
    permissions: buildTemplatePermissions("teacher"),
    schoolId: "school-1",
    status: "active",
    createdAt: dateOffset(-70),
    deletedAt: null,
  },
  {
    id: "user-5",
    name: "هدى",
    email: "admin@future.local",
    role: "admin",
    permissions: normalizePermissions([
      ...buildTemplatePermissions("admin"),
      "manage_schools",
      "manage_subscriptions",
    ]),
    schoolId: "school-3",
    status: "active",
    createdAt: dateOffset(-65),
    deletedAt: null,
  },
  {
    id: "user-6",
    name: "موظف محظور",
    email: "blocked@school.local",
    role: "employee",
    permissions: buildTemplatePermissions("employee"),
    schoolId: "school-2",
    status: "blocked",
    createdAt: dateOffset(-20),
    deletedAt: null,
  },
];

const auditSeed: AuditLogEntry[] = [
  {
    id: "audit-1",
    actorId: "user-1",
    actorName: "مصطفى",
    action: "created_school",
    entity: "school",
    entityId: "school-5",
    createdAt: dateOffset(-14),
  },
  {
    id: "audit-2",
    actorId: "user-2",
    actorName: "نورة",
    action: "deleted_student",
    entity: "student",
    entityId: "std-991",
    createdAt: dateOffset(-6),
  },
  {
    id: "audit-3",
    actorId: "user-3",
    actorName: "أحمد",
    action: "recorded_payment",
    entity: "payment",
    entityId: "pay-551",
    createdAt: dateOffset(-3),
  },
  {
    id: "audit-4",
    actorId: "user-1",
    actorName: "مصطفى",
    action: "changed_system_settings",
    entity: "system",
    entityId: "settings-default",
    createdAt: dateOffset(-1),
  },
];

const settingsSeed: SystemSettings = {
  id: "settings-default",
  systemName: "منصة المدارس الذكية",
  logoUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=120&q=80",
  timezone: "Asia/Baghdad",
  currency: "USD",
  allowSelfRegistration: false,
  updatedAt: dateOffset(-1),
};

export function getAdminSeed(): SuperAdminSnapshot {
  const schools = structuredClone(schoolsSeed);
  const users = structuredClone(usersSeed);
  const notifications: SystemNotification[] = [
    ...buildSubscriptionNotifications(schools),
    {
      id: "notification-user-created",
      type: "user" as const,
      code: "user_onboarded" as const,
      data: {
        role: "employee",
        schoolName: "أكاديمية الشروق",
      },
      schoolId: "school-1",
      createdAt: dateOffset(-1),
      read: false,
      deletedAt: null,
    },
    {
      id: "notification-system-error",
      type: "system" as const,
      code: "system_warning" as const,
      schoolId: null,
      createdAt: dateOffset(-1),
      read: false,
      deletedAt: null,
    },
  ].map((notification) => ({
    ...notification,
    deletedAt: notification.deletedAt ?? null,
  }));

  return {
    roles: structuredClone(rolesSeed),
    schools,
    users,
    notifications,
    auditLogs: structuredClone(auditSeed),
    settings: structuredClone(settingsSeed),
    source: "mock",
  };
}

export function getDashboardSeed(): DashboardSeed {
  const seed = getAdminSeed();
  return {
    roles: seed.roles,
    schools: seed.schools,
    users: seed.users,
    notifications: seed.notifications,
    auditLogs: seed.auditLogs,
    settings: seed.settings,
  };
}

export function getDemoUsersForLogin(): Array<SessionUser & { schoolName: string | null }> {
  const { users, schools } = getAdminSeed();

  return users
    .filter((user) => !user.deletedAt)
    .map((user) => {
      const school = schools.find((item) => item.id === user.schoolId && !item.deletedAt) ?? null;
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: [...user.permissions],
        schoolId: user.schoolId,
        schoolStatus: school?.status ?? null,
        subscriptionExpiresAt: school?.subscription.expiresAt ?? null,
        status: user.status,
        schoolName: school?.name ?? null,
      };
    });
}

export function findSessionUserById(userId: string): SessionUser | null {
  const { users, schools } = getAdminSeed();
  const user = users.find((item) => item.id === userId && !item.deletedAt);

  if (!user) {
    return null;
  }

  const school = schools.find((item) => item.id === user.schoolId && !item.deletedAt) ?? null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: [...user.permissions],
    schoolId: user.schoolId,
    status: user.status,
    schoolStatus: school?.status ?? null,
    subscriptionExpiresAt: school?.subscription.expiresAt ?? null,
  };
}

function dateOffset(days: number): string {
  return shiftReferenceDate(days);
}
