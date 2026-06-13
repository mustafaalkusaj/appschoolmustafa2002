"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import {
  getAccessDecision,
  hasPermission as hasProfilePermission,
  getUserProfile,
  isSchoolAccessBlocked,
  refreshRBACSessionCookie,
  type Permission,
  type UserProfile,
  type UserRole,
} from "@/lib/auth";
import { checkPermission } from "@/lib/perm-check";

type RoleContextValue = {
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  canAll: (permissions: Permission[]) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  canAccessPath: (pathname: string) => boolean;
  isReadOnlyPath: (pathname: string) => boolean;
  accessBlockedBySubscription: boolean;
  /** Check a deep permission key e.g. "students.create" */
  deepPermission: (permKey: string) => boolean;
};

const RoleContext = createContext<RoleContextValue | null>(null);
const RBAC_SYNC_COOLDOWN_MS = 60_000;

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const lastSyncedUserRef = useRef<string | null>(null);
  const lastSyncedAtRef = useRef<number>(0);

  const refreshProfile = useCallback(async () => {
    setLoading(true);
    try {
      const nextProfile = await getUserProfile();
      setProfile(nextProfile);

      const now = Date.now();
      const nextUserId = nextProfile?.id ?? null;
      const shouldSyncRBAC =
        nextUserId !== lastSyncedUserRef.current || now - lastSyncedAtRef.current > RBAC_SYNC_COOLDOWN_MS;

      if (nextUserId && shouldSyncRBAC) {
        lastSyncedUserRef.current = nextUserId;
        lastSyncedAtRef.current = now;
        void refreshRBACSessionCookie(nextProfile).catch(() => {
          if (lastSyncedUserRef.current === nextUserId) {
            lastSyncedAtRef.current = 0;
          }
        });
      } else if (!nextUserId) {
        lastSyncedUserRef.current = null;
        lastSyncedAtRef.current = 0;
      }
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      // Supabase auth callbacks run while the client is holding an internal
      // auth lock. Defer profile refresh to avoid stalling login/logout flows.
      window.setTimeout(() => {
        void refreshProfile();
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, [refreshProfile]);

  const role = profile?.role ?? null;

  const can = useCallback(
    (permission: Permission) => {
      return hasProfilePermission(profile, permission);
    },
    [profile],
  );

  const canAny = useCallback(
    (permissions: Permission[]) => {
      if (!profile) return false;
      return permissions.some((permission) => hasProfilePermission(profile, permission));
    },
    [profile],
  );

  const canAll = useCallback(
    (permissions: Permission[]) => {
      if (!profile) return false;
      return permissions.every((permission) => hasProfilePermission(profile, permission));
    },
    [profile],
  );

  const hasAnyRole = useCallback(
    (roles: UserRole[]) => {
      if (!role) return false;
      return roles.includes(role);
    },
    [role],
  );

  const canAccessPath = useCallback(
    (pathname: string) => {
      return getAccessDecision(profile, pathname).allowed;
    },
    [profile],
  );

  const isReadOnlyPath = useCallback(
    (pathname: string) => {
      return getAccessDecision(profile, pathname).readOnly;
    },
    [profile],
  );

  const accessBlockedBySubscription = useMemo(() => {
    if (!profile) return false;
    return isSchoolAccessBlocked(profile);
  }, [profile]);

  const deepPermission = useCallback(
    (permKey: string) => checkPermission(profile?.deepPermissions, permKey),
    [profile],
  );

  const value = useMemo<RoleContextValue>(
    () => ({
      profile,
      role,
      loading,
      refreshProfile,
      can,
      canAny,
      canAll,
      hasAnyRole,
      canAccessPath,
      isReadOnlyPath,
      accessBlockedBySubscription,
      deepPermission,
    }),
    [
      accessBlockedBySubscription,
      can,
      canAccessPath,
      canAll,
      canAny,
      deepPermission,
      hasAnyRole,
      isReadOnlyPath,
      loading,
      profile,
      refreshProfile,
      role,
    ],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within RoleProvider.");
  }
  return context;
}
