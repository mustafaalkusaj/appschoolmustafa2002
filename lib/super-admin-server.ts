import {
  detectAdminInfrastructure,
  getAdminInfrastructureNotice,
  isMissingColumnError,
  isMissingRelationError,
  isMissingTableError,
} from "@/lib/admin-infrastructure";
import { resolveWebUserProfile } from "@/lib/authorization/snapshot";
import { filterAllowedPageCodes, type PageCode } from "@/lib/authorization/page-access";
import { detectAppSchemaCompatWithClient, type AppSchemaCompat } from "@/lib/schema-compat";
import {
  createRouteSupabaseClient,
  createServiceSupabaseClient,
  getRouteAuthenticatedUser,
} from "@/lib/supabase-server";
import { type Permission, resolveKnownUserRole } from "@/types/roles";

type RouteSupabaseClient = Awaited<ReturnType<typeof createRouteSupabaseClient>>;
type SuperAdminDataSupabaseClient = RouteSupabaseClient | ReturnType<typeof createServiceSupabaseClient>;

type PostgrestLikeResult = {
  data?: unknown;
  error?: unknown;
};

type UserPageAccessRecord = {
  user_id: string;
  page_code: string | null;
  can_view: boolean | null;
};

function readPostgrestLikeResult(value: unknown): PostgrestLikeResult {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  return {
    data: record.data,
    error: record.error,
  };
}

export type SuperAdminActorContext = {
  actorSupabase: RouteSupabaseClient;
  dataSupabase: SuperAdminDataSupabaseClient;
  actorUserId: string;
};

export type SuperAdminSchoolRecord = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  owner_email: string | null;
  city: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  plan: "basic" | "premium" | "enterprise";
  is_active: boolean;
  created_at?: string | null;
};

export type SuperAdminSchoolRelation = { name: string | null } | Array<{ name: string | null }> | null;

export type SuperAdminUserRecord = {
  id: string;
  full_name: string | null;
  job_title: string | null;
  email: string | null;
  role: "super_admin" | "admin" | "employee";
  school_id: string | null;
  branch_id: string | null;
  default_branch_id: string | null;
  phone: string | null;
  is_active: boolean;
  custom_permissions: Permission[] | null;
  scope_level: "super_admin" | "group_admin" | "branch_user" | "restricted" | null;
  allowed_module: string | null;
  is_single_page_user: boolean;
  hierarchy_level: number | null;
  permissions_version: number;
  allowed_pages: PageCode[];
  schools?: SuperAdminSchoolRelation;
  created_at?: string | null;
};

export type SuperAdminBranchRecord = {
  id: string;
  school_id: string;
  name: string;
  is_active: boolean;
  primary_color: string | null;
  secondary_color: string | null;
  sidebar_color: string | null;
  accent_color: string | null;
  text_color: string | null;
  schools?: SuperAdminSchoolRelation;
  created_at?: string | null;
};

export type SuperAdminSubscriptionRecord = {
  id: string;
  school_id: string;
  plan: "basic" | "premium" | "enterprise";
  status: "active" | "suspended" | "inactive" | "expired";
  start_date: string | null;
  end_date: string | null;
  schools?: SuperAdminSchoolRelation;
  created_at?: string | null;
};

function buildSuperAdminSchoolSelect(schemaCompat: AppSchemaCompat) {
  return schemaCompat.schoolColors
    ? "id, name, address, phone, owner_email, city, logo_url, primary_color, secondary_color, plan, is_active, created_at"
    : "id, name, address, phone, owner_email, city, logo_url, plan, is_active, created_at";
}

function buildSuperAdminBranchSelect(schemaCompat: AppSchemaCompat, includeSchoolRelation = true) {
  const columns = ["id", "school_id", "name", "is_active", "created_at"];

  if (schemaCompat.branchColors) {
    columns.push("primary_color", "secondary_color");
  }

  if (schemaCompat.branchUiColors) {
    columns.push("sidebar_color", "accent_color", "text_color");
  }

  if (includeSchoolRelation) {
    columns.push("schools(name)");
  }

  return columns.join(", ");
}

type OverviewDatasetStatus = "loaded" | "fallback" | "failed";

type OverviewDiagnostics = {
  generatedAt: string;
  warnings: string[];
  schoolsStatus: OverviewDatasetStatus;
  usersStatus: OverviewDatasetStatus;
  subscriptionsStatus: OverviewDatasetStatus;
};

type OverviewResult = {
  infrastructureNotice: string;
  infrastructure: Awaited<ReturnType<typeof detectAdminInfrastructure>>;
  schemaCompat: AppSchemaCompat;
  schools: SuperAdminSchoolRecord[];
  branches: SuperAdminBranchRecord[];
  users: SuperAdminUserRecord[];
  subscriptions: SuperAdminSubscriptionRecord[];
  diagnostics: OverviewDiagnostics;
};

function normalizeSchoolRelation(value: unknown): SuperAdminSchoolRelation {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (!entry || typeof entry !== "object") return { name: null };
        const relation = entry as { name?: unknown };
        return { name: typeof relation.name === "string" ? relation.name : null };
      })
      .slice(0, 1);
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const relation = value as { name?: unknown };
  return { name: typeof relation.name === "string" ? relation.name : null };
}

function attachSchoolNames<T extends { school_id: string | null }>(
  records: T[],
  schools: Array<Pick<SuperAdminSchoolRecord, "id" | "name">>,
) {
  const schoolNamesById = new Map(schools.map((school) => [school.id, school.name]));

  return records.map((record) => ({
    ...record,
    schools: record.school_id ? { name: schoolNamesById.get(record.school_id) ?? null } : null,
  }));
}

function mapAllowedPagesByUserId(records: UserPageAccessRecord[]) {
  const allowedPagesByUserId = new Map<string, PageCode[]>();

  for (const record of records) {
    if (!record.user_id || record.can_view === false) {
      continue;
    }

    const nextPages = filterAllowedPageCodes([record.page_code]);
    if (nextPages.length === 0) {
      continue;
    }

    const current = allowedPagesByUserId.get(record.user_id) ?? [];
    allowedPagesByUserId.set(record.user_id, filterAllowedPageCodes([...current, ...nextPages]));
  }

  return allowedPagesByUserId;
}

export async function replaceSuperAdminUserPageAccess(
  actorSupabase: SuperAdminDataSupabaseClient,
  options: {
    userId: string;
    schoolId: string;
    branchId: string | null;
    grants: Array<{
      page_code: PageCode;
      can_view: boolean;
      can_create: boolean;
      can_update: boolean;
      can_delete: boolean;
      can_approve: boolean;
      can_export: boolean;
    }>;
  },
) {
  const { error: deleteError } = await actorSupabase
    .from("user_page_access")
    .delete()
    .eq("user_id", options.userId);

  if (deleteError && !isMissingTableError(deleteError, "user_page_access")) {
    throw deleteError;
  }

  if (deleteError && isMissingTableError(deleteError, "user_page_access")) {
    throw new Error("جدول user_page_access غير موجود بعد. شغّل migration 20260420_000000_scoped_authorization_foundation.sql أولاً.");
  }

  if (options.grants.length === 0) {
    return;
  }

  const rows = options.grants.map((grant) => ({
    user_id: options.userId,
    school_id: options.schoolId,
    branch_id: options.branchId,
    ...grant,
  }));

  const { error: insertError } = await actorSupabase.from("user_page_access").insert(rows);
  if (insertError) {
    if (isMissingTableError(insertError, "user_page_access")) {
      throw new Error("جدول user_page_access غير موجود بعد. شغّل migration 20260420_000000_scoped_authorization_foundation.sql أولاً.");
    }
    throw insertError;
  }
}

export async function resolveSuperAdminActorContext(
  authHeader?: string | null,
): Promise<
  | { ok: true; value: SuperAdminActorContext }
  | { ok: false; status: number; message: string }
> {
  const actorSupabase = await createRouteSupabaseClient();
  const {
    data: { user },
    error,
  } = await getRouteAuthenticatedUser(actorSupabase, authHeader);

  if (error || !user?.id) {
    return { ok: false, status: 401, message: "يجب تسجيل الدخول أولاً." };
  }

  const actorProfile = await resolveWebUserProfile(actorSupabase, user.id).catch(() => null);

  if (!actorProfile || actorProfile.profile.is_active === false) {
    return { ok: false, status: 403, message: "ليس لديك صلاحية استخدام واجهة المدير العام." };
  }

  if (resolveKnownUserRole(actorProfile.profile.role) !== "super_admin") {
    return { ok: false, status: 403, message: "هذه الواجهة متاحة للمدير العام فقط." };
  }

  return {
    ok: true,
    value: {
      actorSupabase,
      dataSupabase: resolveSuperAdminDataClient(actorSupabase),
      actorUserId: user.id,
    },
  };
}

export function resolveSuperAdminDataClient(actorSupabase: RouteSupabaseClient): SuperAdminDataSupabaseClient {
  try {
    return createServiceSupabaseClient();
  } catch {
    return actorSupabase;
  }
}

export async function loadSuperAdminOverview(actorSupabase: SuperAdminDataSupabaseClient): Promise<OverviewResult> {
  const [infrastructure, schemaCompat] = await Promise.all([
    detectAdminInfrastructure(actorSupabase),
    detectAppSchemaCompatWithClient(actorSupabase),
  ]);

  const notices = [getAdminInfrastructureNotice(infrastructure)].filter(Boolean);
  const loadWarnings: string[] = [];
  let usersStatus: OverviewDatasetStatus = "loaded";
  let subscriptionsStatus: OverviewDatasetStatus = "loaded";
  const schoolSelect = buildSuperAdminSchoolSelect(schemaCompat);
  const schoolsQuery = infrastructure.softDeleteSchools
    ? actorSupabase
        .from("schools")
        .select(schoolSelect)
        .is("deleted_at", null)
    : actorSupabase
        .from("schools")
        .select(schoolSelect);

  const { data: schoolsData, error: schoolsError } = await schoolsQuery.order("created_at", { ascending: false });
  if (schoolsError) {
    throw schoolsError;
  }

  const schools = ((schoolsData ?? []) as unknown as SuperAdminSchoolRecord[]).map((school) => ({
    ...school,
    primary_color: typeof school.primary_color === "string" ? school.primary_color : null,
    secondary_color: typeof school.secondary_color === "string" ? school.secondary_color : null,
  }));

  const userColumnSelects = infrastructure.customPermissions
    ? [
        "id, full_name, job_title, email, role, school_id, branch_id, default_branch_id, phone, is_active, created_at, custom_permissions, scope_level, allowed_module, is_single_page_user, hierarchy_level, permissions_version",
        "id, full_name, email, role, school_id, branch_id, default_branch_id, phone, is_active, created_at, custom_permissions, scope_level, allowed_module, is_single_page_user, hierarchy_level, permissions_version",
        "id, full_name, job_title, email, role, school_id, branch_id, default_branch_id, phone, is_active, created_at, custom_permissions",
        "id, full_name, email, role, school_id, branch_id, default_branch_id, phone, is_active, created_at, custom_permissions",
        "id, full_name, job_title, email, role, school_id, phone, is_active, created_at, custom_permissions",
        "id, full_name, email, role, school_id, phone, is_active, created_at, custom_permissions",
      ]
    : [
        "id, full_name, job_title, email, role, school_id, branch_id, default_branch_id, phone, is_active, created_at, scope_level, allowed_module, is_single_page_user, hierarchy_level, permissions_version",
        "id, full_name, email, role, school_id, branch_id, default_branch_id, phone, is_active, created_at, scope_level, allowed_module, is_single_page_user, hierarchy_level, permissions_version",
        "id, full_name, job_title, email, role, school_id, branch_id, default_branch_id, phone, is_active, created_at",
        "id, full_name, email, role, school_id, branch_id, default_branch_id, phone, is_active, created_at",
        "id, full_name, job_title, email, role, school_id, phone, is_active, created_at",
        "id, full_name, email, role, school_id, phone, is_active, created_at",
      ];

  const [branchesResult, usersResult, subscriptionsResult] = await Promise.all([
    (async () => {
      if (!infrastructure.branches) {
        return {
          warnings: [] as string[],
          branches: [] as SuperAdminBranchRecord[],
        };
      }

      try {
        const branchSelect = buildSuperAdminBranchSelect(schemaCompat);
        const branchSelectWithoutRelation = buildSuperAdminBranchSelect(schemaCompat, false);
        const branchesQuery = infrastructure.softDeleteBranches
          ? actorSupabase.from("branches").select(branchSelect).is("deleted_at", null)
          : actorSupabase.from("branches").select(branchSelect);

        let branchesResponse: unknown = await branchesQuery.order("created_at", { ascending: false });
        let useSchoolFallback = false;
        const warnings: string[] = [];

        const initialBranches = readPostgrestLikeResult(branchesResponse);
        if (initialBranches.error && isMissingRelationError(initialBranches.error, "branches", "schools")) {
          warnings.push("تم تفعيل عرض بديل لأسماء المدارس لبعض بيانات الفروع لأن علاقة الربط غير متاحة حالياً.");
          useSchoolFallback = true;
          branchesResponse = infrastructure.softDeleteBranches
            ? await actorSupabase
                .from("branches")
                .select(branchSelectWithoutRelation)
                .is("deleted_at", null)
                .order("created_at", { ascending: false })
            : await actorSupabase
                .from("branches")
                .select(branchSelectWithoutRelation)
                .order("created_at", { ascending: false });
        }

        const finalBranches = readPostgrestLikeResult(branchesResponse);
        if (finalBranches.error) {
          throw finalBranches.error;
        }

        const rawBranches = (
          useSchoolFallback
            ? attachSchoolNames((finalBranches.data ?? []) as SuperAdminBranchRecord[], schools)
            : ((finalBranches.data ?? []) as Array<Record<string, unknown>>)
        ) as Array<Record<string, unknown>>;

        return {
          warnings,
          branches: rawBranches.map((branch): SuperAdminBranchRecord => ({
            id: String(branch.id),
            school_id: String(branch.school_id),
            name: typeof branch.name === "string" ? branch.name : "—",
            is_active: branch.is_active !== false,
            primary_color: typeof branch.primary_color === "string" ? branch.primary_color : null,
            secondary_color: typeof branch.secondary_color === "string" ? branch.secondary_color : null,
            sidebar_color: typeof branch.sidebar_color === "string" ? branch.sidebar_color : null,
            accent_color: typeof branch.accent_color === "string" ? branch.accent_color : null,
            text_color: typeof branch.text_color === "string" ? branch.text_color : null,
            schools: normalizeSchoolRelation(branch.schools),
            created_at: typeof branch.created_at === "string" ? branch.created_at : null,
          })),
        };
      } catch (error) {
        return {
          warnings: [error instanceof Error && error.message ? error.message : "تعذر تحميل قائمة الفروع حالياً."],
          branches: [] as SuperAdminBranchRecord[],
        };
      }
    })(),
    (async () => {
      try {
        let selectColumns = userColumnSelects[0];
        let usersResponse: unknown = null;
        for (const candidateSelect of userColumnSelects) {
          selectColumns = candidateSelect;
          usersResponse = infrastructure.softDeleteUsers
            ? await actorSupabase
                .from("user_profiles")
                .select(`${candidateSelect}, schools(name)`)
                .is("deleted_at", null)
                .order("created_at", { ascending: false })
            : await actorSupabase
                .from("user_profiles")
                .select(`${candidateSelect}, schools(name)`)
                .order("created_at", { ascending: false });

          const candidateResult = readPostgrestLikeResult(usersResponse);
          if (!candidateResult.error) {
            break;
          }

          if (!isMissingColumnError(candidateResult.error, "user_profiles")) {
            break;
          }
        }

        let useSchoolFallback = false;
        const warnings: string[] = [];

        const initialUsersResult = readPostgrestLikeResult(usersResponse);
        if (initialUsersResult.error && isMissingRelationError(initialUsersResult.error, "user_profiles", "schools")) {
          const warning = "تم تفعيل عرض بديل لأسماء المدارس لأن علاقة الربط لبعض جداول المدير العام غير متاحة حالياً.";
          warnings.push(warning);
          useSchoolFallback = true;
          usersResponse = infrastructure.softDeleteUsers
            ? await actorSupabase
                .from("user_profiles")
                .select(selectColumns)
                .is("deleted_at", null)
                .order("created_at", { ascending: false })
            : await actorSupabase.from("user_profiles").select(selectColumns).order("created_at", { ascending: false });
        }

        const finalUsersResult = readPostgrestLikeResult(usersResponse);
        if (finalUsersResult.error) {
          throw finalUsersResult.error;
        }

        const rawUsers = (
          useSchoolFallback
            ? attachSchoolNames((finalUsersResult.data ?? []) as SuperAdminUserRecord[], schools)
            : ((finalUsersResult.data ?? []) as Array<Record<string, unknown>>)
        ) as Array<Record<string, unknown>>;

        return {
          status: useSchoolFallback ? ("fallback" as OverviewDatasetStatus) : ("loaded" as OverviewDatasetStatus),
          warnings,
          users: rawUsers.map((user): SuperAdminUserRecord => {
            const normalizedRole = resolveKnownUserRole(typeof user.role === "string" ? user.role : null);
            return {
              id: String(user.id),
              full_name: typeof user.full_name === "string" ? user.full_name : null,
              job_title: typeof user.job_title === "string" ? user.job_title : null,
              email: typeof user.email === "string" ? user.email : null,
              role:
                normalizedRole === "super_admin"
                  ? "super_admin"
                  : normalizedRole === "admin"
                    ? "admin"
                    : "employee",
              school_id: typeof user.school_id === "string" ? user.school_id : null,
              branch_id: typeof user.branch_id === "string" ? user.branch_id : null,
              default_branch_id: typeof user.default_branch_id === "string" ? user.default_branch_id : null,
              phone: typeof user.phone === "string" ? user.phone : null,
              is_active: user.is_active !== false,
              custom_permissions: Array.isArray(user.custom_permissions)
                ? (user.custom_permissions.filter((item): item is Permission => typeof item === "string") as Permission[])
                : null,
              scope_level:
                user.scope_level === "super_admin" ||
                user.scope_level === "group_admin" ||
                user.scope_level === "branch_user"
                  ? user.scope_level
                  : user.scope_level === "restricted"
                    ? typeof user.branch_id === "string" || typeof user.default_branch_id === "string"
                      ? "branch_user"
                      : "group_admin"
                  : null,
              allowed_module: typeof user.allowed_module === "string" ? user.allowed_module : null,
              is_single_page_user: user.is_single_page_user === true,
              hierarchy_level: typeof user.hierarchy_level === "number" ? user.hierarchy_level : null,
              permissions_version: typeof user.permissions_version === "number" ? user.permissions_version : 1,
              allowed_pages: [],
              schools: normalizeSchoolRelation(user.schools),
              created_at: typeof user.created_at === "string" ? user.created_at : null,
            };
          }),
        };
      } catch (error) {
        return {
          status: "failed" as OverviewDatasetStatus,
          warnings: [error instanceof Error && error.message ? error.message : "تعذر تحميل قائمة المستخدمين حالياً."],
          users: [] as SuperAdminUserRecord[],
        };
      }
    })(),
    (async () => {
      try {
        let subscriptionsResponse: unknown = await actorSupabase
          .from("subscriptions")
          .select("id, school_id, plan, status, start_date, end_date, created_at, schools(name)")
          .order("created_at", { ascending: false });
        let useSchoolFallback = false;
        const warnings: string[] = [];

        const initialSubscriptions = readPostgrestLikeResult(subscriptionsResponse);
        if (initialSubscriptions.error && isMissingRelationError(initialSubscriptions.error, "subscriptions", "schools")) {
          const warning = "تم تفعيل عرض بديل لأسماء المدارس لأن علاقة الربط لبعض جداول المدير العام غير متاحة حالياً.";
          warnings.push(warning);
          useSchoolFallback = true;
          subscriptionsResponse = await actorSupabase
            .from("subscriptions")
            .select("id, school_id, plan, status, start_date, end_date, created_at")
            .order("created_at", { ascending: false });
        }

        const finalSubscriptions = readPostgrestLikeResult(subscriptionsResponse);
        if (finalSubscriptions.error) {
          throw finalSubscriptions.error;
        }

        const rawSubscriptions = useSchoolFallback
          ? attachSchoolNames((finalSubscriptions.data ?? []) as SuperAdminSubscriptionRecord[], schools)
          : ((finalSubscriptions.data ?? []) as Array<Record<string, unknown>>);

        return {
          status: useSchoolFallback ? ("fallback" as OverviewDatasetStatus) : ("loaded" as OverviewDatasetStatus),
          warnings,
          subscriptions: rawSubscriptions.map((item): SuperAdminSubscriptionRecord => ({
            id: String(item.id),
            school_id: String(item.school_id),
            plan: item.plan === "premium" || item.plan === "enterprise" ? item.plan : "basic",
            status:
              item.status === "suspended" || item.status === "inactive" || item.status === "expired"
                ? item.status
                : "active",
            start_date: typeof item.start_date === "string" ? item.start_date : null,
            end_date: typeof item.end_date === "string" ? item.end_date : null,
            schools: normalizeSchoolRelation(item.schools),
            created_at: typeof item.created_at === "string" ? item.created_at : null,
          })),
        };
      } catch (error) {
        return {
          status: "failed" as OverviewDatasetStatus,
          warnings: [error instanceof Error && error.message ? error.message : "تعذر تحميل بيانات الاشتراكات حالياً."],
          subscriptions: [] as SuperAdminSubscriptionRecord[],
        };
      }
    })(),
  ]);

  const userIds = usersResult.users.map((user) => user.id);
  let allowedPagesByUserId = new Map<string, PageCode[]>();
  if (userIds.length > 0) {
    const pageAccessResponse = await actorSupabase
      .from("user_page_access")
      .select("user_id, page_code, can_view")
      .in("user_id", userIds);

    if (pageAccessResponse.error) {
      if (!isMissingTableError(pageAccessResponse.error, "user_page_access")) {
        throw pageAccessResponse.error;
      }
    } else {
      allowedPagesByUserId = mapAllowedPagesByUserId(
        (pageAccessResponse.data ?? []) as UserPageAccessRecord[],
      );
    }
  }

  usersStatus = usersResult.status;
  subscriptionsStatus = subscriptionsResult.status;

  notices.push(...branchesResult.warnings, ...usersResult.warnings, ...subscriptionsResult.warnings);
  loadWarnings.push(...branchesResult.warnings, ...usersResult.warnings, ...subscriptionsResult.warnings);

  const branches = branchesResult.branches;
  const users = usersResult.users.map((user) => {
    const allowedPages = allowedPagesByUserId.get(user.id) ?? filterAllowedPageCodes([user.allowed_module]);
    return {
      ...user,
      allowed_pages: allowedPages,
    };
  });
  const subscriptions = subscriptionsResult.subscriptions;

  const warnings = Array.from(new Set(notices.filter(Boolean)));
  const normalizedLoadWarnings = Array.from(new Set(loadWarnings.filter(Boolean)));

  return {
    infrastructureNotice: warnings.join(" "),
    infrastructure,
    schemaCompat,
    schools,
    branches,
    users,
    subscriptions,
    diagnostics: {
      generatedAt: new Date().toISOString(),
      warnings: normalizedLoadWarnings,
      schoolsStatus: "loaded",
      usersStatus,
      subscriptionsStatus,
    },
  };
}

export async function updateSuperAdminUserProfile(
  actorSupabase: SuperAdminDataSupabaseClient,
  userId: string,
  payload: {
    full_name: string | null;
    job_title: string | null;
    email: string | null;
    role: "super_admin" | "admin" | "employee";
    school_id: string | null;
    branch_id: string | null;
    default_branch_id: string | null;
    phone: string | null;
    is_active: boolean;
    custom_permissions: Permission[] | null;
    scope_level: "super_admin" | "group_admin" | "branch_user" | "restricted";
    allowed_module: string | null;
    is_single_page_user: boolean;
    hierarchy_level: number | null;
    permissions_version: number;
    allowed_pages: PageCode[];
    page_access_grants: Array<{
      page_code: PageCode;
      can_view: boolean;
      can_create: boolean;
      can_update: boolean;
      can_delete: boolean;
      can_approve: boolean;
      can_export: boolean;
    }>;
  },
) {
  const baseSelect =
    "id, full_name, job_title, email, role, school_id, branch_id, default_branch_id, phone, is_active, created_at, scope_level, allowed_module, is_single_page_user, hierarchy_level, permissions_version";
  const updatePayload = {
    full_name: payload.full_name,
    job_title: payload.job_title,
    email: payload.email,
    role: payload.role,
    school_id: payload.school_id,
    branch_id: payload.branch_id,
    default_branch_id: payload.default_branch_id,
    phone: payload.phone,
    is_active: payload.is_active,
    custom_permissions: payload.custom_permissions,
    scope_level: payload.scope_level,
    allowed_module: payload.allowed_module,
    is_single_page_user: payload.is_single_page_user,
    hierarchy_level: payload.hierarchy_level,
    permissions_version: payload.permissions_version,
  } as Record<string, unknown>;
  let select = `${baseSelect}, custom_permissions, schools(name)`;
  let response: unknown;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    response = await actorSupabase
      .from("user_profiles")
      .update(updatePayload)
      .eq("id", userId)
      .select(select)
      .single();

    const responseResult = readPostgrestLikeResult(response);
    if (!responseResult.error) {
      break;
    }

    if (isMissingColumnError(responseResult.error, "user_profiles", "custom_permissions") && "custom_permissions" in updatePayload) {
      delete updatePayload.custom_permissions;
      select = select.replace(", custom_permissions", "");
      continue;
    }

    if (isMissingColumnError(responseResult.error, "user_profiles", "job_title") && "job_title" in updatePayload) {
      delete updatePayload.job_title;
      select = select.replace("job_title, ", "");
      continue;
    }

    if (isMissingColumnError(responseResult.error, "user_profiles", "branch_id") && "branch_id" in updatePayload) {
      throw new Error("حقول النطاق الجديد غير موجودة بعد في user_profiles. شغّل migration 20260420_000000_scoped_authorization_foundation.sql أولاً.");
    }

    if (isMissingRelationError(responseResult.error, "user_profiles", "schools") && select.includes("schools(name)")) {
      select = select.replace(", schools(name)", "");
      continue;
    }

    break;
  }

  const finalResult = readPostgrestLikeResult(response);
  if (finalResult.error || !finalResult.data) {
    throw finalResult.error ?? new Error("تعذر تحديث المستخدم.");
  }

  if (payload.school_id && payload.page_access_grants.length > 0) {
    await replaceSuperAdminUserPageAccess(actorSupabase, {
      userId,
      schoolId: payload.school_id,
      branchId: payload.branch_id,
      grants: payload.page_access_grants,
    });
  } else {
    const { error: deleteError } = await actorSupabase
      .from("user_page_access")
      .delete()
      .eq("user_id", userId);

    if (deleteError && !isMissingTableError(deleteError, "user_page_access")) {
      throw deleteError;
    }
  }

  const normalizedRecord = {
    ...(finalResult.data as Record<string, unknown>),
    schools: normalizeSchoolRelation((finalResult.data as Record<string, unknown>).schools),
    custom_permissions: Array.isArray((finalResult.data as Record<string, unknown>).custom_permissions)
      ? (((finalResult.data as Record<string, unknown>).custom_permissions as unknown[]).filter(
          (item): item is Permission => typeof item === "string",
        ) as Permission[])
      : null,
  } as SuperAdminUserRecord;

  return {
    ...normalizedRecord,
    job_title:
      typeof normalizedRecord.job_title === "string"
        ? normalizedRecord.job_title
        : payload.job_title,
    branch_id: typeof normalizedRecord.branch_id === "string" ? normalizedRecord.branch_id : payload.branch_id,
    default_branch_id:
      typeof normalizedRecord.default_branch_id === "string"
        ? normalizedRecord.default_branch_id
        : payload.default_branch_id,
    scope_level:
      normalizedRecord.scope_level === "super_admin" ||
      normalizedRecord.scope_level === "group_admin" ||
      normalizedRecord.scope_level === "branch_user"
        ? normalizedRecord.scope_level
        : normalizedRecord.scope_level === "restricted"
          ? payload.branch_id
            ? "branch_user"
            : "group_admin"
        : payload.scope_level,
    allowed_module: typeof normalizedRecord.allowed_module === "string" ? normalizedRecord.allowed_module : payload.allowed_module,
    is_single_page_user:
      typeof normalizedRecord.is_single_page_user === "boolean"
        ? normalizedRecord.is_single_page_user
        : payload.is_single_page_user,
    hierarchy_level:
      typeof normalizedRecord.hierarchy_level === "number" ? normalizedRecord.hierarchy_level : payload.hierarchy_level,
    permissions_version:
      typeof normalizedRecord.permissions_version === "number"
        ? normalizedRecord.permissions_version
        : payload.permissions_version,
    allowed_pages: payload.allowed_pages,
  } as SuperAdminUserRecord;
}
