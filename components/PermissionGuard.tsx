"use client";

import { usePermission } from "@/hooks/usePermission";

interface PermissionGuardProps {
  /** Dotted permission key, e.g. "students.create" or "students.view_phone" */
  permission: string;
  /** Rendered when permission is denied. Defaults to null. */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Conditionally renders children based on a deep permission check.
 *
 * @example
 *   <PermissionGuard permission="students.view_phone" fallback={<span>••••••••</span>}>
 *     {student.phone}
 *   </PermissionGuard>
 *
 *   <PermissionGuard permission="students.create">
 *     <AddStudentButton />
 *   </PermissionGuard>
 */
export function PermissionGuard({ permission, fallback = null, children }: PermissionGuardProps) {
  const allowed = usePermission(permission);
  return <>{allowed ? children : fallback}</>;
}
