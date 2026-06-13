"use client";

import { useRole } from "@/hooks/useRole";
import { checkPermission, getDataScope } from "@/lib/perm-check";

/**
 * Check a single deep permission key.
 * @example
 *   const canCreate = usePermission("students.create");
 *   const canViewPhone = usePermission("students.view_phone");
 */
export function usePermission(permKey: string): boolean {
  const { profile } = useRole();
  return checkPermission(profile?.deepPermissions, permKey);
}

/**
 * Check multiple deep permission keys — returns true if ALL are granted.
 */
export function usePermissionAll(permKeys: string[]): boolean {
  const { profile } = useRole();
  return permKeys.every((key) => checkPermission(profile?.deepPermissions, key));
}

/**
 * Check multiple deep permission keys — returns true if ANY is granted.
 */
export function usePermissionAny(permKeys: string[]): boolean {
  const { profile } = useRole();
  return permKeys.some((key) => checkPermission(profile?.deepPermissions, key));
}

/**
 * Returns the effective data scope for a page.
 * @example
 *   const scope = useDataScope("students"); // "own_class" | "own_grade" | "all" | null
 */
export function useDataScope(pageKey: string): string | null {
  const { profile } = useRole();
  return getDataScope(profile?.deepPermissions, pageKey);
}
