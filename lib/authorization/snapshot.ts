import type { PostgrestSingleResponse, SupabaseClient } from "@supabase/supabase-js";
import { endOfDayBaghdad } from "@/lib/tz";

import {
  isMissingColumnError,
  isMissingRelationError,
  isMissingTableError,
} from "@/lib/admin-infrastructure";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import {
  filterAllowedPageCodes,
  getPathForPageCode,
  type PageCode,
} from "@/lib/authorization/page-access";
import {
  DEFAULT_PATH_BY_ROLE,
  normalizePermissions,
  resolveKnownUserRole,
  type Permission,
  type UserRole,
} from "@/types/roles";

type GenericSupabaseClient = SupabaseClient;

type UserProfileRow = {
  id: string;
  full_name: string | null;
  job_title?: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  school_id: string | null;
  is_active: boolean | null;
  custom_permissions?: unknown;
  permissions?: unknown;
  scope?: string | null;
  scope_level?: string | null;
  allowed_module?: string | null;
  group_id?: string | null;
  branch_id?: string | null;
  is_single_page_user?: boolean | null;
  default_branch_id?: string | null;
  hierarchy_level?: number | null;
  permissions_version?: number | null;
};

type UserPermissionRow = {
  module: string | null;
  branch_id: string | null;
};

type UserPageAccessRow = {
  page_code: string | null;
  branch_id: string | null;
  can_view: boolean | null;
};

type AdminBranchScopeRow = {
  branch_id: string | null;
};

type UserRoleAssignmentRow = {
  branch_id: string | null;
  scope_level: string | null;
  hierarchy_level: number | null;
};

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

export interface ResolvedClientUserProfile {
  id: string;
  full_name: string | null;
  job_title?: string | null;
  email: string | null;
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
  allowed_pages?: PageCode[];
  is_single_page_user?: boolean;
  default_path?: string | null;
  scope_level?: AuthorizationScopeLevel;
  permissions_version?: number;
}

type SchoolContext = {
  school: SchoolProfile | null;
  subscription: SubscriptionProfile | null;
};

export type AuthorizationScopeLevel =
  | "super_admin"
  | "group_admin"
  | "branch_user"
  | "restricted"
  | null;

export type LayoutMode = "full" | "focused";

export interface AuthorizationSnapshot {
  userId: string;
  role: UserRole;
  roleCodes: string[];
  permissions: Permission[];
  schoolId: string | null;
  branchId: string | null;
  allowedBranchIds: string[];
  scopeLevel: AuthorizationScopeLevel;
  allowedPages: PageCode[];
  allowedModule: string | null;
  allowedModules: PageCode[];
  isSinglePageUser: boolean;
  defaultPath: string;
  userActive: boolean;
  hierarchyLevel: number | null;
  permissionsVersion: number;
  groupId: string | null;
  schoolActive: boolean;
  subscriptionStatus: string | null;
  subscriptionEnd: string | null;
}

export interface ResolvedWebProfile {
  profile: ResolvedClientUserProfile;
  snapshot: AuthorizationSnapshot;
}

export type ResolveWebUserProfileResult =
  | {
      status: "resolved";
      profile: ResolvedClientUserProfile;
      snapshot: AuthorizationSnapshot;
    }
  | {
      status: "profile_missing";
    }
  | {
      status: "unknown_role";
      role: string | null;
    };

const PROFILE_SELECTS = [
  "id, full_name, job_title, email, phone, role, school_id, is_active, custom_permissions, permissions, scope, scope_level, allowed_module, group_id, branch_id, is_single_page_user, default_branch_id, hierarchy_level, permissions_version",
  "id, full_name, email, phone, role, school_id, is_active, custom_permissions, permissions, scope, scope_level, allowed_module, group_id, branch_id, is_single_page_user, default_branch_id, hierarchy_level, permissions_version",
  "id, full_name, job_title, email, phone, role, school_id, is_active, custom_permissions, scope, scope_level, allowed_module, group_id, branch_id, is_single_page_user, default_branch_id, hierarchy_level, permissions_version",
  "id, full_name, email, phone, role, school_id, is_active, custom_permissions, scope, scope_level, allowed_module, group_id, branch_id, is_single_page_user, default_branch_id, hierarchy_level, permissions_version",
  "id, full_name, job_title, email, phone, role, school_id, is_active, custom_permissions, permissions, scope, scope_level, allowed_module, group_id, branch_id",
  "id, full_name, email, phone, role, school_id, is_active, custom_permissions, permissions, scope, scope_level, allowed_module, group_id, branch_id",
  "id, full_name, job_title, email, phone, role, school_id, is_active, custom_permissions, scope, scope_level, allowed_module, group_id, branch_id",
  "id, full_name, email, phone, role, school_id, is_active, custom_permissions, scope, scope_level, allowed_module, group_id, branch_id",
  "id, full_name, job_title, email, phone, role, school_id, is_active, custom_permissions, permissions, scope, scope_level, allowed_module, group_id",
  "id, full_name, email, phone, role, school_id, is_active, custom_permissions, permissions, scope, scope_level, allowed_module, group_id",
  "id, full_name, job_title, email, phone, role, school_id, is_active, custom_permissions, scope, scope_level, allowed_module, group_id",
  "id, full_name, email, phone, role, school_id, is_active, custom_permissions, scope, scope_level, allowed_module, group_id",
  "id, full_name, job_title, email, phone, role, school_id, is_active, custom_permissions, permissions",
  "id, full_name, email, phone, role, school_id, is_active, custom_permissions, permissions",
  "id, full_name, job_title, email, phone, role, school_id, is_active, custom_permissions",
  "id, full_name, email, phone, role, school_id, is_active, custom_permissions",
] as const;

async function selectProfileCompat(
  routeSupabase: GenericSupabaseClient,
  userId: string,
): Promise<UserProfileRow | null> {
  let lastError: unknown = null;

  for (const select of PROFILE_SELECTS) {
    const response = await routeSupabase
      .from("user_profiles")
      .select(select)
      .eq("id", userId)
      .maybeSingle<UserProfileRow>();

    if (!response.error) {
      return response.data ?? null;
    }

    lastError = response.error;
    if (!isMissingColumnError(response.error, "user_profiles")) {
      break;
    }
  }

  if (lastError) {
    throw lastError;
  }

  return null;
}

async function resolveSchoolContext(
  routeSupabase: GenericSupabaseClient,
  schoolId: string | null,
): Promise<SchoolContext> {
  if (!schoolId) {
    return {
      school: null,
      subscription: null,
    };
  }

  const [{ data: schoolData }, { data: subscriptionData }] = await Promise.all([
    routeSupabase
      .from("schools")
      .select("id, name, is_active")
      .eq("id", schoolId)
      .maybeSingle(),
    routeSupabase
      .from("subscriptions")
      .select("id, school_id, status, end_date")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    school: (schoolData ?? null) as SchoolProfile | null,
    subscription: (subscriptionData ?? null) as SubscriptionProfile | null,
  };
}

async function readOptionalList<T>(
  promise: PromiseLike<PostgrestSingleResponse<T[]> | { data: T[] | null; error: unknown }>,
  options?: {
    table?: string;
    relation?: [string, string];
  },
): Promise<T[]> {
  try {
    const response = await promise;
    if (!response.error) {
      return Array.isArray(response.data) ? response.data : [];
    }

    if (
      isMissingTableError(response.error, options?.table) ||
      isMissingRelationError(
        response.error,
        options?.relation?.[0],
        options?.relation?.[1],
      ) ||
      isMissingColumnError(response.error, options?.table)
    ) {
      return [];
    }

    throw response.error;
  } catch (error) {
    if (
      isMissingTableError(error, options?.table) ||
      isMissingRelationError(
        error,
        options?.relation?.[0],
        options?.relation?.[1],
      ) ||
      isMissingColumnError(error, options?.table)
    ) {
      return [];
    }
    throw error;
  }
}

function normalizeScopeLevel(
  role: UserRole,
  rawScope: string | null | undefined,
  rawScopeLevel: string | null | undefined,
  isSinglePageUser: boolean,
  branchScoped: boolean,
): AuthorizationScopeLevel {
  if (role === "super_admin") {
    return "super_admin";
  }

  if (rawScopeLevel === "super_admin" || rawScopeLevel === "group_admin" || rawScopeLevel === "branch_user") {
    return rawScopeLevel;
  }

  if (rawScopeLevel === "restricted") {
    return branchScoped ? "branch_user" : "group_admin";
  }

  if (isSinglePageUser && branchScoped) {
    return "branch_user";
  }

  if (rawScope === "group") {
    return "group_admin";
  }

  if (branchScoped) {
    return "branch_user";
  }

  return "group_admin";
}

function buildAllowedPages(
  rawPages: Array<string | null | undefined>,
  hasAllModules: boolean,
) {
  if (hasAllModules) {
    return [] as PageCode[];
  }

  return filterAllowedPageCodes(rawPages);
}

function buildDefaultPath(
  role: UserRole,
  allowedPages: PageCode[],
  isSinglePageUser: boolean,
  scopeLevel?: AuthorizationScopeLevel | null,
) {
  if (scopeLevel === "group_admin" && role === "admin" && allowedPages.length === 0) {
    return "/group";
  }

  if (allowedPages.length > 0 && (isSinglePageUser || !allowedPages.includes("dashboard"))) {
    return getPathForPageCode(allowedPages[0]) ?? DEFAULT_PATH_BY_ROLE[role];
  }

  return DEFAULT_PATH_BY_ROLE[role];
}

function buildPermissions(profile: UserProfileRow, role: UserRole) {
  const rawPermissions =
    (Array.isArray(profile.custom_permissions) && profile.custom_permissions.length > 0
      ? profile.custom_permissions
      : profile.permissions) ?? [];

  return normalizePermissions(rawPermissions, role);
}

export async function resolveWebUserProfileWithStatus(
  routeSupabase: GenericSupabaseClient,
  userId: string,
): Promise<ResolveWebUserProfileResult> {
  // Always use the service-role client for profile lookups so that RLS
  // policies on user_profiles (which reference the same table) are bypassed.
  // Falling back to the anon/user client triggers infinite recursion in the
  // RLS policy and causes every write operation to return an error.
  let authzLookupClient: GenericSupabaseClient;
  try {
    authzLookupClient = createServiceSupabaseClient();
  } catch (err) {
    console.error("[resolveWebUserProfile] Service client unavailable — cannot read user_profiles safely:", err);
    throw err;
  }

  const profileRow = await selectProfileCompat(authzLookupClient, userId);
  if (!profileRow) {
    return { status: "profile_missing" };
  }

  const role = resolveKnownUserRole(profileRow.role);
  if (!role) {
    return {
      status: "unknown_role",
      role: typeof profileRow.role === "string" ? profileRow.role : null,
    };
  }

  const schoolId = profileRow.school_id ?? null;

  const [
    schoolContext,
    legacyUserPermissions,
    focusedPageAccess,
    branchScopes,
    scopedRoles,
  ] = await Promise.all([
    resolveSchoolContext(authzLookupClient, schoolId),
    readOptionalList<UserPermissionRow>(
      authzLookupClient
        .from("user_permissions")
        .select("module, branch_id")
        .eq("user_id", userId),
      { table: "user_permissions" },
    ),
    readOptionalList<UserPageAccessRow>(
      authzLookupClient
        .from("user_page_access")
        .select("page_code, branch_id, can_view")
        .eq("user_id", userId),
      { table: "user_page_access" },
    ),
    schoolId
      ? readOptionalList<AdminBranchScopeRow>(
          authzLookupClient
            .from("admin_branch_scopes")
            .select("branch_id")
            .eq("user_id", userId)
            .eq("school_id", schoolId),
          { table: "admin_branch_scopes" },
        )
      : Promise.resolve([]),
    readOptionalList<UserRoleAssignmentRow>(
      authzLookupClient
        .from("user_role_assignments")
        .select("branch_id, scope_level, hierarchy_level")
        .eq("user_id", userId),
      { table: "user_role_assignments" },
    ),
  ]);

  const permissions = buildPermissions(profileRow, role);
  const hasAllModules = legacyUserPermissions.some((item) => item.module === "all");
  const pageAccessCodes = focusedPageAccess
    .filter((row) => row.can_view !== false)
    .map((row) => row.page_code);
  const userPermissionCodes = legacyUserPermissions.map((row) => row.module);
  const allowedPages = buildAllowedPages(
    [
      ...pageAccessCodes,
      ...userPermissionCodes,
      profileRow.allowed_module ?? null,
    ],
    hasAllModules,
  );

  const scopedBranchIds = [
    profileRow.branch_id ?? null,
    profileRow.default_branch_id ?? null,
    ...legacyUserPermissions.map((item) => item.branch_id),
    ...focusedPageAccess.map((item) => item.branch_id),
    ...branchScopes.map((item) => item.branch_id),
    ...scopedRoles.map((item) => item.branch_id),
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  const allowedBranchIds = Array.from(new Set(scopedBranchIds));
  const hierarchyLevel =
    typeof profileRow.hierarchy_level === "number"
      ? profileRow.hierarchy_level
      : scopedRoles
          .map((item) => item.hierarchy_level)
          .find((value): value is number => typeof value === "number") ?? null;

  const isSinglePageUser = !hasAllModules && allowedPages.length === 1;
  const branchId =
    profileRow.branch_id ??
    profileRow.default_branch_id ??
    allowedBranchIds[0] ??
    null;
  const scopeLevel = normalizeScopeLevel(
    role,
    profileRow.scope,
    profileRow.scope_level ?? scopedRoles[0]?.scope_level ?? null,
    isSinglePageUser,
    allowedBranchIds.length > 0,
  );
  const defaultPath = buildDefaultPath(role, allowedPages, isSinglePageUser, scopeLevel);
  const roleCodes = Array.from(
    new Set(
      [profileRow.role]
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .map((value) => value.trim().toLowerCase()),
    ),
  );
  const schoolActive = schoolContext.school?.is_active !== false;
  const subscriptionStatus = schoolContext.subscription?.status ?? null;
  const subscriptionEnd = schoolContext.subscription?.end_date ?? null;
  const permissionsVersion = Number.isFinite(profileRow.permissions_version)
    ? Number(profileRow.permissions_version)
    : 1;

  const snapshot: AuthorizationSnapshot = {
    userId,
    role,
    roleCodes,
    permissions,
    schoolId,
    branchId,
    allowedBranchIds,
    scopeLevel,
    allowedPages,
    allowedModule: allowedPages[0] ?? null,
    allowedModules: allowedPages,
    isSinglePageUser,
    defaultPath,
    userActive: Boolean(profileRow.is_active),
    hierarchyLevel,
    permissionsVersion,
    groupId: profileRow.group_id ?? null,
    schoolActive,
    subscriptionStatus,
    subscriptionEnd,
  };

  const profile: ResolvedClientUserProfile = {
    id: profileRow.id,
    full_name: profileRow.full_name ?? null,
    job_title: typeof profileRow.job_title === "string" ? profileRow.job_title : null,
    email: profileRow.email ?? null,
    role,
    permissions,
    custom_permissions: Array.isArray(profileRow.custom_permissions)
      ? (profileRow.custom_permissions as Permission[])
      : null,
    school_id: schoolId,
    is_active: Boolean(profileRow.is_active),
    phone: profileRow.phone ?? null,
    school: schoolContext.school,
    subscription: schoolContext.subscription,
    branch_id: branchId,
    allowed_branch_ids: allowedBranchIds,
    allowed_pages: allowedPages,
    is_single_page_user: isSinglePageUser,
    default_path: defaultPath,
    scope_level: scopeLevel,
    permissions_version: permissionsVersion,
  };

  return {
    status: "resolved",
    profile,
    snapshot,
  };
}

export async function resolveWebUserProfile(
  routeSupabase: GenericSupabaseClient,
  userId: string,
): Promise<ResolvedWebProfile | null> {
  const resolved = await resolveWebUserProfileWithStatus(routeSupabase, userId);
  if (resolved.status !== "resolved") {
    return null;
  }

  return {
    profile: resolved.profile,
    snapshot: resolved.snapshot,
  };
}

export function isSchoolAccessRestricted(snapshot: AuthorizationSnapshot) {
  if (snapshot.role === "super_admin") {
    return false;
  }

  if (!snapshot.schoolId || !snapshot.schoolActive) {
    return true;
  }

  const status = (snapshot.subscriptionStatus || "").toLowerCase();
  if (status === "suspended" || status === "inactive" || status === "stopped") {
    return true;
  }

  if (status === "expired") {
    return true;
  }

  if (!snapshot.subscriptionEnd) {
    return false;
  }

  const parsed = new Date(snapshot.subscriptionEnd);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return Date.now() > endOfDayBaghdad(parsed).getTime();
}
