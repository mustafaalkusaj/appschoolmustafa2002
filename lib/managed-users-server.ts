import { isMissingColumnError, isMissingTableError } from "@/lib/admin-infrastructure";
import { SCHOOL_BRAND } from "@/lib/branding";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
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

  if (error) {
    if (error.message.toLowerCase().includes("could not find")) {
      return new Map<string, CredentialRow>();
    }
    throw error;
  }

  return new Map<string, CredentialRow>(
    ((data ?? []) as CredentialRow[]).map((row) => [row.auth_user_id, row]),
  );
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

  if (error) {
    throw error;
  }
}

export async function markAccountCardPrinted(
  actorSupabase: RouteSupabaseClient,
  authUserId: string,
) {
  const { error } = await actorSupabase
    .from("managed_user_credentials")
    .update({ card_last_printed_at: new Date().toISOString() })
    .eq("auth_user_id", authUserId);

  if (error) {
    throw error;
  }
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

  const { data: schoolRow, error: schoolError } = await actorSupabase
    .from("schools")
    .select("name")
    .eq("id", user.school_id)
    .maybeSingle();

  if (schoolError) {
    throw schoolError;
  }

  return {
    auth_user_id: user.auth_user_id,
    role: user.role,
    school_name: (schoolRow?.name as string | null) ?? SCHOOL_BRAND.nameAr,
    school_logo_url: SCHOOL_BRAND.logo,
    full_name: user.full_name,
    class_name: user.student?.class_name ?? null,
    section: user.student?.section ?? null,
    login_identifier: credential.login_identifier,
    temporary_password: credential.temporary_password,
    instructions: [
      "افتح تطبيق المدرسة على الهاتف.",
      "أدخل معرّف الدخول وكلمة المرور المؤقتة كما هي.",
      "إذا تعذر الدخول، اطلب من الإدارة إعادة تعيين كلمة المرور المؤقتة.",
    ],
    generated_at: new Date().toISOString(),
  } satisfies ManagedUserAccountCard;
}
