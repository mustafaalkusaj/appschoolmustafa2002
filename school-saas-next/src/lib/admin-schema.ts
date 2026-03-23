import type { BuiltInRole, Permission } from "@/lib/types";
import { BUILTIN_ROLES, buildTemplatePermissions, normalizePermissions } from "@/lib/permissions";

export const ADMIN_TABLES = {
  roles: "admin_roles",
  schools: "admin_schools",
  subscriptions: "admin_school_subscriptions",
  users: "admin_users",
  notifications: "admin_notifications",
  auditLogs: "admin_audit_logs",
  settings: "admin_system_settings",
} as const;

export const RESERVED_ROLE_KEYS = new Set<BuiltInRole>(BUILTIN_ROLES);

export const DEFAULT_ROLE_DEFINITIONS: Array<{
  id: string;
  key: BuiltInRole;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
}> = [
  {
    id: "role-super-admin",
    key: "super_admin",
    name: "Super Admin",
    description: "Global control over schools, subscriptions, audit, and platform settings.",
    permissions: buildTemplatePermissions("super_admin"),
    isSystem: true,
  },
  {
    id: "role-admin",
    key: "admin",
    name: "School Admin",
    description: "Owns daily school operations, staff access, and finance approvals.",
    permissions: buildTemplatePermissions("admin"),
    isSystem: true,
  },
  {
    id: "role-employee",
    key: "employee",
    name: "Employee",
    description: "Handles day-to-day student and payment operations.",
    permissions: buildTemplatePermissions("employee"),
    isSystem: true,
  },
  {
    id: "role-teacher",
    key: "teacher",
    name: "Teacher",
    description: "Read-first access for classroom and payroll visibility.",
    permissions: buildTemplatePermissions("teacher"),
    isSystem: true,
  },
];

export function normalizeRoleKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizeRolePermissions(permissions: Permission[]): Permission[] {
  return normalizePermissions(permissions);
}
