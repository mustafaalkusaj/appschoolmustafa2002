"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { type Permission } from "@/lib/auth";
import {
  type AdminInfrastructure,
  DEFAULT_ADMIN_INFRASTRUCTURE,
} from "@/lib/admin-infrastructure";
import { type AppSchemaCompat } from "@/lib/schema-compat";
import { getStoredSchoolBranding } from "@/lib/brand/palette";
import { useRole } from "@/hooks/useRole";
import type {
  SchoolRecord,
  UserRecord,
  SubscriptionRecord,
  BranchOptionRecord,
} from "../_components/types";

// ─── Context shape ─────────────────────────────────────────────────────────

interface SuperAdminData {
  schools: SchoolRecord[];
  branches: BranchOptionRecord[];
  users: UserRecord[];
  subscriptions: SubscriptionRecord[];
  infrastructure: AdminInfrastructure;
  schemaCompat: AppSchemaCompat | null;
  loading: boolean;
  refreshing: boolean;
  lastRefreshed: Date | null;
  refresh: () => Promise<void>;
}

const Ctx = createContext<SuperAdminData | null>(null);

export function useSuperAdminData() {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("useSuperAdminData must be inside SuperAdminProvider");
  return ctx;
}

// ─── Provider ──────────────────────────────────────────────────────────────

export function SuperAdminProvider({ children }: { children: ReactNode }) {
  const { profile, loading: authLoading } = useRole();
  const ready = !authLoading && profile?.role === "super_admin";

  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [branches, setBranches] = useState<BranchOptionRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [infrastructure, setInfrastructure] = useState(
    DEFAULT_ADMIN_INFRASTRUCTURE,
  );
  const [schemaCompat, setSchemaCompat] = useState<AppSchemaCompat | null>(
    null,
  );
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const once = useRef(false);

  const refresh = useCallback(async () => {
    if (!once.current) setLoading(true);
    else setRefreshing(true);

    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        infrastructure?: AdminInfrastructure;
        schemaCompat?: AppSchemaCompat;
        schools?: SchoolRecord[];
        branches?: BranchOptionRecord[];
        users?: UserRecord[];
        subscriptions?: SubscriptionRecord[];
        error?: { message?: string };
      }>("/api/web/super-admin/overview");

      if (!response.ok)
        throw new Error(payload?.error?.message || "تعذر تحميل البيانات.");

      setInfrastructure(payload?.infrastructure ?? DEFAULT_ADMIN_INFRASTRUCTURE);
      setSchemaCompat(payload?.schemaCompat ?? null);

      setSchools(
        (payload?.schools ?? []).map((s) => {
          const b = getStoredSchoolBranding(s.id);
          return {
            ...s,
            primary_color: s.primary_color ?? b?.primaryColor ?? null,
            secondary_color: s.secondary_color ?? b?.secondaryColor ?? null,
          };
        }),
      );

      setBranches(payload?.branches ?? []);

      setUsers(
        (payload?.users ?? []).map((u) => ({
          ...u,
          job_title: typeof u.job_title === "string" ? u.job_title : null,
          branch_id: typeof u.branch_id === "string" ? u.branch_id : null,
          default_branch_id:
            typeof u.default_branch_id === "string"
              ? u.default_branch_id
              : null,
          custom_permissions: Array.isArray(u.custom_permissions)
            ? (u.custom_permissions as Permission[])
            : null,
          allowed_pages: Array.isArray(u.allowed_pages)
            ? u.allowed_pages.filter((i): i is string => typeof i === "string")
            : [],
          is_single_page_user: u.is_single_page_user === true,
          permissions_version:
            typeof u.permissions_version === "number"
              ? u.permissions_version
              : 1,
        })),
      );

      setSubscriptions(payload?.subscriptions ?? []);
      setLastRefreshed(new Date());
      once.current = true;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (ready) void refresh();
  }, [ready, refresh]);

  return (
    <Ctx.Provider
      value={{
        schools,
        branches,
        users,
        subscriptions,
        infrastructure,
        schemaCompat,
        loading,
        refreshing,
        lastRefreshed,
        refresh,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
