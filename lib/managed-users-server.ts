import type { User as AuthUser } from "@supabase/supabase-js";

import { isInfrastructureCompatError, isMissingColumnError, isMissingTableError } from "@/lib/admin-infrastructure";
import { SCHOOL_BRAND } from "@/lib/branding";
import {
  createRouteSupabaseClient,
  createServiceSupabaseClient,
  getRouteAuthenticatedUser,
} from "@/lib/supabase-server";
import type {
  ManagedUserRole,
  ManagedTeacherAssignmentInput,
  ManagedTeacherAssignmentRecord,
  ManagedTeacherRecord,
  ManagedStudentRecord,
  ManagedUserAccountCard,
  ManagedUserAppAccountSummary,
  ManagedUserRecord,
} from "@/lib/managed-users";
import { MANAGED_USER_INACTIVE_BAN_DURATION } from "@/lib/managed-users";
import { resolveKnownUserRole, type UserRole } from "@/types/roles";

export const MANAGED_USER_SELECT = `
  auth_user_id,
  school_id,
  role,
  full_name,
  email,
  phone,
  is_active,
  created_at,
  updated_at,
  student:student_id (
    id,
    full_name,
    class_name,
    section,
    address,
    total_fee,
    paid_fee,
    discount_value,
    status
  ),
  teacher:teacher_id (
    id,
    full_name,
    email,
    phone,
    specialization,
    notes,
    is_active
  )
`;

type RouteSupabaseClient = Awaited<ReturnType<typeof createRouteSupabaseClient>>;

type CredentialRow = {
  auth_user_id: string;
  login_identifier: string;
  temporary_password: string | null;
  password_last_reset_at: string | null;
  card_last_printed_at: string | null;
};

type TeacherAssignmentRow = {
  id: string;
  teacher_id: string;
  subject_id: string | null;
  class_id: string | null;
  section_id: string | null;
  is_active: boolean | null;
};

type TeacherAssignmentLookupRow = {
  id: string;
  name: string;
};

type LookupRecord = Record<string, unknown>;

export type ManagedUsersActorContext = {
  actorSupabase: RouteSupabaseClient;
  actorUserId: string;
  actorRole: "super_admin" | "admin";
  targetSchoolId: string;
};

export type SchoolScopedActorContext = {
  actorSupabase: RouteSupabaseClient;
  actorUserId: string;
  actorRole: UserRole;
  targetSchoolId: string;
};

export type ManagedAccountLinkageStatus = "ok" | "missing";

export interface ManagedAccountBaseSnapshot {
  authUser: AuthUser;
  user: ManagedUserRecord | null;
  managedProfileExists: boolean;
  authUserIsActive: boolean;
  schoolId: string | null;
  role: ManagedUserRole | null;
  loginIdentifier: string | null;
  identity: {
    auth_user_id: string;
    role: ManagedUserRole | null;
    school_id: string | null;
    login_identifier: string | null;
    is_active: boolean;
  };
  linkage: {
    managed_profile_exists: boolean;
    linked_record_type: ManagedUserRole | null;
    linked_record_id: string | null;
    linked_record_status: ManagedAccountLinkageStatus;
  };
}

export type TeacherTableCapabilities = {
  specialization: boolean;
  subject: boolean;
  notes: boolean;
  is_active: boolean;
  status: boolean;
  classes_taught: boolean;
};

const SCHEMA_CAPABILITY_TTL_MS = 5 * 60 * 1000;
const AUTH_CREDENTIAL_CACHE_TTL_MS = 5 * 60 * 1000;
const schemaCapabilityCache = new Map<string, { value: boolean; expiresAt: number }>();
const schemaCapabilityPending = new Map<string, Promise<boolean>>();
let teacherTableCapabilitiesCache: { value: TeacherTableCapabilities; expiresAt: number } | null = null;
let teacherTableCapabilitiesPending: Promise<TeacherTableCapabilities> | null = null;
const authCredentialCache = new Map<string, { value: CredentialRow | null; expiresAt: number }>();
const authCredentialPending = new Map<string, Promise<CredentialRow | null>>();

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value: unknown) {
  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : null;
}

function normalizeNullableTimestamp(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function getManagedAccountLoginIdentifier(authUser: AuthUser, user: ManagedUserRecord | null) {
  const userMetadata = asObject(authUser.user_metadata);
  const appMetadata = asObject(authUser.app_metadata);
  const managedCredentials = asObject(appMetadata.managed_credentials ?? userMetadata.managed_credentials);

  return (
    user?.app_account?.login_identifier ??
    nullableText(managedCredentials.login_identifier) ??
    nullableText(userMetadata.loginIdentifier) ??
    nullableText(authUser.email)
  );
}

function getManagedAuthUserIsActive(authUser: AuthUser) {
  if (typeof authUser.banned_until === "string" && authUser.banned_until.trim()) {
    return new Date(authUser.banned_until).getTime() <= Date.now();
  }

  return true;
}

function isSchoolSubscriptionExpired(endDate: string | null | undefined) {
  if (!endDate) return false;
  const parsed = new Date(endDate);
  if (Number.isNaN(parsed.getTime())) return false;
  parsed.setHours(23, 59, 59, 999);
  return Date.now() > parsed.getTime();
}

export async function resolveSchoolScopedActorContext(
  requestedSchoolId: string | null | undefined,
  options: {
    allowedRoles: UserRole[];
    roleDeniedMessage: string;
  },
  authHeader?: string | null,
): Promise<
  | { ok: true; value: SchoolScopedActorContext }
  | { ok: false; status: number; message: string }
> {
  const actorSupabase = await createRouteSupabaseClient();
  const {
    data: { user },
    error: actorUserError,
  } = await getRouteAuthenticatedUser(actorSupabase, authHeader);

  if (actorUserError || !user?.id) {
    return { ok: false, status: 401, message: "يجب تسجيل الدخول أولاً." };
  }

  const { data: actorProfile, error: actorProfileError } = await actorSupabase
    .from("user_profiles")
    .select("role, school_id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (actorProfileError || !actorProfile || actorProfile.is_active === false) {
    return { ok: false, status: 403, message: "ليس لديك صلاحية لاستخدام هذه الواجهة." };
  }

  const actorRole = resolveKnownUserRole(actorProfile.role);
  if (!actorRole) {
    return { ok: false, status: 403, message: "هذا الحساب غير مخصص للوصول إلى لوحة الويب الإدارية." };
  }

  if (!options.allowedRoles.includes(actorRole)) {
    return { ok: false, status: 403, message: options.roleDeniedMessage };
  }

  const requested = requestedSchoolId?.trim() || null;
  let targetSchoolId = requested;

  if (actorRole !== "super_admin") {
    if (!actorProfile.school_id) {
      return { ok: false, status: 403, message: "الحساب الحالي غير مرتبط بمدرسة صالحة." };
    }

    if (requested && requested !== actorProfile.school_id) {
      return { ok: false, status: 403, message: "لا يمكنك تنفيذ هذا الإجراء خارج مدرسة حسابك الحالية." };
    }

    targetSchoolId = actorProfile.school_id;
  }

  if (!targetSchoolId) {
    return { ok: false, status: 400, message: "يجب تحديد مدرسة قبل متابعة هذا الإجراء." };
  }

  const [{ data: school, error: schoolError }, { data: subscription, error: subscriptionError }] = await Promise.all([
    actorSupabase
      .from("schools")
      .select("id, is_active")
      .eq("id", targetSchoolId)
      .maybeSingle(),
    actorSupabase
      .from("subscriptions")
      .select("status, end_date")
      .eq("school_id", targetSchoolId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (schoolError || !school?.id) {
    return { ok: false, status: 400, message: "المدرسة المحددة غير متاحة لهذا المستخدم." };
  }

  if (subscriptionError && !isMissingTableError(subscriptionError, "subscriptions")) {
    return { ok: false, status: 500, message: "تعذر التحقق من حالة اشتراك المدرسة الحالية." };
  }

  if (actorRole !== "super_admin") {
    if (school.is_active === false) {
      return { ok: false, status: 403, message: "المدرسة الحالية غير مفعلة، لذلك تم حظر هذا الإجراء." };
    }

    const status = (subscription?.status || "").toLowerCase();
    const blockedByStatus = status === "suspended" || status === "inactive" || status === "stopped";
    const blockedByExpiry = status === "expired" || isSchoolSubscriptionExpired(subscription?.end_date);

    if (blockedByStatus || blockedByExpiry) {
      return { ok: false, status: 403, message: "اشتراك المدرسة الحالية غير صالح، لذلك تم حظر هذا الإجراء." };
    }
  }

  return {
    ok: true,
    value: {
      actorSupabase,
      actorUserId: user.id,
      actorRole,
      targetSchoolId,
    },
  };
}

export async function tableHasColumn(
  actorSupabase: RouteSupabaseClient,
  table: string,
  column: string,
) {
  const cacheKey = `${table}.${column}`;
  const now = Date.now();
  const cached = schemaCapabilityCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const pending = schemaCapabilityPending.get(cacheKey);
  if (pending) {
    return pending;
  }

  const nextProbe = (async () => {
    const { error } = await actorSupabase.from(table).select(column).limit(1);

    if (!error) {
      schemaCapabilityCache.set(cacheKey, {
        value: true,
        expiresAt: Date.now() + SCHEMA_CAPABILITY_TTL_MS,
      });
      return true;
    }

    if (isMissingColumnError(error, table, column)) {
      schemaCapabilityCache.set(cacheKey, {
        value: false,
        expiresAt: Date.now() + SCHEMA_CAPABILITY_TTL_MS,
      });
      return false;
    }

    throw error;
  })();

  schemaCapabilityPending.set(cacheKey, nextProbe);

  try {
    return await nextProbe;
  } finally {
    schemaCapabilityPending.delete(cacheKey);
  }
}

export async function getTeacherTableCapabilities(
  actorSupabase: RouteSupabaseClient,
): Promise<TeacherTableCapabilities> {
  const now = Date.now();
  if (teacherTableCapabilitiesCache && teacherTableCapabilitiesCache.expiresAt > now) {
    return teacherTableCapabilitiesCache.value;
  }

  if (teacherTableCapabilitiesPending) {
    return teacherTableCapabilitiesPending;
  }

  teacherTableCapabilitiesPending = (async () => {
    const [specialization, subject, notes, is_active, status, classes_taught] = await Promise.all([
      tableHasColumn(actorSupabase, "teachers", "specialization"),
      tableHasColumn(actorSupabase, "teachers", "subject"),
      tableHasColumn(actorSupabase, "teachers", "notes"),
      tableHasColumn(actorSupabase, "teachers", "is_active"),
      tableHasColumn(actorSupabase, "teachers", "status"),
      tableHasColumn(actorSupabase, "teachers", "classes_taught"),
    ]);

    const value = {
      specialization,
      subject,
      notes,
      is_active,
      status,
      classes_taught,
    };

    teacherTableCapabilitiesCache = {
      value,
      expiresAt: Date.now() + SCHEMA_CAPABILITY_TTL_MS,
    };

    return value;
  })();

  try {
    return await teacherTableCapabilitiesPending;
  } finally {
    teacherTableCapabilitiesPending = null;
  }
}

function resolveSchoolLogoFromRecord(record: Record<string, unknown> | null | undefined) {
  const candidates = [
    record?.logo_url,
    record?.logo,
    record?.school_logo_url,
    record?.brand_logo_url,
    record?.image_url,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return SCHOOL_BRAND.logo;
}

export async function fetchManagedAccountSchoolBrand(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
) {
  const [logoUrl, logo, schoolLogoUrl, brandLogoUrl, imageUrl, primaryColor, secondaryColor, themePreset] = await Promise.all([
    tableHasColumn(actorSupabase, "schools", "logo_url").catch(() => false),
    tableHasColumn(actorSupabase, "schools", "logo").catch(() => false),
    tableHasColumn(actorSupabase, "schools", "school_logo_url").catch(() => false),
    tableHasColumn(actorSupabase, "schools", "brand_logo_url").catch(() => false),
    tableHasColumn(actorSupabase, "schools", "image_url").catch(() => false),
    tableHasColumn(actorSupabase, "schools", "primary_color").catch(() => false),
    tableHasColumn(actorSupabase, "schools", "secondary_color").catch(() => false),
    tableHasColumn(actorSupabase, "schools", "theme_preset").catch(() => false),
  ]);

  const selectColumns = [
    "name",
    ...(logoUrl ? ["logo_url"] : []),
    ...(logo ? ["logo"] : []),
    ...(schoolLogoUrl ? ["school_logo_url"] : []),
    ...(brandLogoUrl ? ["brand_logo_url"] : []),
    ...(imageUrl ? ["image_url"] : []),
    ...(primaryColor ? ["primary_color"] : []),
    ...(secondaryColor ? ["secondary_color"] : []),
    ...(themePreset ? ["theme_preset"] : []),
  ].join(", ");

  const { data, error } = await actorSupabase
    .from("schools")
    .select(selectColumns)
    .eq("id", schoolId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const schoolRecord = (data ?? null) as unknown as Record<string, unknown> | null;
  const schoolName =
    (typeof schoolRecord?.name === "string" && schoolRecord.name.trim()) || SCHOOL_BRAND.nameAr;

  return {
    schoolName,
    schoolLogoUrl: resolveSchoolLogoFromRecord(schoolRecord),
    primaryColor: typeof schoolRecord?.primary_color === "string" ? schoolRecord.primary_color : null,
    secondaryColor: typeof schoolRecord?.secondary_color === "string" ? schoolRecord.secondary_color : null,
    themePreset: typeof schoolRecord?.theme_preset === "string" ? schoolRecord.theme_preset : null,
  };
}

export async function resolveManagedUsersActorContext(
  requestedSchoolId?: string | null,
  authHeader?: string | null,
): Promise<
  | { ok: true; value: ManagedUsersActorContext }
  | { ok: false; status: number; message: string }
> {
  const context = await resolveSchoolScopedActorContext(requestedSchoolId, {
    allowedRoles: ["super_admin", "admin"],
    roleDeniedMessage: "إدارة الحسابات متاحة للمدير فقط.",
  }, authHeader);

  if (!context.ok) {
    return {
      ok: false,
      status: "status" in context ? context.status : 500,
      message: "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
    };
  }

  return {
    ok: true,
    value: {
      actorSupabase: context.value.actorSupabase,
      actorUserId: context.value.actorUserId,
      actorRole: context.value.actorRole as "super_admin" | "admin",
      targetSchoolId: context.value.targetSchoolId,
    },
  };
}

export async function resolveSchoolBranchId(actorSupabase: RouteSupabaseClient, schoolId: string) {
  const { data, error } = await actorSupabase
    .from("branches")
    .select("id")
    .eq("school_id", schoolId)
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error, "branches")) {
      return null;
    }

    throw error;
  }

  return data?.id ?? null;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function normalizeLookupText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getClassLookupName(row: LookupRecord | null | undefined) {
  return normalizeLookupText(row?.name) || normalizeLookupText(row?.grade);
}

function getSectionLookupName(row: LookupRecord | null | undefined) {
  return normalizeLookupText(row?.name) || normalizeLookupText(row?.section) || null;
}

function matchesLookupText(left: string | null | undefined, right: string | null | undefined) {
  const normalizedLeft = (left ?? "").trim().toLowerCase();
  const normalizedRight = (right ?? "").trim().toLowerCase();
  return normalizedLeft.length > 0 && normalizedLeft === normalizedRight;
}

export function normalizeManagedUserRecord(record: Record<string, unknown>): ManagedUserRecord {
  const student = firstRelation(record.student as ManagedStudentRecord | ManagedStudentRecord[] | null | undefined);
  const teacher = firstRelation(record.teacher as ManagedTeacherRecord | ManagedTeacherRecord[] | null | undefined);

  return {
    auth_user_id: String(record.auth_user_id),
    school_id: String(record.school_id),
    role: record.role === "teacher" ? "teacher" : "student",
    full_name: typeof record.full_name === "string" ? record.full_name : "",
    email: typeof record.email === "string" ? record.email : "",
    phone: typeof record.phone === "string" ? record.phone : null,
    is_active: Boolean(record.is_active),
    created_at: typeof record.created_at === "string" ? record.created_at : null,
    updated_at: typeof record.updated_at === "string" ? record.updated_at : null,
    student: student
      ? {
          id: String(student.id),
          full_name: typeof student.full_name === "string" ? student.full_name : null,
          class_name: typeof student.class_name === "string" ? student.class_name : null,
          section: typeof student.section === "string" ? student.section : null,
          address: typeof student.address === "string" ? student.address : null,
          total_fee: typeof student.total_fee === "number" ? student.total_fee : Number(student.total_fee ?? 0),
          paid_fee: typeof student.paid_fee === "number" ? student.paid_fee : Number(student.paid_fee ?? 0),
          discount_value:
            typeof student.discount_value === "number"
              ? student.discount_value
              : Number(student.discount_value ?? 0),
          status: typeof student.status === "string" ? student.status : null,
        }
      : null,
    teacher: teacher
      ? {
          id: String(teacher.id),
          full_name: typeof teacher.full_name === "string" ? teacher.full_name : null,
          email: typeof teacher.email === "string" ? teacher.email : null,
          phone: typeof teacher.phone === "string" ? teacher.phone : null,
          specialization: typeof teacher.specialization === "string" ? teacher.specialization : null,
          notes: typeof teacher.notes === "string" ? teacher.notes : null,
          is_active: typeof teacher.is_active === "boolean" ? teacher.is_active : null,
          assignments: [],
        }
      : null,
    app_account: null,
  };
}

export function normalizeManagedUserRecords(records: Record<string, unknown>[] | null | undefined) {
  return (records ?? []).map((record) => normalizeManagedUserRecord(record));
}

function toCredentialSummary(row: CredentialRow): ManagedUserAppAccountSummary {
  return {
    login_identifier: row.login_identifier,
    has_temporary_password: Boolean(row.temporary_password),
    password_last_reset_at: row.password_last_reset_at,
    card_last_printed_at: row.card_last_printed_at,
  };
}

function randomFragment(length = 6) {
  return Math.random().toString(36).slice(2, 2 + length);
}

function slugifyIdentifier(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let password = "Sch-";

  for (let index = 0; index < 8; index += 1) {
    password += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return password;
}

export async function generateManagedLoginIdentifier(
  actorSupabase: RouteSupabaseClient,
  options: {
    schoolId: string;
    role: "student" | "teacher";
    fullName: string;
    preferredEmail?: string | null;
  },
) {
  const preferred = options.preferredEmail?.trim().toLowerCase() || "";
  if (preferred) {
    return preferred;
  }

  const rolePrefix = options.role === "student" ? "student" : "teacher";
  const baseSlug = slugifyIdentifier(options.fullName).slice(0, 24) || `${rolePrefix}-${randomFragment(4)}`;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = `${rolePrefix}.${baseSlug}.${randomFragment(4)}@schoolapp.local`;
    const managedProfilesProbe = await actorSupabase
      .from("managed_user_profiles")
      .select("auth_user_id")
      .eq("school_id", options.schoolId)
      .eq("email", candidate)
      .limit(1)
      .maybeSingle();

    if (managedProfilesProbe.error && !isMissingTableError(managedProfilesProbe.error, "managed_user_profiles")) {
      throw managedProfilesProbe.error;
    }

    const profileMatch =
      managedProfilesProbe.error && isMissingTableError(managedProfilesProbe.error, "managed_user_profiles")
        ? await actorSupabase
            .from("user_profiles")
            .select("id")
            .eq("school_id", options.schoolId)
            .eq("email", candidate)
            .limit(1)
            .maybeSingle()
        : { data: managedProfilesProbe.data ? { id: managedProfilesProbe.data.auth_user_id } : null, error: null };

    if (profileMatch.error) {
      throw profileMatch.error;
    }

    if (!profileMatch.data?.id) {
      return candidate;
    }
  }

  return `${rolePrefix}.${Date.now().toString(36)}.${randomFragment(6)}@schoolapp.local`;
}

function toAuthCredentialRow(authUserId: string, user: AuthUser | null | undefined) {
  if (!user) {
    return null;
  }

  const appMetadata = asObject(user.app_metadata);
  const userMetadata = asObject(user.user_metadata);
  const managedCredentials = asObject(appMetadata.managed_credentials ?? userMetadata.managed_credentials);
  const loginIdentifier =
    nullableText(managedCredentials.login_identifier) ??
    nullableText(userMetadata.loginIdentifier) ??
    nullableText(user.email);

  if (!loginIdentifier) {
    return null;
  }

  return {
    auth_user_id: authUserId,
    login_identifier: loginIdentifier,
    temporary_password: nullableText(managedCredentials.temporary_password),
    password_last_reset_at: normalizeNullableTimestamp(managedCredentials.password_last_reset_at),
    card_last_printed_at: normalizeNullableTimestamp(managedCredentials.card_last_printed_at),
  } satisfies CredentialRow;
}

function writeAuthCredentialCache(authUserId: string, row: CredentialRow | null) {
  authCredentialCache.set(authUserId, {
    value: row,
    expiresAt: Date.now() + AUTH_CREDENTIAL_CACHE_TTL_MS,
  });
}

function invalidateAuthCredentialCache(authUserId: string) {
  authCredentialCache.delete(authUserId);
  authCredentialPending.delete(authUserId);
}

async function fetchManagedUserCredentialFromAuthMetadata(authUserId: string) {
  const now = Date.now();
  const cached = authCredentialCache.get(authUserId);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const pending = authCredentialPending.get(authUserId);
  if (pending) {
    return pending;
  }

  const nextLookup = (async () => {
    const serviceSupabase = createServiceSupabaseClient();
    const response = await serviceSupabase.auth.admin.getUserById(authUserId);
    const row =
      response.error || !response.data.user
        ? null
        : toAuthCredentialRow(authUserId, response.data.user);

    writeAuthCredentialCache(authUserId, row);
    return row;
  })();

  authCredentialPending.set(authUserId, nextLookup);

  try {
    return await nextLookup;
  } finally {
    authCredentialPending.delete(authUserId);
  }
}

async function fetchManagedUserCredentialsFromAuthMetadata(authUserIds: string[]) {
  const uniqueIds = Array.from(new Set(authUserIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return new Map<string, CredentialRow>();
  }

  const rows = (await Promise.all(uniqueIds.map((authUserId) => fetchManagedUserCredentialFromAuthMetadata(authUserId))))
    .filter((row): row is CredentialRow => Boolean(row));

  return new Map<string, CredentialRow>(rows.map((row) => [row.auth_user_id, row]));
}

async function patchManagedCredentialMetadata(
  authUserId: string,
  patch: {
    login_identifier?: string;
    temporary_password?: string | null;
    password_last_reset_at?: string | null;
    card_last_printed_at?: string | null;
  },
) {
  const serviceSupabase = createServiceSupabaseClient();
  const { data, error } = await serviceSupabase.auth.admin.getUserById(authUserId);
  if (error || !data.user) {
    throw error ?? new Error("تعذر تحميل حساب المصادقة لتحديث بيانات الدخول.");
  }

  const existingAppMetadata = asObject(data.user.app_metadata);
  const existingManagedCredentials = asObject(existingAppMetadata.managed_credentials);
  const nextManagedCredentials: Record<string, unknown> = {
    ...existingManagedCredentials,
    ...(patch.login_identifier !== undefined ? { login_identifier: patch.login_identifier } : {}),
    ...(patch.temporary_password !== undefined ? { temporary_password: patch.temporary_password } : {}),
    ...(patch.password_last_reset_at !== undefined ? { password_last_reset_at: patch.password_last_reset_at } : {}),
    ...(patch.card_last_printed_at !== undefined ? { card_last_printed_at: patch.card_last_printed_at } : {}),
  };

  if (!nullableText(nextManagedCredentials.login_identifier) && data.user.email) {
    nextManagedCredentials.login_identifier = data.user.email;
  }

  const existingUserMetadata = asObject(data.user.user_metadata);
  const { error: updateError } = await serviceSupabase.auth.admin.updateUserById(authUserId, {
    app_metadata: {
      ...existingAppMetadata,
      managed_credentials: nextManagedCredentials,
    },
    user_metadata: {
      ...existingUserMetadata,
      ...(nullableText(nextManagedCredentials.login_identifier)
        ? { loginIdentifier: nullableText(nextManagedCredentials.login_identifier) }
        : {}),
    },
  });

  if (updateError) {
    throw updateError;
  }

  writeAuthCredentialCache(authUserId, {
    auth_user_id: authUserId,
    login_identifier:
      nullableText(nextManagedCredentials.login_identifier) ??
      nullableText(data.user.email) ??
      "",
    temporary_password: nullableText(nextManagedCredentials.temporary_password),
    password_last_reset_at: normalizeNullableTimestamp(nextManagedCredentials.password_last_reset_at),
    card_last_printed_at: normalizeNullableTimestamp(nextManagedCredentials.card_last_printed_at),
  });
}

export function buildManagedAuthIdentityPayload(options: {
  role: ManagedUserRole;
  schoolId: string;
  fullName: string;
  loginIdentifier: string;
  createdBy?: string | null;
  existingAppMetadata?: Record<string, unknown>;
  existingUserMetadata?: Record<string, unknown>;
  credentialPatch?: {
    temporaryPassword?: string | null;
    passwordLastResetAt?: string | null;
    cardLastPrintedAt?: string | null;
  };
}) {
  const existingAppMetadata = options.existingAppMetadata ?? {};
  const existingUserMetadata = options.existingUserMetadata ?? {};
  const existingManagedCredentials = asObject(
    existingAppMetadata.managed_credentials ?? existingUserMetadata.managed_credentials,
  );
  const nextLoginIdentifier = normalizeText(options.loginIdentifier).toLowerCase();

  return {
    app_metadata: {
      ...existingAppMetadata,
      managed_credentials: {
        ...existingManagedCredentials,
        ...(nextLoginIdentifier ? { login_identifier: nextLoginIdentifier } : {}),
        ...(options.credentialPatch?.temporaryPassword !== undefined
          ? { temporary_password: options.credentialPatch.temporaryPassword }
          : {}),
        ...(options.credentialPatch?.passwordLastResetAt !== undefined
          ? { password_last_reset_at: options.credentialPatch.passwordLastResetAt }
          : {}),
        ...(options.credentialPatch?.cardLastPrintedAt !== undefined
          ? { card_last_printed_at: options.credentialPatch.cardLastPrintedAt }
          : {}),
      },
    },
    user_metadata: {
      ...existingUserMetadata,
      accountType: "managed_user",
      managedRole: options.role,
      schoolId: options.schoolId,
      full_name: options.fullName,
      ...(nextLoginIdentifier ? { loginIdentifier: nextLoginIdentifier } : {}),
      ...(options.createdBy !== undefined ? { createdBy: options.createdBy } : {}),
    },
  };
}

export async function syncManagedAuthIdentityMetadata(options: {
  authUserId: string;
  role: ManagedUserRole;
  schoolId: string;
  fullName: string;
  loginIdentifier: string;
  createdBy?: string | null;
  isActive?: boolean;
}) {
  const serviceSupabase = createServiceSupabaseClient();
  const { data, error } = await serviceSupabase.auth.admin.getUserById(options.authUserId);
  if (error || !data.user) {
    throw error ?? new Error("تعذر تحميل حساب المصادقة لتحديث بيانات الهوية.");
  }

  const existingAppMetadata = asObject(data.user.app_metadata);
  const existingManagedCredentials = asObject(existingAppMetadata.managed_credentials);
  const existingUserMetadata = asObject(data.user.user_metadata);
  const nextLoginIdentifier =
    normalizeText(options.loginIdentifier).toLowerCase() ||
    nullableText(existingManagedCredentials.login_identifier) ||
    nullableText(data.user.email) ||
    "";
  const identityPayload = buildManagedAuthIdentityPayload({
    role: options.role,
    schoolId: options.schoolId,
    fullName: options.fullName,
    loginIdentifier: nextLoginIdentifier,
    createdBy: options.createdBy,
    existingAppMetadata,
    existingUserMetadata,
  });

  const updatePayload: Record<string, unknown> = {
    ...identityPayload,
  };

  if (typeof options.isActive === "boolean") {
    updatePayload.ban_duration = options.isActive ? "none" : MANAGED_USER_INACTIVE_BAN_DURATION;
  }

  const { error: updateError } = await serviceSupabase.auth.admin.updateUserById(options.authUserId, updatePayload);
  if (updateError) {
    throw updateError;
  }

  invalidateAuthCredentialCache(options.authUserId);
}

export async function fetchManagedUserCredentials(
  actorSupabase: RouteSupabaseClient,
  authUserIds: string[],
) {
  const uniqueIds = Array.from(new Set(authUserIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return new Map<string, CredentialRow>();
  }

  const { data, error } = await actorSupabase
    .from("managed_user_credentials")
    .select("auth_user_id, login_identifier, temporary_password, password_last_reset_at, card_last_printed_at")
    .in("auth_user_id", uniqueIds);

  if (error) {
    if (isMissingTableError(error, "managed_user_credentials") || error.message.toLowerCase().includes("could not find")) {
      return fetchManagedUserCredentialsFromAuthMetadata(uniqueIds);
    }
    throw error;
  }

  const credentials = new Map<string, CredentialRow>(
    ((data ?? []) as CredentialRow[]).map((row) => [row.auth_user_id, row]),
  );

  const missingIds = uniqueIds.filter((authUserId) => !credentials.has(authUserId));
  if (missingIds.length > 0) {
    const fallbackCredentials = await fetchManagedUserCredentialsFromAuthMetadata(missingIds);
    fallbackCredentials.forEach((row, authUserId) => {
      if (!credentials.has(authUserId)) {
        credentials.set(authUserId, row);
      }
    });
  }

  return credentials;
}

export async function fetchTeacherAssignments(
  actorSupabase: RouteSupabaseClient,
  teacherIds: string[],
  options?: {
    schoolId?: string | null;
  },
) {
  if (teacherIds.length === 0) {
    return new Map<string, ManagedTeacherAssignmentRecord[]>();
  }

  let assignmentsQuery = actorSupabase
    .from("teacher_assignments")
    .select("id, teacher_id, subject_id, class_id, section_id, is_active")
    .in("teacher_id", teacherIds)
    .order("created_at", { ascending: true });

  if (options?.schoolId) {
    assignmentsQuery = assignmentsQuery.eq("school_id", options.schoolId);
  }

  const { data, error } = await assignmentsQuery;

  if (error) {
    if (isMissingTableError(error, "teacher_assignments") || error.message.toLowerCase().includes("could not find")) {
      let legacyTeachersQuery = actorSupabase
        .from("teachers")
        .select("id, classes_taught")
        .in("id", teacherIds);

      if (options?.schoolId) {
        legacyTeachersQuery = legacyTeachersQuery.eq("school_id", options.schoolId);
      }

      const { data: legacyTeachers, error: legacyTeachersError } = await legacyTeachersQuery;

      if (legacyTeachersError) {
        if (isMissingColumnError(legacyTeachersError, "teachers", "classes_taught")) {
          return new Map<string, ManagedTeacherAssignmentRecord[]>();
        }
        throw legacyTeachersError;
      }

      const legacyAssignmentsByTeacher = new Map<string, ManagedTeacherAssignmentRecord[]>();

      ((legacyTeachers ?? []) as Array<Record<string, unknown>>).forEach((teacher) => {
        const assignments = parseTeacherClassesTaught(teacher.classes_taught).map((assignment, index) => ({
          id: `legacy-${String(teacher.id)}-${index}`,
          subject_id: null,
          subject_name: normalizeText(assignment.subject_name) || "مادة غير معروفة",
          class_id: null,
          class_name: normalizeText(assignment.class_name ?? assignment.grade) || "صف غير معروف",
          section_id: null,
          section_name: nullableText(assignment.section ?? assignment.section_name),
          is_active: true,
        }));

        legacyAssignmentsByTeacher.set(String(teacher.id), assignments);
      });

      return legacyAssignmentsByTeacher;
    }
    throw error;
  }

  const rows = (data ?? []) as TeacherAssignmentRow[];
  const subjectIds = Array.from(new Set(rows.map((row) => row.subject_id).filter((value): value is string => Boolean(value))));
  const classIds = Array.from(new Set(rows.map((row) => row.class_id).filter((value): value is string => Boolean(value))));
  const sectionIds = Array.from(new Set(rows.map((row) => row.section_id).filter((value): value is string => Boolean(value))));

  const [subjectsResult, classesResult, sectionsResult] = await Promise.all([
    subjectIds.length
      ? actorSupabase.from("subjects").select("id, name").in("id", subjectIds)
      : Promise.resolve({ data: [] as TeacherAssignmentLookupRow[], error: null }),
    classIds.length
      ? actorSupabase.from("classes").select("*").in("id", classIds)
      : Promise.resolve({ data: [] as LookupRecord[], error: null }),
    sectionIds.length
      ? actorSupabase.from("sections").select("*").in("id", sectionIds)
      : Promise.resolve({ data: [] as LookupRecord[], error: null }),
  ]);

  if (subjectsResult.error) throw subjectsResult.error;
  if (classesResult.error) throw classesResult.error;
  if (sectionsResult.error) throw sectionsResult.error;

  const subjectsById = new Map<string, TeacherAssignmentLookupRow>(
    ((subjectsResult.data ?? []) as TeacherAssignmentLookupRow[]).map((row) => [row.id, row]),
  );
  const classesById = new Map<string, LookupRecord>(
    ((classesResult.data ?? []) as LookupRecord[]).map((row) => [String(row.id), row]),
  );
  const sectionsById = new Map<string, LookupRecord>(
    ((sectionsResult.data ?? []) as LookupRecord[]).map((row) => [String(row.id), row]),
  );

  const assignmentsByTeacher = new Map<string, ManagedTeacherAssignmentRecord[]>();

  rows.forEach((row) => {
    const current = assignmentsByTeacher.get(row.teacher_id) ?? [];
    const classRow = row.class_id ? classesById.get(row.class_id) ?? null : null;
    const sectionRow = row.section_id ? sectionsById.get(row.section_id) ?? null : null;
    current.push({
      id: row.id,
      subject_id: row.subject_id,
      subject_name: row.subject_id ? subjectsById.get(row.subject_id)?.name ?? "مادة غير معروفة" : "مادة غير معروفة",
      class_id: row.class_id,
      class_name: row.class_id ? getClassLookupName(classRow) || "صف غير معروف" : "صف غير معروف",
      section_id: row.section_id,
      section_name: row.section_id ? getSectionLookupName(sectionRow) : getSectionLookupName(classRow),
      is_active: row.is_active ?? true,
    });
    assignmentsByTeacher.set(row.teacher_id, current);
  });

  return assignmentsByTeacher;
}

export async function decorateManagedUsers(
  actorSupabase: RouteSupabaseClient,
  users: ManagedUserRecord[],
) {
  const scopedSchoolId =
    users.length > 0 && users.every((user) => user.school_id === users[0]?.school_id) ? users[0]?.school_id ?? null : null;

  const [credentialsByAuthId, assignmentsByTeacherId] = await Promise.all([
    fetchManagedUserCredentials(
      actorSupabase,
      users.map((user) => user.auth_user_id),
    ),
    fetchTeacherAssignments(
      actorSupabase,
      users
        .map((user) => user.teacher?.id)
        .filter((value): value is string => Boolean(value)),
      { schoolId: scopedSchoolId },
    ),
  ]);

  return users.map((user) => {
    const decoratedTeacher = user.teacher
      ? {
          ...user.teacher,
          assignments: assignmentsByTeacherId.get(user.teacher.id) ?? [],
        }
      : null;

    return {
      ...user,
      teacher: decoratedTeacher,
      app_account: credentialsByAuthId.has(user.auth_user_id)
        ? toCredentialSummary(credentialsByAuthId.get(user.auth_user_id) as CredentialRow)
        : null,
    };
  });
}

function buildLegacyManagedUserRecord(input: {
  profile: Record<string, unknown>;
  student: Record<string, unknown> | null;
  teacher: Record<string, unknown> | null;
}): ManagedUserRecord | null {
  const role =
    input.profile.role === "teacher" ? "teacher" : input.profile.role === "student" ? "student" : null;
  if (!role) {
    return null;
  }

  const teacherStatus = typeof input.teacher?.status === "string" ? input.teacher.status.toLowerCase() : "";

  return {
    auth_user_id: String(input.profile.id),
    school_id: String(input.profile.school_id),
    role,
    full_name: typeof input.profile.full_name === "string" ? input.profile.full_name : "",
    email: typeof input.profile.email === "string" ? input.profile.email : "",
    phone: typeof input.profile.phone === "string" ? input.profile.phone : null,
    is_active: typeof input.profile.is_active === "boolean" ? input.profile.is_active : true,
    created_at: typeof input.profile.created_at === "string" ? input.profile.created_at : null,
    updated_at: null,
    student:
      role === "student" && input.student
        ? {
            id: String(input.student.id),
            full_name: typeof input.student.full_name === "string" ? input.student.full_name : null,
            class_name: typeof input.student.class_name === "string" ? input.student.class_name : null,
            section: typeof input.student.section === "string" ? input.student.section : null,
            address: typeof input.student.address === "string" ? input.student.address : null,
            total_fee: typeof input.student.total_fee === "number" ? input.student.total_fee : Number(input.student.total_fee ?? 0),
            paid_fee: typeof input.student.paid_fee === "number" ? input.student.paid_fee : Number(input.student.paid_fee ?? 0),
            discount_value:
              typeof input.student.discount_value === "number"
                ? input.student.discount_value
                : Number(input.student.discount_value ?? 0),
            status: typeof input.student.status === "string" ? input.student.status : null,
          }
        : null,
    teacher:
      role === "teacher" && input.teacher
        ? {
            id: String(input.teacher.id),
            full_name: typeof input.teacher.full_name === "string" ? input.teacher.full_name : null,
            email: typeof input.teacher.email === "string" ? input.teacher.email : null,
            phone: typeof input.teacher.phone === "string" ? input.teacher.phone : null,
            specialization:
              typeof input.teacher.specialization === "string"
                ? input.teacher.specialization
                : typeof input.teacher.subject === "string"
                  ? input.teacher.subject
                  : null,
            notes: typeof input.teacher.notes === "string" ? input.teacher.notes : null,
            is_active:
              typeof input.teacher.is_active === "boolean"
                ? input.teacher.is_active
                : teacherStatus !== "inactive" && teacherStatus !== "deleted",
            assignments: [],
          }
        : null,
    app_account: null,
  };
}

async function fetchLegacyLinkedRecords(
  actorSupabase: RouteSupabaseClient,
  authUserIds: string[],
  schoolId?: string | null,
) {
  const [studentsLinkAvailable, teachersLinkAvailable] = await Promise.all([
    tableHasColumn(actorSupabase, "students", "auth_user_id"),
    tableHasColumn(actorSupabase, "teachers", "auth_user_id"),
  ]);
  const teacherTableCapabilities = teachersLinkAvailable
    ? await getTeacherTableCapabilities(actorSupabase)
    : null;
  const teacherSelectColumns = [
    "id",
    "auth_user_id",
    "full_name",
    "email",
    "phone",
    ...(teacherTableCapabilities?.specialization ? ["specialization"] : []),
    ...(teacherTableCapabilities?.subject ? ["subject"] : []),
    ...(teacherTableCapabilities?.notes ? ["notes"] : []),
    ...(teacherTableCapabilities?.is_active ? ["is_active"] : []),
    ...(teacherTableCapabilities?.status ? ["status"] : []),
  ].join(", ");

  const studentsQuery = studentsLinkAvailable
    ? (() => {
        let query = actorSupabase
          .from("students")
          .select("id, auth_user_id, full_name, class_name, section, address, total_fee, paid_fee, discount_value, status")
          .in("auth_user_id", authUserIds);

        if (schoolId) {
          query = query.eq("school_id", schoolId);
        }

        return query;
      })()
    : Promise.resolve({ data: [] as Record<string, unknown>[], error: null });

  const teachersQuery = teachersLinkAvailable
    ? (() => {
        let query = actorSupabase
          .from("teachers")
          .select(teacherSelectColumns)
          .in("auth_user_id", authUserIds);

        if (schoolId) {
          query = query.eq("school_id", schoolId);
        }

        return query;
      })()
    : Promise.resolve({ data: [] as Record<string, unknown>[], error: null });

  const [studentsResult, teachersResult] = await Promise.all([studentsQuery, teachersQuery]);

  if (studentsResult.error) {
    throw studentsResult.error;
  }

  if (teachersResult.error) {
    throw teachersResult.error;
  }

  return {
    studentsByAuthId: new Map<string, Record<string, unknown>>(
      ((studentsResult.data ?? []) as Array<Record<string, unknown>>)
        .filter((student) => typeof student.auth_user_id === "string")
        .map((student) => [String(student.auth_user_id), student]),
    ),
    teachersByAuthId: new Map<string, Record<string, unknown>>(
      ((teachersResult.data ?? []) as Array<Record<string, unknown>>)
        .filter((teacher) => typeof teacher.auth_user_id === "string")
        .map((teacher) => [String(teacher.auth_user_id), teacher]),
    ),
  };
}

export async function fetchManagedUserByAuthUserId(
  actorSupabase: RouteSupabaseClient,
  options: { authUserId: string; schoolId: string },
) {
  const managedResult = await actorSupabase
    .from("managed_user_profiles")
    .select(MANAGED_USER_SELECT)
    .eq("auth_user_id", options.authUserId)
    .eq("school_id", options.schoolId)
    .maybeSingle();

  if (!managedResult.error && managedResult.data) {
    const [managedUser] = await decorateManagedUsers(actorSupabase, [
      normalizeManagedUserRecord(managedResult.data as Record<string, unknown>),
    ]);
    return managedUser ?? null;
  }

  if (managedResult.error && !isMissingTableError(managedResult.error, "managed_user_profiles") && !isInfrastructureCompatError(managedResult.error)) {
    throw managedResult.error;
  }

  const { data: legacyProfile, error: legacyProfileError } = await actorSupabase
    .from("user_profiles")
    .select("id, school_id, role, full_name, email, phone, is_active, created_at")
    .eq("id", options.authUserId)
    .eq("school_id", options.schoolId)
    .maybeSingle();

  if (legacyProfileError) {
    throw legacyProfileError;
  }

  if (!legacyProfile) {
    return null;
  }

  const { studentsByAuthId, teachersByAuthId } = await fetchLegacyLinkedRecords(actorSupabase, [options.authUserId], options.schoolId);
  const legacyUser = buildLegacyManagedUserRecord({
    profile: legacyProfile as Record<string, unknown>,
    student: studentsByAuthId.get(options.authUserId) ?? null,
    teacher: teachersByAuthId.get(options.authUserId) ?? null,
  });

  if (!legacyUser) {
    return null;
  }

  const [decoratedLegacyUser] = await decorateManagedUsers(actorSupabase, [legacyUser]);
  return decoratedLegacyUser ?? null;
}

export async function resolveManagedAccountBase(authUserId: string): Promise<ManagedAccountBaseSnapshot> {
  const serviceSupabase = createServiceSupabaseClient();
  const { data, error } = await serviceSupabase.auth.admin.getUserById(authUserId);

  if (error || !data.user) {
    throw error ?? new Error("تعذر تحميل مستخدم المصادقة الحالي.");
  }

  const authUser = data.user;
  const authMetadata = asObject(authUser.user_metadata);

  let managedProfileExists = false;
  let schoolId: string | null = null;
  let role: ManagedUserRole | null = null;

  const managedProfileResult = await serviceSupabase
    .from("managed_user_profiles")
    .select("school_id, role")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (!managedProfileResult.error && managedProfileResult.data) {
    managedProfileExists = true;
    schoolId = nullableText(managedProfileResult.data.school_id);
    role = managedProfileResult.data.role === "student" || managedProfileResult.data.role === "teacher"
      ? managedProfileResult.data.role
      : null;
  } else if (
    managedProfileResult.error &&
    !isMissingTableError(managedProfileResult.error, "managed_user_profiles")
  ) {
    throw managedProfileResult.error;
  }

  if (!schoolId || !role) {
    const { data: legacyProfile, error: legacyProfileError } = await serviceSupabase
      .from("user_profiles")
      .select("school_id, role")
      .eq("id", authUserId)
      .maybeSingle();

    if (legacyProfileError && !legacyProfileError.message.toLowerCase().includes("could not find")) {
      throw legacyProfileError;
    }

    schoolId ||= nullableText(legacyProfile?.school_id) ?? nullableText(authMetadata.schoolId ?? authMetadata.school_id);
    role ||= legacyProfile?.role === "student" || legacyProfile?.role === "teacher"
      ? legacyProfile.role
      : authMetadata.managedRole === "student" || authMetadata.managedRole === "teacher"
        ? authMetadata.managedRole
        : authMetadata.role === "student" || authMetadata.role === "teacher"
          ? authMetadata.role
          : null;
  }

  const user = schoolId ? await fetchManagedUserByAuthUserId(serviceSupabase, { authUserId, schoolId }) : null;
  const resolvedRole = user?.role ?? role;
  const loginIdentifier = getManagedAccountLoginIdentifier(authUser, user);
  const linkedRecordId =
    resolvedRole === "student"
      ? user?.student?.id ?? null
      : resolvedRole === "teacher"
        ? user?.teacher?.id ?? null
        : null;
  const authUserIsActive = getManagedAuthUserIsActive(authUser);

  return {
    authUser,
    user,
    managedProfileExists,
    authUserIsActive,
    schoolId,
    role: resolvedRole,
    loginIdentifier,
    identity: {
      auth_user_id: authUserId,
      role: resolvedRole,
      school_id: schoolId,
      login_identifier: loginIdentifier,
      is_active: authUserIsActive && (user?.is_active ?? true),
    },
    linkage: {
      managed_profile_exists: managedProfileExists,
      linked_record_type: resolvedRole,
      linked_record_id: linkedRecordId,
      linked_record_status: linkedRecordId ? "ok" : "missing",
    },
  };
}

export async function findManagedProfileByLinkedRecord(
  actorSupabase: RouteSupabaseClient,
  options: {
    schoolId: string;
    role: "student" | "teacher";
    relatedRecordId: string;
  },
) {
  const relationColumn = options.role === "student" ? "student_id" : "teacher_id";
  const { data, error } = await actorSupabase
    .from("managed_user_profiles")
    .select("auth_user_id, email")
    .eq("school_id", options.schoolId)
    .eq(relationColumn, options.relatedRecordId)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error, "managed_user_profiles")) {
      const relatedTable = options.role === "student" ? "students" : "teachers";
      const hasAuthLink = await tableHasColumn(actorSupabase, relatedTable, "auth_user_id");
      if (!hasAuthLink) {
        return null;
      }

      const { data: linkedRow, error: linkedRowError } = await actorSupabase
        .from(relatedTable)
        .select("auth_user_id")
        .eq("id", options.relatedRecordId)
        .eq("school_id", options.schoolId)
        .maybeSingle();

      if (linkedRowError) {
        throw linkedRowError;
      }

      if (typeof linkedRow?.auth_user_id !== "string") {
        return null;
      }

      const { data: legacyProfile, error: legacyProfileError } = await actorSupabase
        .from("user_profiles")
        .select("email")
        .eq("id", linkedRow.auth_user_id)
        .eq("school_id", options.schoolId)
        .maybeSingle();

      if (legacyProfileError && !legacyProfileError.message.toLowerCase().includes("could not find")) {
        throw legacyProfileError;
      }

      return {
        authUserId: linkedRow.auth_user_id,
        email: typeof legacyProfile?.email === "string" ? legacyProfile.email : null,
      };
    }

    throw error;
  }

  if (!data || typeof data.auth_user_id !== "string") {
    return null;
  }

  return {
    authUserId: data.auth_user_id,
    email: typeof data.email === "string" ? data.email : null,
  };
}

export async function persistManagedUserProfile(
  actorSupabase: RouteSupabaseClient,
  options: {
    mode: "insert" | "update";
    authUserId: string;
    schoolId: string;
    role: "student" | "teacher";
    fullName: string;
    email: string;
    phone: string | null;
    isActive: boolean;
    studentId?: string | null;
    teacherId?: string | null;
    createdBy?: string | null;
  },
) {
  const managedPayload = {
    auth_user_id: options.authUserId,
    school_id: options.schoolId,
    role: options.role,
    full_name: options.fullName,
    email: options.email,
    phone: options.phone,
    is_active: options.isActive,
    student_id: options.studentId ?? null,
    teacher_id: options.teacherId ?? null,
    created_by: options.createdBy ?? null,
  };

  const managedQuery =
    options.mode === "insert"
      ? actorSupabase.from("managed_user_profiles").insert(managedPayload)
      : actorSupabase.from("managed_user_profiles").update({
          full_name: options.fullName,
          email: options.email,
          phone: options.phone,
          is_active: options.isActive,
          student_id: options.studentId ?? null,
          teacher_id: options.teacherId ?? null,
        }).eq("auth_user_id", options.authUserId).eq("school_id", options.schoolId);

  const { error } = await managedQuery;
  if (!error) {
    return;
  }

  if (!isMissingTableError(error, "managed_user_profiles")) {
    throw error;
  }

  const serviceSupabase = createServiceSupabaseClient();
  const legacyPayload = {
    id: options.authUserId,
    school_id: options.schoolId,
    role: options.role,
    full_name: options.fullName,
    email: options.email,
    phone: options.phone,
    is_active: options.isActive,
  };

  const legacyResult =
    options.mode === "insert"
      ? await serviceSupabase.from("user_profiles").upsert(legacyPayload, { onConflict: "id" })
      : await serviceSupabase.from("user_profiles").update(legacyPayload).eq("id", options.authUserId);

  if (legacyResult.error) {
    throw legacyResult.error;
  }
}

export async function ensureManagedUserProfileLink(
  actorSupabase: RouteSupabaseClient,
  options: {
    authUserId: string;
    schoolId: string;
    role: "student" | "teacher";
    fullName: string;
    email: string;
    phone: string | null;
    isActive: boolean;
    studentId?: string | null;
    teacherId?: string | null;
    createdBy?: string | null;
  },
) {
  try {
    await persistManagedUserProfile(actorSupabase, {
      mode: "insert",
      authUserId: options.authUserId,
      schoolId: options.schoolId,
      role: options.role,
      fullName: options.fullName,
      email: options.email,
      phone: options.phone,
      isActive: options.isActive,
      studentId: options.studentId,
      teacherId: options.teacherId,
      createdBy: options.createdBy,
    });
    return;
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: string | null }).code ?? "")
        : "";

    if (code !== "23505") {
      throw error;
    }
  }

  await persistManagedUserProfile(actorSupabase, {
    mode: "update",
    authUserId: options.authUserId,
    schoolId: options.schoolId,
    role: options.role,
    fullName: options.fullName,
    email: options.email,
    phone: options.phone,
    isActive: options.isActive,
    studentId: options.studentId,
    teacherId: options.teacherId,
    createdBy: options.createdBy,
  });
}

export async function syncManagedUserAccountState(
  actorSupabase: RouteSupabaseClient,
  options: {
    authUserId: string;
    schoolId: string;
    role: ManagedUserRole;
    fullName: string;
    email: string;
    phone: string | null;
    isActive: boolean;
    studentId?: string | null;
    teacherId?: string | null;
    createdBy?: string | null;
    temporaryPassword?: string | null;
    touchPrintTimestamp?: boolean;
  },
) {
  await ensureManagedUserProfileLink(actorSupabase, {
    authUserId: options.authUserId,
    schoolId: options.schoolId,
    role: options.role,
    fullName: options.fullName,
    email: options.email,
    phone: options.phone,
    isActive: options.isActive,
    studentId: options.studentId,
    teacherId: options.teacherId,
    createdBy: options.createdBy,
  });

  if (typeof options.temporaryPassword === "string" && options.temporaryPassword.trim()) {
    await upsertManagedUserCredential(actorSupabase, {
      authUserId: options.authUserId,
      schoolId: options.schoolId,
      loginIdentifier: options.email,
      temporaryPassword: options.temporaryPassword,
      touchPrintTimestamp: options.touchPrintTimestamp,
    });
  }

  await syncManagedAuthIdentityMetadata({
    authUserId: options.authUserId,
    role: options.role,
    schoolId: options.schoolId,
    fullName: options.fullName,
    loginIdentifier: options.email,
    createdBy: options.createdBy,
    isActive: options.isActive,
  });
}

export async function updateManagedUserLoginIdentifier(
  actorSupabase: RouteSupabaseClient,
  options: {
    authUserId: string;
    schoolId: string;
    loginIdentifier: string;
  },
) {
  const { error } = await actorSupabase
    .from("managed_user_credentials")
    .update({ login_identifier: options.loginIdentifier })
    .eq("auth_user_id", options.authUserId)
    .eq("school_id", options.schoolId);

  if (error && !isMissingTableError(error, "managed_user_credentials") && !error.message.toLowerCase().includes("could not find")) {
    throw error;
  }

  await patchManagedCredentialMetadata(options.authUserId, {
    login_identifier: options.loginIdentifier,
  });
}

export async function resolveSubjectId(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  subjectName: string,
) {
  const trimmed = subjectName.trim();
  const { data: existingRows, error: existingError } = await actorSupabase
    .from("subjects")
    .select("id, name")
    .eq("school_id", schoolId);

  if (existingError) {
    throw existingError;
  }

  const existingMatch = ((existingRows ?? []) as TeacherAssignmentLookupRow[]).find((row) =>
    matchesLookupText(row.name, trimmed),
  );

  if (existingMatch?.id) {
    return existingMatch.id;
  }

  const { data: inserted, error: insertError } = await actorSupabase
    .from("subjects")
    .insert({
      school_id: schoolId,
      name: trimmed,
    })
    .select("id, name")
    .maybeSingle();

  if (!insertError && inserted?.id) {
    return inserted.id;
  }

  const { data: retryRows, error: retryError } = await actorSupabase
    .from("subjects")
    .select("id, name")
    .eq("school_id", schoolId);

  if (retryError) {
    throw retryError;
  }

  const retryMatch = ((retryRows ?? []) as TeacherAssignmentLookupRow[]).find((row) =>
    matchesLookupText(row.name, trimmed),
  );

  if (!retryMatch?.id) {
    throw insertError ?? new Error(`تعذر حفظ المادة "${trimmed}".`);
  }

  return retryMatch.id;
}

export async function resolveClassAndSectionIds(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  assignment: ManagedTeacherAssignmentInput,
) {
  const { data: classRows, error: classError } = await actorSupabase
    .from("classes")
    .select("*")
    .eq("school_id", schoolId);

  if (classError) throw classError;
  const matchingClassRows = ((classRows ?? []) as LookupRecord[]).filter((row) =>
    matchesLookupText(getClassLookupName(row), assignment.class_name),
  );

  if (matchingClassRows.length === 0) {
    throw new Error(`الصف "${assignment.class_name}" غير موجود ضمن إعدادات المدرسة الحالية.`);
  }

  const legacySectionMatch = assignment.section
    ? matchingClassRows.find((row) => matchesLookupText(getSectionLookupName(row), assignment.section))
    : null;

  if (legacySectionMatch?.id) {
    return {
      classId: String(legacySectionMatch.id),
      sectionId: null,
    };
  }

  const preferredClassRow =
    matchingClassRows.find((row) => !getSectionLookupName(row)) ?? matchingClassRows[0];

  if (!assignment.section) {
    return {
      classId: String(preferredClassRow.id),
      sectionId: null,
    };
  }

  const { data: sectionRows, error: sectionError } = await actorSupabase
    .from("sections")
    .select("*")
    .eq("school_id", schoolId)
    .eq("class_id", preferredClassRow.id);

  if (sectionError) throw sectionError;
  const sectionRow = ((sectionRows ?? []) as LookupRecord[]).find((row) =>
    matchesLookupText(getSectionLookupName(row), assignment.section),
  );

  if (!sectionRow?.id) {
    throw new Error(`الشعبة "${assignment.section}" غير موجودة ضمن الصف "${assignment.class_name}".`);
  }

  return {
    classId: String(preferredClassRow.id),
    sectionId: String(sectionRow.id),
  };
}

export function buildTeacherClassesTaught(assignments: ManagedTeacherAssignmentInput[]) {
  return assignments.map((assignment) => ({
    subject_name: assignment.subject_name,
    class_name: assignment.class_name,
    section: assignment.section,
    grade: assignment.class_name,
  }));
}

function normalizeMatchKey(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function teacherAssignmentMatchesStudent(
  assignment: Record<string, unknown>,
  className: string,
  section: string | null,
) {
  const assignmentClassName = normalizeMatchKey(assignment.class_name ?? assignment.grade);
  if (!assignmentClassName || assignmentClassName !== normalizeMatchKey(className)) {
    return false;
  }

  const assignmentSectionRaw = normalizeMatchKey(assignment.section ?? assignment.section_name);
  if (!assignmentSectionRaw) {
    return true;
  }

  return assignmentSectionRaw === normalizeMatchKey(section);
}

function parseTeacherClassesTaught(rawValue: unknown) {
  if (Array.isArray(rawValue)) {
    return rawValue.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  }

  if (typeof rawValue === "string" && rawValue.trim()) {
    try {
      const parsed = JSON.parse(rawValue);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

export async function syncStudentTeacherLinks(
  actorSupabase: RouteSupabaseClient,
  options: {
    schoolId: string;
    studentId: string;
    className: string;
    section: string | null;
  },
) {
  const matchedTeacherIds = await findMatchingTeacherIdsForStudent(actorSupabase, {
    schoolId: options.schoolId,
    className: options.className,
    section: options.section,
  });

  const { error: clearLinksError } = await actorSupabase
    .from("student_teacher_links")
    .delete()
    .eq("school_id", options.schoolId)
    .eq("student_id", options.studentId);

  if (clearLinksError) {
    if (isMissingTableError(clearLinksError, "student_teacher_links")) {
      return {
        teacherIds: matchedTeacherIds,
        persisted: false,
      };
    }
    throw clearLinksError;
  }

  if (matchedTeacherIds.length > 0) {
    const rows = matchedTeacherIds.map((teacherId) => ({
      school_id: options.schoolId,
      student_id: options.studentId,
      teacher_id: teacherId,
      linked_by: "auto",
    }));

    const { error: insertLinksError } = await actorSupabase.from("student_teacher_links").insert(rows);
    if (insertLinksError) {
      throw insertLinksError;
    }
  }

  return {
    teacherIds: matchedTeacherIds,
    persisted: true,
  };
}

export async function findMatchingTeacherIdsForStudent(
  actorSupabase: RouteSupabaseClient,
  options: {
    schoolId: string;
    className: string;
    section: string | null;
  },
) {
  const teacherTableCapabilities = await getTeacherTableCapabilities(actorSupabase);
  const teacherStatusSelect = [
    "id",
    ...(teacherTableCapabilities.is_active ? ["is_active"] : []),
    ...(teacherTableCapabilities.status ? ["status"] : []),
    ...(teacherTableCapabilities.classes_taught ? ["classes_taught"] : []),
  ].join(", ");

  try {
    const { data: classRows, error: classError } = await actorSupabase
      .from("classes")
      .select("*")
      .eq("school_id", options.schoolId);

    if (classError && !isMissingTableError(classError, "classes")) {
      throw classError;
    }

    const matchingClassIds = ((classRows ?? []) as LookupRecord[])
      .filter((row) => matchesLookupText(getClassLookupName(row), options.className))
      .map((row) => String(row.id));

    if (matchingClassIds.length > 0) {
      let matchingSectionIds: string[] = [];

      if (options.section) {
        const { data: sectionRows, error: sectionError } = await actorSupabase
          .from("sections")
          .select("*")
          .eq("school_id", options.schoolId)
          .in("class_id", matchingClassIds);

        if (sectionError && !isMissingTableError(sectionError, "sections")) {
          throw sectionError;
        }

        matchingSectionIds = ((sectionRows ?? []) as LookupRecord[])
          .filter((row) => matchesLookupText(getSectionLookupName(row), options.section))
          .map((row) => String(row.id));
      }

      const { data: assignmentRows, error: assignmentError } = await actorSupabase
        .from("teacher_assignments")
        .select("teacher_id, class_id, section_id")
        .eq("school_id", options.schoolId)
        .in("class_id", matchingClassIds);

      if (assignmentError) {
        if (!isMissingTableError(assignmentError, "teacher_assignments")) {
          throw assignmentError;
        }
      } else {
        const matchedTeacherIds = Array.from(
          new Set(
            ((assignmentRows ?? []) as Array<Record<string, unknown>>)
              .filter((row) => {
                if (!options.section) {
                  return true;
                }

                const sectionId = nullableText(row.section_id);
                return !sectionId || matchingSectionIds.includes(sectionId);
              })
              .map((row) => nullableText(row.teacher_id))
              .filter((teacherId): teacherId is string => Boolean(teacherId)),
          ),
        );

        if (matchedTeacherIds.length === 0) {
          return [];
        }

        const { data: teachers, error: teachersError } = await actorSupabase
          .from("teachers")
          .select(teacherStatusSelect)
          .eq("school_id", options.schoolId)
          .in("id", matchedTeacherIds);

        if (teachersError) {
          throw teachersError;
        }

        return ((teachers ?? []) as unknown as Array<Record<string, unknown>>)
          .filter((teacher) => {
            const isActive = typeof teacher.is_active === "boolean" ? teacher.is_active : true;
            const status = normalizeMatchKey(teacher.status);
            return isActive && status !== "inactive" && status !== "deleted";
          })
          .map((teacher) => String(teacher.id));
      }
    }
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof error.message === "string" &&
      error.message.toLowerCase().includes("could not find")
    ) {
      // Fall through to the legacy classes_taught path when the newer schema is unavailable.
    } else if (error) {
      throw error;
    }
  }

  const { data: teachers, error: teachersError } = await actorSupabase
    .from("teachers")
    .select(teacherStatusSelect)
    .eq("school_id", options.schoolId);

  if (teachersError) {
    throw teachersError;
  }

  const matchedTeacherIds = ((teachers ?? []) as unknown as Array<Record<string, unknown>>)
    .filter((teacher) => {
      const isActive = typeof teacher.is_active === "boolean" ? teacher.is_active : true;
      const status = normalizeMatchKey(teacher.status);
      return isActive && status !== "inactive" && status !== "deleted";
    })
    .filter((teacher) => {
      const assignments = parseTeacherClassesTaught(teacher.classes_taught);
      return assignments.some((assignment) =>
        teacherAssignmentMatchesStudent(assignment, options.className, options.section),
      );
    })
    .map((teacher) => String(teacher.id));
  return matchedTeacherIds;
}

export async function replaceTeacherAssignments(
  actorSupabase: RouteSupabaseClient,
  options: {
    schoolId: string;
    teacherId: string;
    assignments: ManagedTeacherAssignmentInput[];
  },
) {
  const deleteAssignmentsResult = await actorSupabase
    .from("teacher_assignments")
    .delete()
    .eq("teacher_id", options.teacherId)
    .eq("school_id", options.schoolId);
  const hasTeacherAssignmentsTable = !isMissingTableError(deleteAssignmentsResult.error, "teacher_assignments");

  if (deleteAssignmentsResult.error && hasTeacherAssignmentsTable) {
    throw deleteAssignmentsResult.error;
  }

  if (options.assignments.length === 0) {
    const { error: clearClassesTaughtError } = await actorSupabase
      .from("teachers")
      .update({ classes_taught: [] })
      .eq("id", options.teacherId)
      .eq("school_id", options.schoolId);

    if (clearClassesTaughtError && !isMissingColumnError(clearClassesTaughtError, "teachers", "classes_taught")) {
      throw clearClassesTaughtError;
    }
    return;
  }

  if (!hasTeacherAssignmentsTable) {
    const { error: legacyTeacherError } = await actorSupabase
      .from("teachers")
      .update({
        classes_taught: buildTeacherClassesTaught(options.assignments),
      })
      .eq("id", options.teacherId)
      .eq("school_id", options.schoolId);

    if (legacyTeacherError && !isMissingColumnError(legacyTeacherError, "teachers", "classes_taught")) {
      throw legacyTeacherError;
    }

    return;
  }

  const rows = await Promise.all(
    options.assignments.map(async (assignment) => {
      const subjectId = await resolveSubjectId(actorSupabase, options.schoolId, assignment.subject_name);
      const { classId, sectionId } = await resolveClassAndSectionIds(actorSupabase, options.schoolId, assignment);

      return {
        school_id: options.schoolId,
        teacher_id: options.teacherId,
        subject_id: subjectId,
        class_id: classId,
        section_id: sectionId,
        is_active: true,
      };
    }),
  );

  const { error: insertError } = await actorSupabase.from("teacher_assignments").insert(rows);
  if (insertError) {
    throw insertError;
  }

  const { error: teacherError } = await actorSupabase
    .from("teachers")
    .update({
      classes_taught: buildTeacherClassesTaught(options.assignments),
    })
    .eq("id", options.teacherId)
    .eq("school_id", options.schoolId);

  if (teacherError && !isMissingColumnError(teacherError, "teachers", "classes_taught")) {
    throw teacherError;
  }
}

export async function upsertManagedUserCredential(
  actorSupabase: RouteSupabaseClient,
  options: {
    authUserId: string;
    schoolId: string;
    loginIdentifier: string;
    temporaryPassword: string;
    touchPrintTimestamp?: boolean;
  },
) {
  const now = new Date().toISOString();
  const { error } = await actorSupabase.from("managed_user_credentials").upsert(
    {
      auth_user_id: options.authUserId,
      school_id: options.schoolId,
      login_identifier: options.loginIdentifier,
      temporary_password: options.temporaryPassword,
      password_last_reset_at: now,
      ...(options.touchPrintTimestamp ? { card_last_printed_at: now } : {}),
    },
    { onConflict: "auth_user_id" },
  );

  if (error && !isMissingTableError(error, "managed_user_credentials")) {
    throw error;
  }

  await patchManagedCredentialMetadata(options.authUserId, {
    login_identifier: options.loginIdentifier,
    temporary_password: options.temporaryPassword,
    password_last_reset_at: now,
    ...(options.touchPrintTimestamp ? { card_last_printed_at: now } : {}),
  });
}

export async function markAccountCardPrinted(
  actorSupabase: RouteSupabaseClient,
  options: {
    authUserId: string;
    schoolId: string;
  },
) {
  const now = new Date().toISOString();
  const { error } = await actorSupabase
    .from("managed_user_credentials")
    .update({ card_last_printed_at: now })
    .eq("auth_user_id", options.authUserId)
    .eq("school_id", options.schoolId);

  if (error && !isMissingTableError(error, "managed_user_credentials")) {
    throw error;
  }

  await patchManagedCredentialMetadata(options.authUserId, {
    card_last_printed_at: now,
  });
}

export async function buildManagedUserAccountCard(
  actorSupabase: RouteSupabaseClient,
  user: ManagedUserRecord,
) {
  const [credentialsByAuthId, schoolBrand] = await Promise.all([
    fetchManagedUserCredentials(actorSupabase, [user.auth_user_id]),
    fetchManagedAccountSchoolBrand(actorSupabase, user.school_id),
  ]);
  const credential = credentialsByAuthId.get(user.auth_user_id);

  if (!credential?.temporary_password) {
    throw new Error("لا توجد كلمة مرور مؤقتة محفوظة لهذا الحساب. أعد تعيين كلمة المرور المؤقتة أولاً.");
  }

  const primaryTeacherAssignment =
    user.role === "teacher"
      ? user.teacher?.assignments.find((assignment) => assignment.is_active) ?? user.teacher?.assignments[0] ?? null
      : null;

  return {
    auth_user_id: user.auth_user_id,
    role: user.role,
    school_name: schoolBrand.schoolName,
    school_logo_url: schoolBrand.schoolLogoUrl,
    full_name: user.full_name,
    class_name: user.student?.class_name ?? primaryTeacherAssignment?.class_name ?? null,
    section: user.student?.section ?? primaryTeacherAssignment?.section_name ?? null,
    login_identifier: credential.login_identifier,
    temporary_password: credential.temporary_password,
    instructions: [
      "افتح شاشة تسجيل الدخول الخاصة بالحساب.",
      "أدخل معرّف الدخول وكلمة المرور المؤقتة كما هي تماماً.",
      "إذا تعذر الدخول، اطلب من الإدارة إعادة إصدار كلمة مرور مؤقتة جديدة.",
    ],
    generated_at: new Date().toISOString(),
  } satisfies ManagedUserAccountCard;
}
