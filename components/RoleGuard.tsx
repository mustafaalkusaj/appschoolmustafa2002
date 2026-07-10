
import React from "react";
import type { UserProfile, UserRole } from "@/lib/auth";

interface RoleGuardProps {
  roles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  profile: UserProfile | null;
}

export function RoleGuard({ roles, children, fallback = null, profile }: RoleGuardProps) {
  if (!profile) return <>{fallback}</>;
  if (!roles.includes(profile.role)) return <>{fallback}</>;
  return <>{children}</>;
}
