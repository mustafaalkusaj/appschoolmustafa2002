"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useRole } from "@/hooks/useRole";
import {
  getAccessDecision,
  getDefaultRouteForProfile,
  hasPermission,
  hasAssignedPageScope,
  isBranchUserProfile,
  isGroupOverviewOnlyProfile,
  type Permission,
  type UserRole,
} from "@/lib/auth";
import { getLocaleFromPath, localizeAppPath } from "@/lib/locale-routing";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
  permission?: Permission;
  permissions?: Permission[];
  requireAllPermissions?: boolean;
  fallback?: React.ReactNode;
}

function resolveRedirect(
  reason: ReturnType<typeof getAccessDecision>["reason"],
  pathname: string,
  focusedDefaultPath?: string | null,
) {
  const locale = getLocaleFromPath(pathname);
  const safePath = pathname && pathname.startsWith("/") ? pathname : localizeAppPath("/", locale);

  if (reason === "unauthenticated") {
    return `${localizeAppPath("/login", locale)}?next=${encodeURIComponent(safePath)}`;
  }

  if (reason === "school_inactive" || reason === "subscription_expired") {
    return localizeAppPath("/subscription-expired", locale);
  }

  if (reason === "forbidden" && focusedDefaultPath) {
    return localizeAppPath(focusedDefaultPath, locale);
  }

  return localizeAppPath("/access-denied", locale);
}

export function ProtectedRoute({
  children,
  roles,
  permission,
  permissions,
  requireAllPermissions = false,
  fallback = null,
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const { profile, loading, canAny, canAll } = useRole();

  const access = getAccessDecision(profile, pathname);
  const roleDenied = Boolean(roles && (!profile || !roles.includes(profile.role)));
  const singlePermissionDenied = Boolean(permission && !hasPermission(profile, permission));
  const multiplePermissionsDenied = Boolean(
    permissions &&
      permissions.length > 0 &&
      (requireAllPermissions ? !canAll(permissions) : !canAny(permissions)),
  );

  const blockedReason =
    !access.allowed
      ? access.reason
      : roleDenied || singlePermissionDenied || multiplePermissionsDenied
      ? "forbidden"
      : undefined;

  useEffect(() => {
    if (loading || !blockedReason) return;
    const focusedDefaultPath =
      (isGroupOverviewOnlyProfile(profile) || isBranchUserProfile(profile) || hasAssignedPageScope(profile)) &&
      blockedReason === "forbidden"
        ? getDefaultRouteForProfile(profile)
        : null;
    router.replace(resolveRedirect(blockedReason, pathname, focusedDefaultPath));
  }, [blockedReason, loading, pathname, profile, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (blockedReason) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
