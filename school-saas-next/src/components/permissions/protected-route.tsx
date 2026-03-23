"use client";

import type { ReactNode } from "react";

import { usePermissions } from "@/hooks/usePermissions";
import type { Permission, Role } from "@/lib/types";

import { AccessDenied } from "@/components/shared/access-denied";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";

interface ProtectedRouteProps {
  children: ReactNode;
  permissions?: Permission[];
  roles?: Role[];
  requireAll?: boolean;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
}

export function ProtectedRoute({
  children,
  permissions = [],
  roles = [],
  requireAll = true,
  fallback,
  loadingFallback,
}: ProtectedRouteProps) {
  const { canAccess, isLoading } = usePermissions();

  if (isLoading) {
    return loadingFallback ?? <LoadingSkeleton rows={3} />;
  }

  if (!canAccess({ permissions, roles, requireAll })) {
    return fallback ?? <AccessDenied />;
  }

  return <>{children}</>;
}
