import type { BuiltInRole, Permission, PermissionGroup, Role } from "@/lib/types";

export const BUILTIN_ROLES: BuiltInRole[] = ["super_admin", "admin", "employee", "teacher"];

export const ALL_PERMISSIONS: Permission[] = [
  "view_students",
  "add_students",
  "edit_students",
  "delete_students",
  "view_payments",
  "add_payments",
  "delete_payments",
  "view_salaries",
  "manage_salaries",
  "manage_schools",
  "manage_subscriptions",
  "full_access",
];

export const ROLE_TEMPLATES: Record<BuiltInRole, Permission[]> = {
  super_admin: ["full_access", ...ALL_PERMISSIONS.filter((item) => item !== "full_access")],
  admin: [
    "view_students",
    "add_students",
    "edit_students",
    "delete_students",
    "view_payments",
    "add_payments",
    "delete_payments",
    "view_salaries",
    "manage_salaries",
  ],
  employee: ["view_students", "add_students", "edit_students", "view_payments", "add_payments"],
  teacher: ["view_students", "view_payments", "view_salaries"],
};

export const PERMISSION_GROUPS: Array<{
  key: PermissionGroup;
  permissions: Permission[];
}> = [
  {
    key: "students",
    permissions: ["view_students", "add_students", "edit_students", "delete_students"],
  },
  {
    key: "payments",
    permissions: ["view_payments", "add_payments", "delete_payments"],
  },
  {
    key: "salaries",
    permissions: ["view_salaries", "manage_salaries"],
  },
  {
    key: "schools",
    permissions: ["manage_schools"],
  },
  {
    key: "subscriptions",
    permissions: ["manage_subscriptions"],
  },
  {
    key: "system",
    permissions: ["full_access"],
  },
];

export function buildTemplatePermissions(role: Role): Permission[] {
  if (!isBuiltInRole(role)) {
    return [];
  }

  return [...ROLE_TEMPLATES[role]];
}

export function isBuiltInRole(role: Role): role is BuiltInRole {
  return BUILTIN_ROLES.includes(role as BuiltInRole);
}

export function normalizePermissions(permissions: Permission[]): Permission[] {
  const unique = new Set<Permission>(permissions);
  return ALL_PERMISSIONS.filter((permission) => unique.has(permission));
}

export function hasPermission(permissions: Permission[], required: Permission): boolean {
  return permissions.includes("full_access") || permissions.includes(required);
}

export function hasAnyPermission(permissions: Permission[], required: Permission[]): boolean {
  if (permissions.includes("full_access")) {
    return true;
  }

  return required.some((item) => permissions.includes(item));
}

export function hasAllPermissions(permissions: Permission[], required: Permission[]): boolean {
  if (permissions.includes("full_access")) {
    return true;
  }

  return required.every((item) => permissions.includes(item));
}
