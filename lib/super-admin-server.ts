import {
  detectAdminInfrastructure,
  getAdminInfrastructureNotice,
  isMissingColumnError,
  isMissingRelationError,
} from "@/lib/admin-infrastructure";
import { detectAppSchemaCompatWithClient, type AppSchemaCompat } from "@/lib/schema-compat";
import { createRouteSupabaseClient, getRouteAuthenticatedUser } from "@/lib/supabase-server";
import { type Permission, resolveKnownUserRole } from "@/types/roles";

type RouteSupabaseClient = Awaited<ReturnType<typeof createRouteSupabaseClient>>;

export type SuperAdminActorContext = {
  actorSupabase: RouteSupabaseClient;
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

type OverviewResult = {
  infrastructureNotice: string;
  infrastructure: Awaited<ReturnType<typeof detectAdminInfrastructure>>;
  schemaCompat: AppSchemaCompat;
  schools: SuperAdminSchoolRecord[];
  users: SuperAdminUserRecord[];
  subscriptions: SuperAdminSubscriptionRecord[];
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
      actorUserId: user.id,
    },
  };
}

export async function loadSuperAdminOverview(actorSupabase: RouteSupabaseClient): Promise<OverviewResult> {
  const [infrastructure, schemaCompat] = await Promise.all([
    detectAdminInfrastructure(actorSupabase),
    detectAppSchemaCompatWithClient(actorSupabase),
  ]);

  const notices = [getAdminInfrastructureNotice(infrastructure)].filter(Boolean);
  const schoolsQuery = infrastructure.softDeleteSchools
    ? actorSupabase
        .from("schools")
        .select("id, name, address, phone, owner_email, city, logo_url, primary_color, secondary_color, plan, is_active, created_at")
        .is("deleted_at", null)
    : actorSupabase
        .from("schools")
        .select("id, name, address, phone, owner_email, city, logo_url, primary_color, secondary_color, plan, is_active, created_at");

  const { data: schoolsData, error: schoolsError } = await schoolsQuery.order("created_at", { ascending: false });
  if (schoolsError) {
    throw schoolsError;
  }

  const schools = ((schoolsData ?? []) as SuperAdminSchoolRecord[]).map((school) => ({
    ...school,
    primary_color: typeof school.primary_color === "string" ? school.primary_color : null,
    secondary_color: typeof school.secondary_color === "string" ? school.secondary_color : null,
  }));

  const baseUserColumns = infrastructure.customPermissions
    ? "id, full_name, email, role, school_id, phone, is_active, created_at, custom_permissions"
    : "id, full_name, email, role, school_id, phone, is_active, created_at";

  let users: SuperAdminUserRecord[] = [];
  try {
    const usersQuery = infrastructure.softDeleteUsers
      ? actorSupabase.from("user_profiles").select(`${baseUserColumns}, schools(name)`).is("deleted_at", null)
      : actorSupabase.from("user_profiles").select(`${baseUserColumns}, schools(name)`);

    let usersResponse: any = await usersQuery.order("created_at", { ascending: false });
    let useSchoolFallback = false;

    if (usersResponse.error && isMissingRelationError(usersResponse.error, "user_profiles", "schools")) {
      notices.push("تم تفعيل عرض بديل لأسماء المدارس لأن علاقة الربط لبعض جداول المدير العام غير متاحة حالياً.");
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

    users = rawUsers.map((user) => {
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
    });
  } catch (error) {
    notices.push(error instanceof Error && error.message ? error.message : "تعذر تحميل قائمة المستخدمين حالياً.");
  }

  let subscriptions: SuperAdminSubscriptionRecord[] = [];
  try {
    let subscriptionsResponse: any = await actorSupabase
      .from("subscriptions")
      .select("id, school_id, plan, status, start_date, end_date, created_at, schools(name)")
      .order("created_at", { ascending: false });
    let useSchoolFallback = false;

    if (subscriptionsResponse.error && isMissingRelationError(subscriptionsResponse.error, "subscriptions", "schools")) {
      notices.push("تم تفعيل عرض بديل لأسماء المدارس لأن علاقة الربط لبعض جداول المدير العام غير متاحة حالياً.");
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

    subscriptions = rawSubscriptions.map((item) => ({
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
    }));
  } catch (error) {
    notices.push(error instanceof Error && error.message ? error.message : "تعذر تحميل بيانات الاشتراكات حالياً.");
  }

  return {
    infrastructureNotice: notices.filter(Boolean).join(" "),
    infrastructure,
    schemaCompat,
    schools,
    users,
    subscriptions,
  };
}

export async function updateSuperAdminUserProfile(
  actorSupabase: RouteSupabaseClient,
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
  let response = await actorSupabase
    .from("user_profiles")
    .update(payload)
    .eq("id", userId)
    .select("id, full_name, email, role, school_id, phone, is_active, created_at, custom_permissions, schools(name)")
    .single();

  if (isMissingColumnError(response.error, "user_profiles", "custom_permissions")) {
    const legacyPayload = { ...payload };
    delete (legacyPayload as { custom_permissions?: Permission[] | null }).custom_permissions;
    response = await actorSupabase
      .from("user_profiles")
      .update(legacyPayload)
      .eq("id", userId)
      .select("id, full_name, email, role, school_id, phone, is_active, created_at, schools(name)")
      .single();
  }

  if (isMissingRelationError(response.error, "user_profiles", "schools")) {
    response = await actorSupabase
      .from("user_profiles")
      .update(payload)
      .eq("id", userId)
      .select("id, full_name, email, role, school_id, phone, is_active, created_at, custom_permissions")
      .single();
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
