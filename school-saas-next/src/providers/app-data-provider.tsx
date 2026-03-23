"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import type { AdminMutation, RoleInput, SchoolInput, UserInput } from "@/lib/admin-actions";
import { getAdminSeed } from "@/lib/mock-data";
import {
  buildMonthlyGrowth,
  buildSmartInsights,
  buildTopSchoolsData,
  calculateGlobalStats,
  enforceSubscriptionStatus,
} from "@/lib/saas";
import type {
  AdminRole,
  AppUser,
  AuditLogEntry,
  GlobalStats,
  MonthlyMetric,
  Role,
  School,
  SmartInsight,
  SuperAdminSnapshot,
  SystemNotification,
  SystemSettings,
} from "@/lib/types";

import { useAuthContext } from "@/providers/auth-provider";
import { useLanguage } from "@/hooks/useLanguage";

interface UpdateUserInput extends UserInput {
  status: AppUser["status"];
}

interface AppDataContextValue {
  source: SuperAdminSnapshot["source"];
  isSyncing: boolean;
  errorMessage: string | null;
  roles: AdminRole[];
  schools: School[];
  users: AppUser[];
  notifications: SystemNotification[];
  auditLogs: AuditLogEntry[];
  settings: SystemSettings;
  globalStats: GlobalStats;
  monthlyMetrics: MonthlyMetric[];
  topSchools: Array<{ school: string; revenue: number }>;
  insights: SmartInsight[];
  clearError: () => void;
  refreshSnapshot: () => Promise<void>;
  createSchool: (input?: Partial<SchoolInput>) => void;
  toggleSchoolStatus: (schoolId: string) => void;
  archiveSchool: (schoolId: string) => void;
  restoreSchool: (schoolId: string) => void;
  createRole: (input: RoleInput) => void;
  updateRole: (roleKey: string, input: Omit<RoleInput, "key">) => void;
  archiveRole: (roleKey: string) => void;
  restoreRole: (roleKey: string) => void;
  createUser: (input: UserInput) => void;
  updateUser: (userId: string, input: UpdateUserInput) => void;
  deleteUser: (userId: string) => void;
  restoreUser: (userId: string) => void;
  toggleUserStatus: (userId: string) => void;
  markNotificationRead: (notificationId: string) => void;
  updateSettings: (patch: Partial<SystemSettings>) => void;
  applyRoleTemplate: (userId: string, roleKey: Role) => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

function buildDefaultSchoolInput(existingCount: number): SchoolInput {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + 30);

  return {
    name: `مدرسة جديدة ${existingCount + 1}`,
    code: `NEW-${String(existingCount + 1).padStart(2, "0")}`,
    plan: "monthly",
    amount: 1000,
    expiresAt: expiresAt.toISOString(),
  };
}

export function AppDataProvider({ children }: PropsWithChildren) {
  const [snapshot, setSnapshot] = useState<SuperAdminSnapshot>(() => getAdminSeed());
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { user, refresh: refreshAuth } = useAuthContext();
  const { language } = useLanguage();

  const applySnapshot = useCallback((nextSnapshot: SuperAdminSnapshot) => {
    setSnapshot(nextSnapshot);
  }, []);

  const refreshSnapshot = useCallback(async () => {
    if (user?.role !== "super_admin") {
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch("/api/admin/super-admin", {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        setErrorMessage("Failed to load admin data");
        return;
      }

      const payload = (await response.json()) as { snapshot: SuperAdminSnapshot };
      applySnapshot(payload.snapshot);
      setErrorMessage(null);
    } finally {
      setIsSyncing(false);
    }
  }, [applySnapshot, user?.role]);

  useEffect(() => {
    void refreshSnapshot();
  }, [refreshSnapshot]);

  const runMutation = useCallback(
    async (mutation: AdminMutation) => {
      setIsSyncing(true);
      try {
        const response = await fetch("/api/admin/super-admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mutation),
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? `Mutation failed: ${response.status}`);
        }

        const payload = (await response.json()) as { snapshot: SuperAdminSnapshot };
        applySnapshot(payload.snapshot);
        setErrorMessage(null);
        await refreshAuth();
      } finally {
        setIsSyncing(false);
      }
    },
    [applySnapshot, refreshAuth],
  );

  const dispatchMutation = useCallback(
    (mutation: AdminMutation) => {
      setErrorMessage(null);
      void runMutation(mutation).catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : "Mutation failed");
        console.error(error);
      });
    },
    [runMutation],
  );

  const createSchool = useCallback(
    (input?: Partial<SchoolInput>) => {
      const defaults = buildDefaultSchoolInput(snapshot.schools.filter((school) => !school.deletedAt).length);
      dispatchMutation({
        action: "create-school",
        input: {
          ...defaults,
          ...input,
        },
      });
    },
    [dispatchMutation, snapshot.schools],
  );

  const activeSchools = useMemo(
    () => enforceSubscriptionStatus(snapshot.schools.filter((school) => !school.deletedAt)),
    [snapshot.schools],
  );
  const activeUsers = useMemo(
    () => snapshot.users.filter((entry) => !entry.deletedAt),
    [snapshot.users],
  );
  const monthlyMetrics = useMemo(() => buildMonthlyGrowth(activeSchools, language), [activeSchools, language]);
  const topSchools = useMemo(() => buildTopSchoolsData(activeSchools), [activeSchools]);
  const globalStats = useMemo(() => calculateGlobalStats(activeSchools, activeUsers.length), [activeSchools, activeUsers.length]);
  const insights = useMemo(
    () => buildSmartInsights(activeSchools, monthlyMetrics, language),
    [activeSchools, language, monthlyMetrics],
  );

  const value = useMemo(
    () => ({
      source: snapshot.source,
      isSyncing,
      errorMessage,
      roles: snapshot.roles,
      schools: snapshot.schools,
      users: snapshot.users,
      notifications: snapshot.notifications,
      auditLogs: snapshot.auditLogs,
      settings: snapshot.settings,
      globalStats,
      monthlyMetrics,
      topSchools,
      insights,
      clearError: () => setErrorMessage(null),
      refreshSnapshot,
      createSchool,
      toggleSchoolStatus: (schoolId: string) => {
        dispatchMutation({ action: "toggle-school-status", schoolId });
      },
      archiveSchool: (schoolId: string) => {
        dispatchMutation({ action: "archive-school", schoolId });
      },
      restoreSchool: (schoolId: string) => {
        dispatchMutation({ action: "restore-school", schoolId });
      },
      createRole: (input: RoleInput) => {
        dispatchMutation({ action: "create-role", input });
      },
      updateRole: (roleKey: string, input: Omit<RoleInput, "key">) => {
        dispatchMutation({ action: "update-role", roleKey, input });
      },
      archiveRole: (roleKey: string) => {
        dispatchMutation({ action: "archive-role", roleKey });
      },
      restoreRole: (roleKey: string) => {
        dispatchMutation({ action: "restore-role", roleKey });
      },
      createUser: (input: UserInput) => {
        dispatchMutation({ action: "create-user", input });
      },
      updateUser: (userId: string, input: UpdateUserInput) => {
        dispatchMutation({ action: "update-user", userId, input });
      },
      deleteUser: (userId: string) => {
        dispatchMutation({ action: "archive-user", userId });
      },
      restoreUser: (userId: string) => {
        dispatchMutation({ action: "restore-user", userId });
      },
      toggleUserStatus: (userId: string) => {
        dispatchMutation({ action: "toggle-user-status", userId });
      },
      markNotificationRead: (notificationId: string) => {
        dispatchMutation({ action: "mark-notification-read", notificationId });
      },
      updateSettings: (patch: Partial<SystemSettings>) => {
        dispatchMutation({ action: "update-settings", patch });
      },
      applyRoleTemplate: (userId: string, roleKey: Role) => {
        dispatchMutation({ action: "apply-role-template", userId, roleKey });
      },
    }),
    [
      createSchool,
      dispatchMutation,
      errorMessage,
      globalStats,
      insights,
      isSyncing,
      monthlyMetrics,
      refreshSnapshot,
      snapshot.auditLogs,
      snapshot.notifications,
      snapshot.roles,
      snapshot.schools,
      snapshot.settings,
      snapshot.source,
      snapshot.users,
      topSchools,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppDataContext() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppDataContext must be used within AppDataProvider");
  }

  return context;
}
