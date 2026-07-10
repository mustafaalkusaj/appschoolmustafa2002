import { isMissingTableError, isMissingColumnError, isInfrastructureCompatError } from "@/lib/admin-infrastructure";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import type { ManagedTeacherAssignmentRecord, ManagedUserRecord } from "@/lib/managed-users";
import type {
  RouteSupabaseClient,
  ManagedAccountBaseSnapshot,
  TeacherTableCapabilities,
  TeacherAssignmentRow,
  TeacherAssignmentLookupRow,
  LookupRecord,
} from "./types";
import {
  SCHEMA_CAPABILITY_TTL_MS,
  schemaCapabilityCache,
  schemaCapabilityPending,
  getTeacherTableCapabilitiesCache,
  setTeacherTableCapabilitiesCache,
  getTeacherTableCapabilitiesPending,
  setTeacherTableCapabilitiesPending,
} from "./cache";
import { fetchManagedUserCredentials, toCredentialSummary } from "./credentials";
import {
  normalizeManagedUserRecord,
  buildLegacyManagedUserRecord,
  getClassLookupName,
  getSectionLookupName,
  matchesLookupText,
  normalizeMatchKey,
  parseTeacherClassesTaught,
  teacherAssignmentMatchesStudent,
} from "./accounts";

// MANAGED_USER_SELECT constant
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

// Table capabilities
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
    const { error } = await (actorSupabase as unknown as { from: (table: string) => any })
      .from(table)
      .select(column)
      .limit(1);

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
  const cache = getTeacherTableCapabilitiesCache();
  if (cache && cache.expiresAt > now) {
    return cache.value;
  }

  const pending = getTeacherTableCapabilitiesPending();
  if (pending) {
    return pending;
  }

  const newPending = (async () => {
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

    setTeacherTableCapabilitiesCache({
      value,
      expiresAt: Date.now() + SCHEMA_CAPABILITY_TTL_MS,
    });

    return value;
  })();

  setTeacherTableCapabilitiesPending(newPending);

  try {
    return await newPending;
  } finally {
    setTeacherTableCapabilitiesPending(null);
  }
}

// Fetch legacy linked records
async function fetchLegacyLinkedRecords(
  actorSupabase: RouteSupabaseClient,
  authUserIds: string[],
  schoolId?: string | null,
) {
  // Run all schema probes in parallel (getTeacherTableCapabilities has its own cache)
  const [studentsLinkAvailable, teachersLinkAvailable, teacherTableCapabilitiesEager] = await Promise.all([
    tableHasColumn(actorSupabase, "students", "auth_user_id"),
    tableHasColumn(actorSupabase, "teachers", "auth_user_id"),
    getTeacherTableCapabilities(actorSupabase),
  ]);
  const teacherTableCapabilities = teachersLinkAvailable
    ? teacherTableCapabilitiesEager
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

// Fetch managed user by auth user ID
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

// Resolve managed account base
export async function resolveManagedAccountBase(authUserId: string): Promise<ManagedAccountBaseSnapshot> {
  const serviceSupabase = createServiceSupabaseClient();
  const { data, error } = await serviceSupabase.auth.admin.getUserById(authUserId);

  if (error || !data.user) {
    throw error ?? new Error("تعذر تحميل مستخدم المصادقة الحالي.");
  }

  const authUser = data.user;
  const authMetadata = (typeof authUser.user_metadata === "object" && authUser.user_metadata !== null)
    ? authUser.user_metadata as Record<string, unknown>
    : {};

  function asObject(value: unknown): Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  function nullableText(value: unknown) {
    const normalized = typeof value === "string" ? value.trim() : "";
    return normalized.length > 0 ? normalized : null;
  }

  function getManagedAccountLoginIdentifier(user: typeof authUser, managedUser: ManagedUserRecord | null) {
    const userMetadata = asObject(user.user_metadata);
    const appMetadata = asObject(user.app_metadata);
    const managedCredentials = asObject(appMetadata.managed_credentials ?? userMetadata.managed_credentials);

    return (
      managedUser?.app_account?.login_identifier ??
      nullableText(managedCredentials.login_identifier) ??
      nullableText(userMetadata.loginIdentifier) ??
      nullableText(user.email)
    );
  }

  function getManagedAuthUserIsActive(user: typeof authUser) {
    if (typeof user.banned_until === "string" && user.banned_until.trim()) {
      return new Date(user.banned_until).getTime() <= Date.now();
    }
    return true;
  }

  let managedProfileExists = false;
  let schoolId: string | null = null;
  let role: "student" | "teacher" | null = null;

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

// Find managed profile by linked record
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

// Fetch teacher assignments
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
          subject_name: (typeof assignment.subject_name === "string" ? assignment.subject_name.trim() : "") || "مادة غير معروفة",
          class_id: null,
          class_name: (typeof assignment.class_name === "string" ? assignment.class_name.trim() : "") ||
                     (typeof assignment.grade === "string" ? assignment.grade.trim() : "") || "صف غير معروف",
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

// Decorate managed users with credentials and assignments
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
        ? toCredentialSummary(credentialsByAuthId.get(user.auth_user_id)!)
        : null,
    };
  });
}

// Resolve school branch ID
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

// Resolve subject ID
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

// Resolve class and section IDs
export async function resolveClassAndSectionIds(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  assignment: { class_name: string; section?: string | null },
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
    .eq("class_id", String(preferredClassRow.id));

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

// Replace teacher assignments
export async function replaceTeacherAssignments(
  actorSupabase: RouteSupabaseClient,
  options: {
    schoolId: string;
    teacherId: string;
    assignments: { subject_name: string; class_name: string; section?: string | null }[];
  },
) {
  const { buildTeacherClassesTaught } = await import("./accounts");
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

// Find matching teacher IDs for student
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

// Sync student teacher links
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

// Helper function
function nullableText(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 ? normalized : null;
}
