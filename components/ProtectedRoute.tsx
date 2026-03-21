"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useRole } from "@/hooks/useRole";
import { getAccessDecision, hasPermission, type Permission, type UserRole } from "@/lib/auth";
import { getLocaleFromPath, localizeAppPath } from "@/lib/locale-routing";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
  permission?: Permission;
  permissions?: Permission[];
  requireAllPermissions?: boolean;
  fallback?: React.ReactNode;
}

function resolveRedirect(reason: ReturnType<typeof getAccessDecision>["reason"], pathname: string) {
  const locale = getLocaleFromPath(pathname);
  const safePath = pathname && pathname.startsWith("/") ? pathname : localizeAppPath("/", locale);

  if (reason === "unauthenticated") {
    return `${localizeAppPath("/login", locale)}?next=${encodeURIComponent(safePath)}`;
  }

  if (reason === "school_inactive" || reason === "subscription_expired") {
    return localizeAppPath("/subscription-expired", locale);
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
    router.replace(resolveRedirect(blockedReason, pathname));
  }, [blockedReason, loading, pathname, router]);

  if (loading || blockedReason) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
