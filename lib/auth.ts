import { supabase } from "@/lib/supabase";
import { resolvePageCodeFromPath } from "@/lib/authorization/page-access";
import {
  DEFAULT_PATH_BY_ROLE,
  buildTemplatePermissions,
  getMatchingPermissionRule,
  getMatchingRouteRule,
  hasAnyPermission,
  hasPermissionInList,
  isPathReadOnlyForRole,
  isRoleAllowedForPath,
  normalizePermissions,
  resolveKnownUserRole,
  type Permission,
  type UserRole,
} from "@/types/roles";

export type { Permission, UserRole };

export interface SchoolProfile {
  id: string;
  name: string;
  is_active: boolean;
}

export interface SubscriptionProfile {
  id: string;
  school_id: string;
  status: string;
  end_date: string | null;
}

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url?: string | null;
  role: UserRole;
  permissions: Permission[];
  custom_permissions?: Permission[] | null;
  school_id: string | null;
  is_active: boolean;
  phone?: string | null;
  school?: SchoolProfile | null;
  subscription?: SubscriptionProfile | null;
  branch_id?: string | null;
  allowed_branch_ids?: string[];
  allowed_pages?: string[];
  is_single_page_user?: boolean;
  default_path?: string | null;
  scope_level?: AccessScopeLevel;
  permissions_version?: number;
}

export type AccessScopeLevel =
  | "super_admin"
  | "group_admin"
  | "branch_user"
  | "restricted"
  | null;

export interface AccessDecision {
  allowed: boolean;
  reason?: "unauthenticated" | "inactive_user" | "forbidden" | "school_inactive" | "subscription_expired";
  readOnly: boolean;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "المدير العام",
  admin: "مدير المدرسة",
  employee: "موظف",
};

export const ROLE_LABELS_BY_LOCALE: Record<UserRole, { ar: string; en: string }> = {
  super_admin: { ar: "المدير العام", en: "System Owner" },
  admin: { ar: "مدير المدرسة", en: "School Admin" },
  employee: { ar: "موظف", en: "Employee" },
};

export function getRoleLabel(role: UserRole, locale: "ar" | "en" = "ar"): string {
  return ROLE_LABELS_BY_LOCALE[role][locale];
}

export const ROLE_COLORS: Record<UserRole, { bg: string; color: string }> = {
  super_admin: { bg: "#FEF3C7", color: "#92400E" },
  admin: { bg: "#DBEAFE", color: "#1E40AF" },
  employee: { bg: "#E0F2FE", color: "#0369A1" },
};

function normalizeDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isSubscriptionExpired(endDate: string | null | undefined, now = new Date()): boolean {
  const parsed = normalizeDate(endDate);
  if (!parsed) return false;
  const endOfDay = new Date(parsed);
  endOfDay.setHours(23, 59, 59, 999);
  return now.getTime() > endOfDay.getTime();
}

export function hasPermission(profileOrRole: UserProfile | UserRole | null, permission: Permission): boolean {
  if (!profileOrRole) return false;

  if (typeof profileOrRole === "string") {
    return hasPermissionInList(buildTemplatePermissions(profileOrRole), permission);
  }

  return hasPermissionInList(profileOrRole.permissions, permission);
}

export function getDefaultRouteForRole(role: UserRole): string {
  return DEFAULT_PATH_BY_ROLE[role] ?? "/dashboard";
}

function isSchoolManagerRestrictedProfile(profile: UserProfile | null) {
  return Boolean(profile && profile.role !== "super_admin" && profile.scope_level === "group_admin");
}

export function getDefaultRouteForProfile(profile: UserProfile | null) {
  if (isSchoolManagerRestrictedProfile(profile)) {
    return "/group";
  }

  if (profile?.default_path && profile.default_path.startsWith("/")) {
    return profile.default_path;
  }

  return profile ? getDefaultRouteForRole(profile.role) : "/dashboard";
}

function hasFocusedPageRestriction(profile: UserProfile) {
  return Boolean(profile.is_single_page_user) && Array.isArray(profile.allowed_pages) && profile.allowed_pages.length > 0;
}

export function isSchoolAccessBlocked(profile: UserProfile): boolean {
  if (profile.role === "super_admin") return false;
  if (!profile.school_id) return true;
  if (profile.school && profile.school.is_active === false) return true;

  const status = (profile.subscription?.status || "").toLowerCase();
  if (status === "suspended" || status === "inactive" || status === "stopped") return true;
  if (status === "expired") return true;

  const endDate = profile.subscription?.end_date;
  return isSubscriptionExpired(endDate);
}

export function getAccessDecision(profile: UserProfile | null, pathname: string): AccessDecision {
  if (!profile) return { allowed: false, reason: "unauthenticated", readOnly: false };
  if (!profile.is_active) return { allowed: false, reason: "inactive_user", readOnly: false };

  if (isSchoolManagerRestrictedProfile(profile)) {
    const pageCode = resolvePageCodeFromPath(pathname);
    if (pageCode !== "group") {
      return { allowed: false, reason: "forbidden", readOnly: false };
    }
  }

  if (!isRoleAllowedForPath(profile.role, pathname)) {
    return { allowed: false, reason: "forbidden", readOnly: false };
  }

  const permissionRule = getMatchingPermissionRule(pathname);
  if (permissionRule) {
    const allowed = permissionRule.requireAll
      ? permissionRule.permissions.every((permission) => hasPermissionInList(profile.permissions, permission))
      : hasAnyPermission(profile.permissions, permissionRule.permissions);

    if (!allowed) {
      return { allowed: false, reason: "forbidden", readOnly: false };
    }
  }

  const rule = getMatchingRouteRule(pathname);
  if (rule?.requiresActiveSchool && profile.role !== "super_admin") {
    if (!profile.school_id || profile.school?.is_active === false) {
      return { allowed: false, reason: "school_inactive", readOnly: false };
    }

    const status = (profile.subscription?.status || "").toLowerCase();
    if (status === "suspended" || status === "inactive" || status === "stopped") {
      return { allowed: false, reason: "school_inactive", readOnly: false };
    }

    if (status === "expired" || isSubscriptionExpired(profile.subscription?.end_date)) {
      return { allowed: false, reason: "subscription_expired", readOnly: false };
    }
  }

  if (hasFocusedPageRestriction(profile)) {
    const pageCode = resolvePageCodeFromPath(pathname);
    const allowedPages = profile.allowed_pages ?? [];

    if (!pageCode || !allowedPages.includes(pageCode)) {
      return { allowed: false, reason: "forbidden", readOnly: false };
    }
  }

  return {
    allowed: true,
    readOnly: isPathReadOnlyForRole(profile.role, pathname),
  };
}

export function canUserAccessPath(profile: UserProfile | null, pathname: string): boolean {
  return getAccessDecision(profile, pathname).allowed;
}

export function isPathReadOnly(profile: UserProfile | null, pathname: string): boolean {
  if (!profile) return false;
  return isPathReadOnlyForRole(profile.role, pathname);
}

function isAuthSessionMissingError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as { name?: string; message?: string };
  const message = typeof maybeError.message === "string" ? maybeError.message.toLowerCase() : "";
  return maybeError.name === "AuthSessionMissingError" || message.includes("auth session missing");
}

async function fetchSchoolContext(schoolId: string) {
  const [{ data: schoolData }, { data: subscriptionData }] = await Promise.all([
    supabase
      .from("schools")
      .select("id, name, is_active")
      .eq("id", schoolId)
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select("id, school_id, status, end_date")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    school: (schoolData || null) as SchoolProfile | null,
    subscription: (subscriptionData || null) as SubscriptionProfile | null,
  };
}

async function fetchUserProfileById(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[Auth] fetchUserProfileById error:", error);
    return null;
  }

  const role = resolveKnownUserRole(data.role);
  if (!role) {
    console.error("[Auth] unsupported web role for user:", userId, data.role);
    return null;
  }
  let permissions: Permission[];
  
  // Use custom permissions if available, otherwise use role-based defaults
  if (data.custom_permissions && Array.isArray(data.custom_permissions) && data.custom_permissions.length > 0) {
    permissions = data.custom_permissions;
  } else {
    permissions = normalizePermissions(data.permissions, role);
  }

  let school: SchoolProfile | null = null;
  let subscription: SubscriptionProfile | null = null;

  if (data.school_id) {
    const ctx = await fetchSchoolContext(data.school_id);
    school = ctx.school;
    subscription = ctx.subscription;
  }

  return {
    id: data.id,
    full_name: data.full_name ?? null,
    email: data.email ?? null,
    avatar_url: null,
    role,
    permissions,
    custom_permissions: data.custom_permissions ?? null,
    school_id: data.school_id ?? null,
    is_active: Boolean(data.is_active),
    phone: data.phone ?? null,
    school,
    subscription,
    branch_id: typeof data.branch_id === "string" ? data.branch_id : null,
    allowed_branch_ids: Array.isArray(data.allowed_branch_ids)
      ? data.allowed_branch_ids.filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0)
      : [],
    allowed_pages: Array.isArray(data.allowed_pages)
      ? data.allowed_pages.filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0)
      : [],
    is_single_page_user: Boolean(data.is_single_page_user),
    default_path: typeof data.default_path === "string" ? data.default_path : null,
    scope_level:
      data.scope_level === "super_admin" ||
      data.scope_level === "group_admin" ||
      data.scope_level === "branch_user" ||
      data.scope_level === "restricted"
        ? data.scope_level
        : null,
    permissions_version:
      typeof data.permissions_version === "number" && Number.isFinite(data.permissions_version)
        ? data.permissions_version
        : 1,
  };
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    if (error && !isAuthSessionMissingError(error)) {
      console.error("[Auth] getUser error:", error);
    }
    return null;
  }

  try {
    const response = await fetch("/api/auth/me", {
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; user?: UserProfile | null }
        | null;

      if (payload?.ok && payload.user) {
        return {
          ...payload.user,
          avatar_url:
            typeof user.user_metadata?.avatar_url === "string"
              ? user.user_metadata.avatar_url
              : typeof user.user_metadata?.picture === "string"
                ? user.user_metadata.picture
                : null,
        };
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.warn("[Auth] /api/auth/me failed, falling back to direct profile read", error.message);
    }
  }

  const profile = await fetchUserProfileById(user.id);
  if (!profile) {
    console.error("[Auth] profile not found for user:", user.id);
  }
  return profile
    ? {
        ...profile,
        avatar_url:
          typeof user.user_metadata?.avatar_url === "string"
            ? user.user_metadata.avatar_url
            : typeof user.user_metadata?.picture === "string"
              ? user.user_metadata.picture
              : null,
      }
    : null;
}

export async function getUserProfileById(userId: string): Promise<UserProfile | null> {
  return fetchUserProfileById(userId);
}

async function setRBACSession(
  method: "POST" | "DELETE",
  options?: { strict?: boolean; accessToken?: string | null },
) {
  if (typeof window === "undefined") return;
  const strict = options?.strict ?? false;
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  let accessToken = options?.accessToken ?? null;
  if (!accessToken) {
    type SessionResult = Awaited<ReturnType<typeof supabase.auth.getSession>>;
    let timeoutId: number | null = null;
    const timeoutPromise = new Promise<null>((resolve) => {
      timeoutId = window.setTimeout(() => resolve(null), 1_000);
    });
    const sessionTokenPromise: Promise<string | null> = supabase.auth
      .getSession()
      .then((result: SessionResult) => result.data.session?.access_token ?? null)
      .catch(() => null);

    try {
      accessToken = await Promise.race([sessionTokenPromise, timeoutPromise]);
    } finally {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    }
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetch("/api/rbac/session", {
      method,
      credentials: "include",
      headers,
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok && strict) {
      const payload = await response.json().catch(() => null);
      const message =
        typeof payload?.message === "string" && payload.message.trim().length > 0
          ? payload.message
          : "Unable to initialize secure session.";
      throw new Error(message);
    }
  } catch (error) {
    if (strict && error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Timed out while initializing secure session.");
    }
    if (strict) {
      if (error instanceof Error && error.message.trim().length > 0) {
        throw error;
      }
      throw new Error("Unable to initialize secure session.");
    }
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function refreshRBACSessionCookie(
  profile?: UserProfile | null,
  options?: { strict?: boolean; accessToken?: string | null },
) {
  if (profile) {
    await setRBACSession("POST", {
      strict: options?.strict ?? false,
      accessToken: options?.accessToken ?? null,
    });
    return;
  }
  await setRBACSession("DELETE");
}

export async function clearRBACSessionCookie() {
  await setRBACSession("DELETE");
}

export async function signOutClient() {
  await supabase.auth.signOut();
  await clearRBACSessionCookie();
}
