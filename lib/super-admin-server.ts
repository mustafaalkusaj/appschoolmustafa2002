import {
  detectAdminInfrastructure,
  getAdminInfrastructureNotice,
  isMissingColumnError,
  isMissingRelationError,
} from "@/lib/admin-infrastructure";
import { detectAppSchemaCompatWithClient, type AppSchemaCompat } from "@/lib/schema-compat";
import {
  createRouteSupabaseClient,
  createServiceSupabaseClient,
  getRouteAuthenticatedUser,
} from "@/lib/supabase-server";
import { type Permission, resolveKnownUserRole } from "@/types/roles";

type RouteSupabaseClient = Awaited<ReturnType<typeof createRouteSupabaseClient>>;
type SuperAdminDataSupabaseClient = RouteSupabaseClient | ReturnType<typeof createServiceSupabaseClient>;

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
  email: string | null;
  role: "super_admin" | "admin" | "employee";
  school_id: string | null;
  phone: string | null;
  is_active: boolean;
  custom_permissions: Permission[] | null;
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

  const { data: actorProfile, error: actorProfileError } = await actorSupabase
    .from("user_profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (actorProfileError || !actorProfile || actorProfile.is_active === false) {
    return { ok: false, status: 403, message: "ليس لديك صلاحية استخدام واجهة المدير العام." };
  }

  if (resolveKnownUserRole(actorProfile.role) !== "super_admin") {
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

  const baseUserColumns = infrastructure.customPermissions
    ? "id, full_name, email, role, school_id, phone, is_active, created_at, custom_permissions"
    : "id, full_name, email, role, school_id, phone, is_active, created_at";

  const [usersResult, subscriptionsResult] = await Promise.all([
    (async () => {
      try {
        const usersQuery = infrastructure.softDeleteUsers
          ? actorSupabase.from("user_profiles").select(`${baseUserColumns}, schools(name)`).is("deleted_at", null)
          : actorSupabase.from("user_profiles").select(`${baseUserColumns}, schools(name)`);

        let usersResponse: any = await usersQuery.order("created_at", { ascending: false });
        let useSchoolFallback = false;
        const warnings: string[] = [];

        if (usersResponse.error && isMissingRelationError(usersResponse.error, "user_profiles", "schools")) {
          const warning = "تم تفعيل عرض بديل لأسماء المدارس لأن علاقة الربط لبعض جداول المدير العام غير متاحة حالياً.";
          warnings.push(warning);
          useSchoolFallback = true;
          usersResponse = infrastructure.softDeleteUsers
            ? await actorSupabase
                .from("user_profiles")
                .select(baseUserColumns)
                .is("deleted_at", null)
                .order("created_at", { ascending: false })
            : await actorSupabase.from("user_profiles").select(baseUserColumns).order("created_at", { ascending: false });
        }

        if (usersResponse.error) {
          throw usersResponse.error;
        }

        const rawUsers = (
          useSchoolFallback
            ? attachSchoolNames((usersResponse.data ?? []) as SuperAdminUserRecord[], schools)
            : ((usersResponse.data ?? []) as Array<Record<string, unknown>>)
        ) as Array<Record<string, unknown>>;

        return {
          status: useSchoolFallback ? ("fallback" as OverviewDatasetStatus) : ("loaded" as OverviewDatasetStatus),
          warnings,
          users: rawUsers.map((user): SuperAdminUserRecord => {
            const normalizedRole = resolveKnownUserRole(typeof user.role === "string" ? user.role : null);
            return {
              id: String(user.id),
              full_name: typeof user.full_name === "string" ? user.full_name : null,
              email: typeof user.email === "string" ? user.email : null,
              role:
                normalizedRole === "super_admin"
                  ? "super_admin"
                  : normalizedRole === "admin"
                    ? "admin"
                    : "employee",
              school_id: typeof user.school_id === "string" ? user.school_id : null,
              phone: typeof user.phone === "string" ? user.phone : null,
              is_active: user.is_active !== false,
              custom_permissions: Array.isArray(user.custom_permissions)
                ? (user.custom_permissions.filter((item): item is Permission => typeof item === "string") as Permission[])
                : null,
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
        let subscriptionsResponse: any = await actorSupabase
          .from("subscriptions")
          .select("id, school_id, plan, status, start_date, end_date, created_at, schools(name)")
          .order("created_at", { ascending: false });
        let useSchoolFallback = false;
        const warnings: string[] = [];

        if (subscriptionsResponse.error && isMissingRelationError(subscriptionsResponse.error, "subscriptions", "schools")) {
          const warning = "تم تفعيل عرض بديل لأسماء المدارس لأن علاقة الربط لبعض جداول المدير العام غير متاحة حالياً.";
          warnings.push(warning);
          useSchoolFallback = true;
          subscriptionsResponse = await actorSupabase
            .from("subscriptions")
            .select("id, school_id, plan, status, start_date, end_date, created_at")
            .order("created_at", { ascending: false });
        }

        if (subscriptionsResponse.error) {
          throw subscriptionsResponse.error;
        }

        const rawSubscriptions = useSchoolFallback
          ? attachSchoolNames((subscriptionsResponse.data ?? []) as SuperAdminSubscriptionRecord[], schools)
          : ((subscriptionsResponse.data ?? []) as Array<Record<string, unknown>>);

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

  usersStatus = usersResult.status;
  subscriptionsStatus = subscriptionsResult.status;

  notices.push(...usersResult.warnings, ...subscriptionsResult.warnings);
  loadWarnings.push(...usersResult.warnings, ...subscriptionsResult.warnings);

  const users = usersResult.users;
  const subscriptions = subscriptionsResult.subscriptions;

  const warnings = Array.from(new Set(notices.filter(Boolean)));
  const normalizedLoadWarnings = Array.from(new Set(loadWarnings.filter(Boolean)));

  return {
    infrastructureNotice: warnings.join(" "),
    infrastructure,
    schemaCompat,
    schools,
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
    email: string | null;
    role: "super_admin" | "admin" | "employee";
    school_id: string | null;
    phone: string | null;
    is_active: boolean;
    custom_permissions: Permission[] | null;
  },
) {
  const baseSelect = "id, full_name, email, role, school_id, phone, is_active, created_at";
  const updatePayload = { ...payload } as typeof payload & { custom_permissions?: Permission[] | null };
  let select = `${baseSelect}, custom_permissions, schools(name)`;
  let response: any;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    response = await actorSupabase
      .from("user_profiles")
      .update(updatePayload)
      .eq("id", userId)
      .select(select)
      .single();

    if (!response.error) {
      break;
    }

    if (isMissingColumnError(response.error, "user_profiles", "custom_permissions") && "custom_permissions" in updatePayload) {
      delete updatePayload.custom_permissions;
      select = select.replace(", custom_permissions", "");
      continue;
    }

    if (isMissingRelationError(response.error, "user_profiles", "schools") && select.includes("schools(name)")) {
      select = select.replace(", schools(name)", "");
      continue;
    }

    break;
  }

  if (response.error || !response.data) {
    throw response.error ?? new Error("تعذر تحديث المستخدم.");
  }

  return {
    ...response.data,
    schools: normalizeSchoolRelation(response.data.schools),
    custom_permissions: Array.isArray(response.data.custom_permissions)
      ? (response.data.custom_permissions.filter((item): item is Permission => typeof item === "string") as Permission[])
      : null,
  } as SuperAdminUserRecord;
}
