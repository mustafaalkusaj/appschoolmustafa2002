"use client";

import { useRole } from "@/hooks/useRole";

export function useAuth() {
  const roleState = useRole();

  const isSuperAdmin = roleState.role === "super_admin";
  const isAdmin = roleState.role === "admin" || isSuperAdmin;
  const isEmployee = roleState.role === "employee" || isAdmin;

  return {
    profile: roleState.profile,
    loading: roleState.loading,
    can: roleState.can,
    isSuperAdmin,
    isAdmin,
    isEmployee,
    refreshProfile: roleState.refreshProfile,
  };
}
