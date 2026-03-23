"use client";

import { hasAllPermissions, hasAnyPermission, hasPermission } from "@/lib/permissions";
import type { Permission, Role } from "@/lib/types";

import { useAuth } from "@/hooks/useAuth";

interface AccessOptions {
  permissions?: Permission[];
  roles?: Role[];
  requireAll?: boolean;
}

export function usePermissions() {
  const { user, isLoading } = useAuth();
  const permissionSet = user?.permissions ?? [];

  const can = (permission: Permission) => hasPermission(permissionSet, permission);
  const canAny = (permissions: Permission[]) => hasAnyPermission(permissionSet, permissions);
  const canAll = (permissions: Permission[]) => hasAllPermissions(permissionSet, permissions);

  const canAccess = ({ permissions = [], roles = [], requireAll = true }: AccessOptions) => {
    if (!user) {
      return false;
    }

    if (roles.length > 0 && !roles.includes(user.role)) {
      return false;
    }

    if (permissions.length === 0) {
      return true;
    }

    return requireAll ? canAll(permissions) : canAny(permissions);
  };

  return {
    user,
    isLoading,
    can,
    canAny,
    canAll,
    canAccess,
  };
}
