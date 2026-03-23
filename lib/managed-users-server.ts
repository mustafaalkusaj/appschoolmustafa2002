import type { User as AuthUser } from "@supabase/supabase-js";

import { isMissingColumnError, isMissingTableError } from "@/lib/admin-infrastructure";
import { SCHOOL_BRAND } from "@/lib/branding";
import { createRouteSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase-server";
import type {
  ManagedTeacherAssignmentInput,
  ManagedTeacherAssignmentRecord,
  ManagedTeacherRecord,
  ManagedStudentRecord,
  ManagedUserAccountCard,
  ManagedUserAppAccountSummary,
  ManagedUserRecord,
} from "@/lib/managed-users";
import { normalizeUserRole } from "@/types/roles";

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

export type TeacherTableCapabilities = {
  specialization: boolean;
  subject: boolean;
  notes: boolean;
  is_active: boolean;
  status: boolean;
  classes_taught: boolean;
};

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

export async function tableHasColumn(
  actorSupabase: RouteSupabaseClient,
  table: string,
  column: string,
) {
  const { error } = await actorSupabase.from(table).select(column).limit(1);

  if (!error) {
    return true;
  }

  if (isMissingColumnError(error, table, column)) {
    return false;
  }

  throw error;
}

export async function getTeacherTableCapabilities(
  actorSupabase: RouteSupabaseClient,
): Promise<TeacherTableCapabilities> {
  const [specialization, subject, notes, is_active, status, classes_taught] = await Promise.all([
    tableHasColumn(actorSupabase, "teachers", "specialization"),
    tableHasColumn(actorSupabase, "teachers", "subject"),
    tableHasColumn(actorSupabase, "teachers", "notes"),
    tableHasColumn(actorSupabase, "teachers", "is_active"),
    tableHasColumn(actorSupabase, "teachers", "status"),
    tableHasColumn(actorSupabase, "teachers", "classes_taught"),
  ]);

  return {
    specialization,
    subject,
    notes,
    is_active,
    status,
    classes_taught,
  };
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
  const { data, error } = await actorSupabase
    .from("schools")
    .select("*")
    .eq("id", schoolId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const schoolRecord = (data ?? null) as Record<string, unknown> | null;
  const schoolName =
    (typeof schoolRecord?.name === "string" && schoolRecord.name.trim()) || SCHOOL_BRAND.nameAr;

  return {
    schoolName,
    schoolLogoUrl: resolveSchoolLogoFromRecord(schoolRecord),
  };
}

export async function resolveManagedUsersActorContext(
  requestedSchoolId?: string | null,
): Promise<
  | { ok: true; value: ManagedUsersActorContext }
  | { ok: false; status: number; message: string }
> {
  const actorSupabase = await createRouteSupabaseClient();
  const {
    data: { user },
    error: actorUserError,
  } = await actorSupabase.auth.getUser();

  if (actorUserError || !user?.id) {
    return { ok: false, status: 401, message: "يجب تسجيل الدخول أولاً." };
  }

  const { data: actorProfile, error: actorProfileError } = await actorSupabase
    .from("user_profiles")
    .select("role, school_id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (actorProfileError || !actorProfile || actorProfile.is_active === false) {
    return { ok: false, status: 403, message: "ليس لديك صلاحية لإدارة الحسابات." };
  }

  const actorRole = normalizeUserRole(actorProfile.role);
  if (actorRole !== "super_admin" && actorRole !== "admin") {
    return { ok: false, status: 403, message: "إدارة الحسابات متاحة للمدير فقط." };
  }

  const requested = requestedSchoolId?.trim() || null;
  let targetSchoolId = requested;

  if (actorRole === "admin") {
    if (!actorProfile.school_id) {
      return { ok: false, status: 403, message: "حساب الإدارة الحالي غير مرتبط بمدرسة." };
    }

    if (requested && requested !== actorProfile.school_id) {
      return { ok: false, status: 403, message: "لا يمكنك إدارة حسابات مدرسة أخرى." };
    }

    targetSchoolId = actorProfile.school_id;
  }

  if (!targetSchoolId) {
    return { ok: false, status: 400, message: "يجب تحديد مدرسة قبل إدارة الحسابات." };
  }

  const { data: school, error: schoolError } = await actorSupabase
    .from("schools")
    .select("id")
    .eq("id", targetSchoolId)
    .maybeSingle();

  if (schoolError || !school) {
    return { ok: false, status: 400, message: "المدرسة المحددة غير متاحة لهذا المستخدم." };
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

export async function resolveSchoolBranchId(actorSupabase: RouteSupabaseClient, schoolId: string) {
  const { data, error } = await actorSupabase
    .from("branches")
    .select("id")
    .eq("school_id", schoolId)
    .limit(1)
    .maybeSingle();

  if (error) {
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

async function fetchManagedUserCredentialsFromAuthMetadata(authUserIds: string[]) {
  const uniqueIds = Array.from(new Set(authUserIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return new Map<string, CredentialRow>();
  }

  const serviceSupabase = createServiceSupabaseClient();
  const responses = await Promise.all(uniqueIds.map((authUserId) => serviceSupabase.auth.admin.getUserById(authUserId)));

  const rows = responses
    .map((response, index) => {
      if (response.error || !response.data.user) {
        return null;
      }

      return toAuthCredentialRow(uniqueIds[index], response.data.user);
    })
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

  const { error: updateError } = await serviceSupabase.auth.admin.updateUserById(authUserId, {
    app_metadata: {
      ...existingAppMetadata,
      managed_credentials: nextManagedCredentials,
    },
  });

  if (updateError) {
    throw updateError;
  }
}

export async function fetchManagedUserCredentials(
  actorSupabase: RouteSupabaseClient,
  authUserIds: string[],
) {
  if (authUserIds.length === 0) {
    return new Map<string, CredentialRow>();
  }

  const { data, error } = await actorSupabase
    .from("managed_user_credentials")
    .select("auth_user_id, login_identifier, temporary_password, password_last_reset_at, card_last_printed_at")
    .in("auth_user_id", authUserIds);

  const fallbackCredentials = await fetchManagedUserCredentialsFromAuthMetadata(authUserIds);
  if (error) {
    if (isMissingTableError(error, "managed_user_credentials") || error.message.toLowerCase().includes("could not find")) {
      return fallbackCredentials;
    }
    throw error;
  }

  const credentials = new Map<string, CredentialRow>(
    ((data ?? []) as CredentialRow[]).map((row) => [row.auth_user_id, row]),
  );

  fallbackCredentials.forEach((row, authUserId) => {
    if (!credentials.has(authUserId)) {
      credentials.set(authUserId, row);
    }
  });

  return credentials;
}

async function fetchTeacherAssignments(
  actorSupabase: RouteSupabaseClient,
  teacherIds: string[],
) {
  if (teacherIds.length === 0) {
    return new Map<string, ManagedTeacherAssignmentRecord[]>();
  }

  const { data, error } = await actorSupabase
    .from("teacher_assignments")
    .select("id, teacher_id, subject_id, class_id, section_id, is_active")
    .in("teacher_id", teacherIds)
    .order("created_at", { ascending: true });

  if (error) {
    if (error.message.toLowerCase().includes("could not find")) {
      return new Map<string, ManagedTeacherAssignmentRecord[]>();
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
) {
  const [studentsLinkAvailable, teachersLinkAvailable] = await Promise.all([
    tableHasColumn(actorSupabase, "students", "auth_user_id"),
    tableHasColumn(actorSupabase, "teachers", "auth_user_id"),
  ]);

  const [studentsResult, teachersResult] = await Promise.all([
    studentsLinkAvailable
      ? actorSupabase.from("students").select("*").in("auth_user_id", authUserIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    teachersLinkAvailable
      ? actorSupabase.from("teachers").select("*").in("auth_user_id", authUserIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
  ]);

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

  if (managedResult.error && !isMissingTableError(managedResult.error, "managed_user_profiles")) {
    throw managedResult.error;
  }

  const { data: legacyProfile, error: legacyProfileError } = await actorSupabase
    .from("user_profiles")
    .select("*")
    .eq("id", options.authUserId)
    .eq("school_id", options.schoolId)
    .maybeSingle();

  if (legacyProfileError) {
    throw legacyProfileError;
  }

  if (!legacyProfile) {
    return null;
  }

  const { studentsByAuthId, teachersByAuthId } = await fetchLegacyLinkedRecords(actorSupabase, [options.authUserId]);
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
        }).eq("auth_user_id", options.authUserId);

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

export async function updateManagedUserLoginIdentifier(
  actorSupabase: RouteSupabaseClient,
  options: {
    authUserId: string;
    loginIdentifier: string;
  },
) {
  const { error } = await actorSupabase
    .from("managed_user_credentials")
    .update({ login_identifier: options.loginIdentifier })
    .eq("auth_user_id", options.authUserId);

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
  const { data, error } = await actorSupabase
    .from("subjects")
    .upsert(
      {
        school_id: schoolId,
        name: trimmed,
      },
      {
        onConflict: "school_id,name",
        ignoreDuplicates: false,
      },
    )
    .select("id, name")
    .single();

  if (error) {
    const { data: existing, error: existingError } = await actorSupabase
      .from("subjects")
      .select("id, name")
      .eq("school_id", schoolId)
      .eq("name", trimmed)
      .maybeSingle();

    if (existingError || !existing?.id) {
      throw existingError ?? error;
    }

    return existing.id;
  }

  return data.id as string;
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
    .eq("teacher_id", options.teacherId);
  const hasTeacherAssignmentsTable = !isMissingTableError(deleteAssignmentsResult.error, "teacher_assignments");

  if (deleteAssignmentsResult.error && hasTeacherAssignmentsTable) {
    throw deleteAssignmentsResult.error;
  }

  if (options.assignments.length === 0) {
    const { error: clearClassesTaughtError } = await actorSupabase
      .from("teachers")
      .update({ classes_taught: [] })
      .eq("id", options.teacherId);

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
      .eq("id", options.teacherId);

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
    .eq("id", options.teacherId);

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
  authUserId: string,
) {
  const now = new Date().toISOString();
  const { error } = await actorSupabase
    .from("managed_user_credentials")
    .update({ card_last_printed_at: now })
    .eq("auth_user_id", authUserId);

  if (error && !isMissingTableError(error, "managed_user_credentials")) {
    throw error;
  }

  await patchManagedCredentialMetadata(authUserId, {
    card_last_printed_at: now,
  });
}

export async function buildManagedUserAccountCard(
  actorSupabase: RouteSupabaseClient,
  user: ManagedUserRecord,
) {
  const credentialsByAuthId = await fetchManagedUserCredentials(actorSupabase, [user.auth_user_id]);
  const credential = credentialsByAuthId.get(user.auth_user_id);

  if (!credential?.temporary_password) {
    throw new Error("لا توجد كلمة مرور مؤقتة محفوظة لهذا الحساب. أعد تعيين كلمة المرور المؤقتة أولاً.");
  }

  const schoolBrand = await fetchManagedAccountSchoolBrand(actorSupabase, user.school_id);

  return {
    auth_user_id: user.auth_user_id,
    role: user.role,
    school_name: schoolBrand.schoolName,
    school_logo_url: schoolBrand.schoolLogoUrl,
    full_name: user.full_name,
    class_name: user.student?.class_name ?? null,
    section: user.student?.section ?? null,
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
