import { NextRequest, NextResponse } from "next/server";

import { isInfrastructureCompatError, isMissingColumnError, isMissingTableError } from "@/lib/admin-infrastructure";
import { buildSafeOrFilter } from "@/lib/supabase-query-helpers";
import {
  MANAGED_USER_INACTIVE_BAN_DURATION,
  MANAGED_USER_ROLES,
  type ManagedUserAccountCard,
  type ManagedUserRecord,
  validateCreateManagedUserInput,
} from "@/lib/managed-users";
import {
  MANAGED_USER_SELECT,
  buildManagedUserAccountCard,
  buildManagedAuthIdentityPayload,
  buildTeacherClassesTaught,
  decorateManagedUsers,
  findManagedProfileByLinkedRecord,
  fetchManagedUserByAuthUserId,
  fetchManagedAccountSchoolBrand,
  generateManagedLoginIdentifier,
  generateTemporaryPassword,
  hashPassword,
  normalizeManagedUserRecords,
  replaceTeacherAssignments,
  resolveManagedUsersActorContext,
  syncManagedUserAccountState,
  syncStudentTeacherLinks,
  getTeacherTableCapabilities,
  tableHasColumn,
  getClassLookupName,
  parseTeacherClassesTaught,
  type ManagedTeacherAssignmentRecord,
  type ManagedUsersActorContext,
} from "@/lib/managed-users-server";
import {
  buildManagedUsersListCacheKey,
  getManagedUsersListCache,
  getManagedUsersListPending,
  invalidateManagedUsersListCache,
  setManagedUsersListCache,
  setManagedUsersListPending,
} from "@/lib/managed-users/list-cache";
import { resolveAuthoritativeStudentPaidFee } from "@/lib/payments-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { invalidateSchoolCacheDomains } from "@/lib/server-cache";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import {
  normalizeFullName,
  normalizeClassName,
  normalizeSection,
} from "@/lib/normalization";

function jsonError(message: string, status: number, fieldErrors?: Record<string, string>) {
  return NextResponse.json(
    {
      error: {
        message,
        ...(fieldErrors && Object.keys(fieldErrors).length > 0 ? { fieldErrors } : {}),
      },
    },
    { status },
  );
}

function getPostgrestStatus(error: { code?: string | null } | null | undefined, fallback = 500) {
  if (!error?.code) return fallback;
  if (error.code === "23505") return 409;
  if (error.code === "23503" || error.code === "23514") return 400;
  return fallback;
}

function normalizeNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function normalizeIdentityText(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

type LegacyTeacherAssignment = {
  subject_name?: string | null;
  class_name?: string | null;
  grade?: string | null;
  section?: string | null;
  section_name?: string | null;
};

function getPrimaryTeacherSubjectName(user: {
  teacher?: { specialization?: string | null; assignments?: Array<{ subject_name: string }> | null } | null;
}) {
  return user.teacher?.specialization ?? user.teacher?.assignments?.[0]?.subject_name ?? null;
}

function teacherAssignmentMatchesFilters(
  assignment: ManagedTeacherAssignmentRecord,
  filters: {
    classFilter: string;
    sectionFilter: string;
    subjectFilter: string;
  },
) {
  const classMatches =
    !filters.classFilter || normalizeIdentityText(assignment.class_name) === filters.classFilter;
  const subjectMatches =
    !filters.subjectFilter || normalizeIdentityText(assignment.subject_name) === filters.subjectFilter;
  const normalizedSection = normalizeIdentityText(assignment.section_name);
  const sectionMatches =
    !filters.sectionFilter || !normalizedSection || normalizedSection === filters.sectionFilter;

  return classMatches && subjectMatches && sectionMatches;
}

function filterDecoratedManagedUsers(
  users: ManagedUserRecord[],
  filters: {
    roleFilter: string | null;
    searchQuery: string;
    classFilter: string;
    sectionFilter: string;
    subjectFilter: string;
  },
) {
  const normalizedSearch = normalizeIdentityText(filters.searchQuery);

  return users.filter((user) => {
    if (filters.roleFilter === "teacher" && user.role !== "teacher") {
      return false;
    }

    if (filters.roleFilter === "student" && user.role !== "student") {
      return false;
    }

    if (user.role === "teacher") {
      const assignments = user.teacher?.assignments ?? [];
      if ((filters.classFilter || filters.sectionFilter || filters.subjectFilter) && assignments.length === 0) {
        return false;
      }

      if (
        (filters.classFilter || filters.sectionFilter || filters.subjectFilter) &&
        !assignments.some((assignment) =>
          teacherAssignmentMatchesFilters(assignment, {
            classFilter: filters.classFilter,
            sectionFilter: filters.sectionFilter,
            subjectFilter: filters.subjectFilter,
          }),
        )
      ) {
        return false;
      }
    }

    if (!normalizedSearch) {
      return true;
    }

    const searchableParts = [
      user.full_name,
      user.email,
      user.phone,
      user.app_account?.login_identifier,
      user.teacher?.specialization,
      ...(user.teacher?.assignments ?? []).flatMap((assignment) => [
        assignment.subject_name,
        assignment.class_name,
        assignment.section_name,
      ]),
    ];

    return searchableParts
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch);
  });
}

function buildImmediateAccountCard(input: {
  authUserId: string;
  role: "student" | "teacher";
  schoolName: string;
  schoolLogoUrl: string | null;
  fullName: string;
  className: string;
  section: string | null;
  loginIdentifier: string;
  temporaryPassword: string;
}): ManagedUserAccountCard {
  return {
    auth_user_id: input.authUserId,
    role: input.role,
    school_name: input.schoolName,
    school_logo_url: input.schoolLogoUrl,
    full_name: input.fullName,
    class_name: input.className,
    section: input.section,
    login_identifier: input.loginIdentifier,
    temporary_password: input.temporaryPassword,
    instructions: [
      "افتح شاشة تسجيل الدخول الخاصة بالحساب.",
      "أدخل معرّف الدخول وكلمة المرور المؤقتة كما هي تماماً.",
      `إذا تعذر الدخول، اطلب من الإدارة إعادة إصدار كلمة مرور مؤقتة جديدة لحساب ${input.role === "teacher" ? "الأستاذ" : "الطالب"}.`,
    ],
    generated_at: new Date().toISOString(),
  };
}

function buildImmediateManagedUser(input: {
  authUserId: string;
  schoolId: string;
  role: "student" | "teacher";
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  loginIdentifier: string;
  temporaryPassword: string;
  studentId?: string | null;
  teacherId?: string | null;
  student?: {
    class_name: string;
    section: string | null;
    address: string | null;
    total_fee: number;
    paid_fee: number;
    discount_value: number;
  } | null;
  teacher?: {
    specialization: string | null;
    notes: string | null;
    assignments: NonNullable<ManagedUserRecord["teacher"]>["assignments"];
  } | null;
}): ManagedUserRecord {
  return {
    auth_user_id: input.authUserId,
    school_id: input.schoolId,
    role: input.role,
    full_name: input.fullName,
    email: input.email,
    phone: input.phone,
    is_active: input.isActive,
    created_at: input.createdAt,
    updated_at: input.createdAt,
    student:
      input.role === "student" && input.student
        ? {
            id: input.studentId ?? "",
            full_name: input.fullName,
            class_name: input.student.class_name,
            section: input.student.section,
            address: input.student.address,
            total_fee: input.student.total_fee,
            paid_fee: input.student.paid_fee,
            discount_value: input.student.discount_value,
            status: "active",
          }
        : null,
    teacher:
      input.role === "teacher" && input.teacher
        ? {
            id: input.teacherId ?? "",
            full_name: input.fullName,
            email: input.email,
            phone: input.phone,
            specialization: input.teacher.specialization,
            notes: input.teacher.notes,
            is_active: input.isActive,
            assignments: input.teacher.assignments,
          }
        : null,
    app_account: {
      login_identifier: input.loginIdentifier,
      has_temporary_password: true,
      password_last_reset_at: input.createdAt,
      card_last_printed_at: null,
    },
  };
}

async function fallbackListUsersFromUserProfiles(
  actorSupabase: ManagedUsersActorContext["actorSupabase"],
  schoolId: string,
  options: {
    roleFilter?: string | null;
    statusFilter?: string | null;
    searchQuery?: string;
    matchingTeacherIds?: string[] | null;
    from?: number;
    to?: number;
    paginate?: boolean;
  },
) {
  let matchingAuthUserIds: string[] | null = null;
  if (options.matchingTeacherIds) {
    if (options.matchingTeacherIds.length === 0) {
      return { error: null, totalCount: 0, users: [] as ManagedUserRecord[] };
    }

    const { data: matchingTeachers, error: matchingTeachersError } = await actorSupabase
      .from("teachers")
      .select("auth_user_id")
      .eq("school_id", schoolId)
      .in("id", options.matchingTeacherIds);

    if (matchingTeachersError) {
      return { error: matchingTeachersError, totalCount: 0, users: [] as ManagedUserRecord[] };
    }

    matchingAuthUserIds = ((matchingTeachers ?? []) as Array<Record<string, unknown>>)
      .map((teacher) => (typeof teacher.auth_user_id === "string" ? teacher.auth_user_id : null))
      .filter((authUserId): authUserId is string => Boolean(authUserId));

    if (matchingAuthUserIds.length === 0) {
      return { error: null, totalCount: 0, users: [] as ManagedUserRecord[] };
    }
  }

  let query = actorSupabase
    .from("user_profiles")
    .select("id, school_id, role, full_name, email, phone, is_active, created_at", { count: "exact" })
    .eq("school_id", schoolId)
    .in("role", ["student", "teacher"])
    .order("created_at", { ascending: false });

  if (options.roleFilter && MANAGED_USER_ROLES.includes(options.roleFilter as (typeof MANAGED_USER_ROLES)[number])) {
    query = query.eq("role", options.roleFilter);
  }

  if (options.statusFilter === "active") {
    query = query.eq("is_active", true);
  } else if (options.statusFilter === "inactive") {
    query = query.eq("is_active", false);
  }

  if (options.searchQuery) {
    query = query.or(buildSafeOrFilter(["full_name", "email", "phone"], options.searchQuery));
  }

  if (matchingAuthUserIds) {
    query = query.in("id", matchingAuthUserIds);
  }

  if (options.paginate && typeof options.from === "number" && typeof options.to === "number") {
    query = query.range(options.from, options.to);
  }

  const { data: profiles, error: profilesError, count } = await query;
  if (profilesError) {
    return { error: profilesError, totalCount: 0, users: [] as ManagedUserRecord[] };
  }

  const authUserIds = ((profiles ?? []) as Array<Record<string, unknown>>).map((profile) => String(profile.id));
  if (authUserIds.length === 0) {
    return { error: null, totalCount: count ?? 0, users: [] as ManagedUserRecord[] };
  }

  const [studentsLinkAvailable, teachersLinkAvailable] = await Promise.all([
    tableHasColumn(actorSupabase, "students", "auth_user_id"),
    tableHasColumn(actorSupabase, "teachers", "auth_user_id"),
  ]);
  const shouldLoadStudents = options.roleFilter !== "teacher";
  const shouldLoadTeachers = options.roleFilter !== "student";
  const teacherTableCapabilities = teachersLinkAvailable && shouldLoadTeachers
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

  const [studentsResult, teachersResult] = await Promise.all([
    studentsLinkAvailable && shouldLoadStudents
      ? actorSupabase
          .from("students")
          .select("id, auth_user_id, full_name, class_name, section, address, total_fee, paid_fee, discount_value, status")
          .in("auth_user_id", authUserIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    teachersLinkAvailable && shouldLoadTeachers
      ? actorSupabase
          .from("teachers")
          .select(teacherSelectColumns)
          .in("auth_user_id", authUserIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
  ]);

  if (studentsResult.error) {
    return { error: studentsResult.error, totalCount: 0, users: [] as ManagedUserRecord[] };
  }

  if (teachersResult.error) {
    return { error: teachersResult.error, totalCount: 0, users: [] as ManagedUserRecord[] };
  }

  const studentsByAuthId = new Map<string, Record<string, unknown>>(
    ((studentsResult.data ?? []) as Array<Record<string, unknown>>)
      .filter((student) => typeof student.auth_user_id === "string")
      .map((student) => [String(student.auth_user_id), student]),
  );
  const teachersByAuthId = new Map<string, Record<string, unknown>>(
    ((teachersResult.data ?? []) as Array<Record<string, unknown>>)
      .filter((teacher) => typeof teacher.auth_user_id === "string")
      .map((teacher) => [String(teacher.auth_user_id), teacher]),
  );

  const users = ((profiles ?? []) as Array<Record<string, unknown>>).map((profile) => {
    const authUserId = String(profile.id);
    const student = studentsByAuthId.get(authUserId) ?? null;
    const teacher = teachersByAuthId.get(authUserId) ?? null;
    const role = profile.role === "teacher" ? "teacher" : "student";
    const teacherStatus = typeof teacher?.status === "string" ? teacher.status.toLowerCase() : "";

    return {
      auth_user_id: authUserId,
      school_id: String(profile.school_id),
      role,
      full_name: typeof profile.full_name === "string" ? profile.full_name : "",
      email: typeof profile.email === "string" ? profile.email : "",
      phone: typeof profile.phone === "string" ? profile.phone : null,
      is_active: Boolean(profile.is_active),
      created_at: typeof profile.created_at === "string" ? profile.created_at : null,
      updated_at: null,
      student:
        role === "student" && student
          ? {
              id: String(student.id),
              full_name: typeof student.full_name === "string" ? student.full_name : null,
              class_name: typeof student.class_name === "string" ? student.class_name : null,
              section: typeof student.section === "string" ? student.section : null,
              address: typeof student.address === "string" ? student.address : null,
              total_fee: normalizeNumber(student.total_fee),
              paid_fee: normalizeNumber(student.paid_fee),
              discount_value: normalizeNumber(student.discount_value),
              status: typeof student.status === "string" ? student.status : null,
            }
          : null,
      teacher:
        role === "teacher" && teacher
          ? {
              id: String(teacher.id),
              full_name: typeof teacher.full_name === "string" ? teacher.full_name : null,
              email: typeof teacher.email === "string" ? teacher.email : null,
              phone: typeof teacher.phone === "string" ? teacher.phone : null,
              specialization:
                typeof teacher.specialization === "string"
                  ? teacher.specialization
                  : typeof teacher.subject === "string"
                    ? teacher.subject
                    : null,
              notes: typeof teacher.notes === "string" ? teacher.notes : null,
              is_active:
                typeof teacher.is_active === "boolean"
                  ? teacher.is_active
                  : teacherStatus !== "inactive" && teacherStatus !== "deleted",
              assignments: [],
            }
          : null,
      app_account: null,
    } satisfies ManagedUserRecord;
  });

  return {
    error: null,
    totalCount: typeof count === "number" ? count : users.length,
    users,
  };
}

async function cleanupCreatedUser(options: {
  actorSupabase?: ManagedUsersActorContext["actorSupabase"];
  authUserId?: string | null;
  schoolId?: string | null;
  role: "student" | "teacher";
  relatedRecordId?: string | null;
  cleanupRelatedRecord?: boolean;
}) {
  if (options.authUserId) {
    const serviceSupabase = createServiceSupabaseClient();
    await serviceSupabase.auth.admin.deleteUser(options.authUserId);
  }

  if (options.actorSupabase && options.relatedRecordId && options.cleanupRelatedRecord !== false) {
    const table = options.role === "student" ? "students" : "teachers";
    let query = options.actorSupabase.from(table).delete().eq("id", options.relatedRecordId);
    if (options.schoolId) {
      query = query.eq("school_id", options.schoolId);
    }
    await query;
  }
}

async function resolveTeacherIdsForFilters(
  actorSupabase: ManagedUsersActorContext["actorSupabase"],
  schoolId: string,
  filters: {
    classFilter: string;
    sectionFilter: string;
    subjectFilter: string;
  },
) {
  const hasAssignmentsTable = await tableHasColumn(actorSupabase, "teacher_assignments", "id");

  if (hasAssignmentsTable) {
    // Optimized path: query teacher_assignments directly
    let query = actorSupabase
      .from("teacher_assignments")
      .select("teacher_id")
      .eq("school_id", schoolId)
      .eq("is_active", true);

    if (filters.classFilter) {
      // Find matching class IDs first
      const { data: classRows } = await actorSupabase
        .from("classes")
        .select("id, name, grade")
        .eq("school_id", schoolId);
      
      const matchingClassIds = ((classRows ?? []) as Array<Record<string, unknown>>)
        .filter(row => normalizeIdentityText(getClassLookupName(row)) === filters.classFilter)
        .map(row => row.id as string);
      
      if (matchingClassIds.length === 0) return [];
      query = query.in("class_id", matchingClassIds);
    }

    if (filters.sectionFilter) {
      // Find matching section IDs first
      const { data: sectionRows } = await actorSupabase
        .from("sections")
        .select("id, name")
        .eq("school_id", schoolId);
      
      const matchingSectionIds = ((sectionRows ?? []) as Array<Record<string, unknown>>)
        .filter(row => normalizeIdentityText(row.name as string) === filters.sectionFilter)
        .map(row => row.id as string);
      
      if (matchingSectionIds.length === 0) return [];
      query = query.in("section_id", matchingSectionIds);
    }

    if (filters.subjectFilter) {
      // Find matching subject IDs first
      const { data: subjectRows } = await actorSupabase
        .from("subjects")
        .select("id, name")
        .eq("school_id", schoolId);
      
      const matchingSubjectIds = ((subjectRows ?? []) as Array<Record<string, unknown>>)
        .filter(row => normalizeIdentityText(row.name as string) === filters.subjectFilter)
        .map(row => row.id as string);
      
      if (matchingSubjectIds.length === 0) return [];
      query = query.in("subject_id", matchingSubjectIds);
    }

    const { data: assignments, error } = await query;
    if (error) throw error;

    return Array.from(new Set(
      ((assignments ?? []) as Array<{ teacher_id?: string | null }>)
        .map(a => a.teacher_id)
        .filter((id): id is string => Boolean(id))
    ));
  }

  // Legacy fallback: still fetching in memory but limited to school
  const { data: teachers, error } = await actorSupabase
    .from("teachers")
    .select("id, classes_taught")
    .eq("school_id", schoolId);

  if (error) {
    throw error;
  }

  return ((teachers ?? []) as Array<Record<string, unknown>>)
    .filter((teacher) => {
      const assignments = parseTeacherClassesTaught(teacher.classes_taught) as LegacyTeacherAssignment[];
      return assignments.some((assignment) =>
        teacherAssignmentMatchesFilters({
          id: "",
          subject_id: null,
          subject_name: String(assignment.subject_name || ""),
          class_id: null,
          class_name: String(assignment.class_name || assignment.grade || ""),
          section_id: null,
          section_name: assignment.section ? String(assignment.section) : assignment.section_name ? String(assignment.section_name) : null,
          is_active: true
        } as ManagedTeacherAssignmentRecord, filters),
      );
    })
    .map((teacher) => String(teacher.id));
}

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const roleFilter = req.nextUrl.searchParams.get("role");
  const statusFilter = req.nextUrl.searchParams.get("status");
  const searchQuery = (req.nextUrl.searchParams.get("search") || "").trim();
  const classFilter = normalizeIdentityText(req.nextUrl.searchParams.get("className"));
  const sectionFilter = normalizeIdentityText(req.nextUrl.searchParams.get("section"));
  const subjectFilter = normalizeIdentityText(req.nextUrl.searchParams.get("subject"));
  const rawPage = Number.parseInt(req.nextUrl.searchParams.get("page") || "", 10);
  const rawPageSize = Number.parseInt(req.nextUrl.searchParams.get("pageSize") || "", 10);
  const hasPagination = Number.isFinite(rawPage) && Number.isFinite(rawPageSize);
  const page = hasPagination ? Math.max(1, rawPage) : 1;
  const pageSize = hasPagination ? Math.min(200, Math.max(10, rawPageSize)) : 0;
  const from = hasPagination ? (page - 1) * pageSize : 0;
  const to = hasPagination ? from + pageSize - 1 : 0;
  const skipCache = req.nextUrl.searchParams.get("cache") === "0";
  const requiresTeacherScopedFiltering =
    roleFilter === "teacher" && Boolean(classFilter || sectionFilter || subjectFilter);
  const fallbackNeedsDecoratedFiltering = requiresTeacherScopedFiltering && Boolean(searchQuery);

  const context = await resolveManagedUsersActorContext(schoolId, req.headers.get("authorization"));
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorSupabase, targetSchoolId } = context.value;
  const cacheKey = buildManagedUsersListCacheKey({
    schoolId: targetSchoolId,
    roleFilter,
    statusFilter,
    searchQuery,
    classFilter,
    sectionFilter,
    subjectFilter,
    page,
    pageSize,
    hasPagination,
  });

  if (!skipCache) {
    const cachedPayload = getManagedUsersListCache<Record<string, unknown>>(cacheKey);
    if (cachedPayload) {
      return NextResponse.json(cachedPayload, {
        headers: { "x-managed-users-cache": "HIT" },
      });
    }

    const pendingPayload = getManagedUsersListPending<Record<string, unknown>>(cacheKey);
    if (pendingPayload) {
      return NextResponse.json(await pendingPayload, {
        headers: { "x-managed-users-cache": "PENDING" },
      });
    }
  }

  const loadUsersPayload = async () => {
    const matchingTeacherIds = requiresTeacherScopedFiltering
      ? await resolveTeacherIdsForFilters(actorSupabase, targetSchoolId, {
          classFilter,
          sectionFilter,
          subjectFilter,
        })
      : null;

    if (requiresTeacherScopedFiltering && matchingTeacherIds && matchingTeacherIds.length === 0) {
      return {
        ok: true,
        users: [],
        totalCount: 0,
        page,
        pageSize: hasPagination ? pageSize : 0,
      };
    }

    let query = actorSupabase
      .from("managed_user_profiles")
      .select(MANAGED_USER_SELECT, { count: "exact" })
      .eq("school_id", targetSchoolId)
      .order("created_at", { ascending: false });

    if (roleFilter && MANAGED_USER_ROLES.includes(roleFilter as (typeof MANAGED_USER_ROLES)[number])) {
      query = query.eq("role", roleFilter);
    }

    if (statusFilter === "active") {
      query = query.eq("is_active", true);
    } else if (statusFilter === "inactive") {
      query = query.eq("is_active", false);
    }

    if (searchQuery && !(requiresTeacherScopedFiltering && matchingTeacherIds)) {
      query = query.or(buildSafeOrFilter(["full_name", "email", "phone"], searchQuery));
    }

    if (matchingTeacherIds) {
      query = query.in("teacher_id", matchingTeacherIds);
    }

    if (hasPagination && !(requiresTeacherScopedFiltering && searchQuery)) {
      query = query.range(from, to);
    }

    const { data, error, count } = await query;
    if (error) {
      if (isMissingTableError(error, "managed_user_profiles") || isInfrastructureCompatError(error)) {
        const fallback = await fallbackListUsersFromUserProfiles(actorSupabase, targetSchoolId, {
          roleFilter,
          statusFilter,
          searchQuery: fallbackNeedsDecoratedFiltering ? "" : searchQuery,
          matchingTeacherIds,
          from,
          to,
          paginate: hasPagination && !fallbackNeedsDecoratedFiltering,
        });
        if (fallback.error) {
          return jsonError(
            fallback.error.message || "تعذر تحميل الحسابات من ملفات المستخدمين الحالية.",
            getPostgrestStatus(fallback.error),
          );
        }

        const decoratedUsers = await decorateManagedUsers(actorSupabase, fallback.users);
        const searchedUsers = fallbackNeedsDecoratedFiltering
          ? filterDecoratedManagedUsers(decoratedUsers, {
              roleFilter,
              searchQuery,
              classFilter,
              sectionFilter,
              subjectFilter,
            })
          : decoratedUsers;
        const pagedUsers = fallbackNeedsDecoratedFiltering && hasPagination
          ? searchedUsers.slice(from, to + 1)
          : searchedUsers;

        return {
          ok: true,
          users: pagedUsers,
          totalCount: fallbackNeedsDecoratedFiltering ? searchedUsers.length : fallback.totalCount,
          page,
          pageSize: hasPagination ? pageSize : searchedUsers.length,
        };
      }

      return jsonError(error.message || "تعذر تحميل الحسابات.", getPostgrestStatus(error));
    }

    const normalizedUsers = normalizeManagedUserRecords((data ?? []) as Record<string, unknown>[]);
    const decoratedUsers = await decorateManagedUsers(actorSupabase, normalizedUsers);
    const filteredUsers = requiresTeacherScopedFiltering && Boolean(searchQuery)
      ? filterDecoratedManagedUsers(decoratedUsers, {
          roleFilter,
          searchQuery,
          classFilter,
          sectionFilter,
          subjectFilter,
        })
      : decoratedUsers;
    const pagedUsers =
      requiresTeacherScopedFiltering && Boolean(searchQuery) && hasPagination
        ? filteredUsers.slice(from, to + 1)
        : filteredUsers;

    return {
      ok: true,
      users: pagedUsers,
      totalCount: requiresTeacherScopedFiltering && Boolean(searchQuery)
        ? filteredUsers.length
        : typeof count === "number"
          ? count
          : decoratedUsers.length,
      page,
      pageSize: hasPagination ? pageSize : filteredUsers.length,
    };
  };

  const pendingPayload = loadUsersPayload();
  if (!skipCache) {
    setManagedUsersListPending(cacheKey, pendingPayload);
  }

  try {
    const payload = await pendingPayload;
    if (!(payload instanceof NextResponse) && !skipCache) {
      setManagedUsersListCache(cacheKey, payload);
    }
    return payload instanceof NextResponse
      ? payload
      : NextResponse.json(payload, {
          headers: { "x-managed-users-cache": skipCache ? "BYPASS" : "MISS" },
        });
  } finally {
    if (!skipCache) {
      setManagedUsersListPending(cacheKey, null);
    }
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const validation = validateCreateManagedUserInput(body);
  if (!validation.ok) {
    return jsonError(
      "message" in validation ? validation.message : "تحقق من الحقول المطلوبة ثم أعد المحاولة.",
      400,
      "fieldErrors" in validation ? validation.fieldErrors : {},
    );
  }

  const context = await resolveManagedUsersActorContext(
    validation.value.school_id,
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  const rateLimited = await enforceRateLimit(req, {
    namespace: "dashboard-managed-users-post",
    windowMs: 10 * 60_000,
    maxHits: 25,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  const serviceSupabase = createServiceSupabaseClient();

  // Resolve actor's accessible branches from user_profiles (source of truth)
  let actorAccessibleBranches: string[] = [];

  try {
    const { data: actorProfile, error: profileError } = await actorSupabase
      .from("user_profiles")
      .select("branch_id")
      .eq("id", actorUserId)
      .eq("school_id", targetSchoolId)
      .maybeSingle();

    if (!profileError && actorProfile?.branch_id) {
      // Single-branch user: only their assigned branch
      actorAccessibleBranches = [actorProfile.branch_id];
    } else {
      // School-wide admin or multi-branch: fetch all school branches
      const { data: allBranches, error: branchesError } = await actorSupabase
        .from("branches")
        .select("id")
        .eq("school_id", targetSchoolId);

      if (!branchesError && allBranches) {
        actorAccessibleBranches = allBranches.map((b) => b.id);
      }
    }
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "تعذر التحقق من صلاحيات الفروع.",
      500
    );
  }

  // Determine branch for new student/teacher
  let branchId: string | null = null;

  if (validation.value.role === "student") {
    const requestedBranchId = validation.value.student?.branch_id;

    // Require branch_id if actor has access to multiple branches
    if (actorAccessibleBranches.length > 1 && !requestedBranchId) {
      return jsonError(
        "يجب تحديد الفرع المطلوب. المستخدم الحالي له صلاحيات في عدة فروع.",
        400,
        {
          "student.branch_id": "تحديد الفرع مطلوب للمستخدمين متعددي الفروع.",
        }
      );
    }

    // Use provided branch_id if specified
    if (requestedBranchId) {
      // Validate it's in actor's accessible branches
      if (!actorAccessibleBranches.includes(requestedBranchId)) {
        return jsonError(
          "الفرع المحدد غير متاح لهذا المستخدم.",
          403,
          {
            "student.branch_id": "ليس لديك صلاحيات الوصول إلى هذا الفرع.",
          }
        );
      }

      // Validate branch exists and belongs to school
      const { data: branchData, error: branchError } = await actorSupabase
        .from("branches")
        .select("id")
        .eq("id", requestedBranchId)
        .eq("school_id", targetSchoolId)
        .maybeSingle();

      if (branchError || !branchData) {
        return jsonError("الفرع المحدد غير موجود أو لا ينتمي لهذه المدرسة.", 404, {
          "student.branch_id": "الفرع المطلوب غير موجود.",
        });
      }

      branchId = requestedBranchId;
    } else if (actorAccessibleBranches.length === 1) {
      // Single-branch user: use their branch
      branchId = actorAccessibleBranches[0];
    }
  } else if (validation.value.role === "teacher") {
    const requestedBranchId = validation.value.teacher?.branch_id;

    // Require branch_id if actor has access to multiple branches
    if (actorAccessibleBranches.length > 1 && !requestedBranchId) {
      return jsonError(
        "يجب تحديد الفرع المطلوب. المستخدم الحالي له صلاحيات في عدة فروع.",
        400,
        {
          "teacher.branch_id": "تحديد الفرع مطلوب للمستخدمين متعددي الفروع.",
        }
      );
    }

    // Use provided branch_id if specified
    if (requestedBranchId) {
      // Validate it's in actor's accessible branches
      if (!actorAccessibleBranches.includes(requestedBranchId)) {
        return jsonError(
          "الفرع المحدد غير متاح لهذا المستخدم.",
          403,
          {
            "teacher.branch_id": "ليس لديك صلاحيات الوصول إلى هذا الفرع.",
          }
        );
      }

      // Validate branch exists and belongs to school
      const { data: branchData, error: branchError } = await actorSupabase
        .from("branches")
        .select("id")
        .eq("id", requestedBranchId)
        .eq("school_id", targetSchoolId)
        .maybeSingle();

      if (branchError || !branchData) {
        return jsonError("الفرع المحدد غير موجود أو لا ينتمي لهذه المدرسة.", 404, {
          "teacher.branch_id": "الفرع المطلوب غير موجود.",
        });
      }

      branchId = requestedBranchId;
    } else if (actorAccessibleBranches.length === 1) {
      // Single-branch user: use their branch
      branchId = actorAccessibleBranches[0];
    }
  }
  const loginIdentifier = await generateManagedLoginIdentifier(actorSupabase, {
    schoolId: targetSchoolId,
    role: validation.value.role,
    fullName: validation.value.full_name,
    preferredEmail: validation.value.email,
  });
  const temporaryPassword = validation.value.password || generateTemporaryPassword();
  const linkTable = validation.value.role === "student" ? "students" : "teachers";
  const linkColumnProbe = await actorSupabase.from(linkTable).select("auth_user_id").limit(1);

  if (isMissingColumnError(linkColumnProbe.error, linkTable, "auth_user_id")) {
    return jsonError(
      `بيئة Supabase الحالية تفتقد عمود الربط \`${linkTable}.auth_user_id\`. شغّل ملفات الترحيل الخاصة بحسابات الطلاب والمدرسين قبل إنشاء الحسابات من لوحة الإدارة.`,
      500,
      {
        role: "قاعدة البيانات الحالية غير مهيأة بعد لربط الحسابات بسجلات الطلاب أو المدرسين.",
      },
    );
  }

  const teacherTableCapabilities =
    validation.value.role === "teacher" ? await getTeacherTableCapabilities(actorSupabase) : null;
  const createdAt = new Date().toISOString();
  const schoolBrand = await fetchManagedAccountSchoolBrand(actorSupabase, targetSchoolId);

  if (validation.value.role === "student" && !branchId) {
    return jsonError("يجب إضافة فرع واحد على الأقل للمدرسة قبل إنشاء حساب طالب.", 400, {
      role: "تعذر إنشاء سجل الطالب لعدم وجود فرع مرتبط بالمدرسة.",
    });
  }

  let relatedRecordId: string | null = null;
  let authUserId: string | null = null;
  let cleanupRelatedRecord = false;

  try {
    if (validation.value.role === "student") {
      const requestedSection = validation.value.student!.section || "";
      const normalizedFullName = normalizeFullName(validation.value.full_name);
      const normalizedClassName = normalizeClassName(validation.value.student!.class_name);
      const normalizedSection = normalizeSection(requestedSection);

      const { data: existingStudents, error: existingStudentError } = await actorSupabase
        .from("students")
        .select("id, auth_user_id, section, full_name, class_name, branch_id")
        .eq("school_id", targetSchoolId)
        .eq("branch_id", branchId)
        .neq("status", "deleted")
        .limit(25);

      if (existingStudentError) {
        return jsonError(
          existingStudentError.message || "تعذر التحقق من تكرار الطالب.",
          getPostgrestStatus(existingStudentError, 400),
        );
      }

      // Find matching student with normalized comparison
      const matchingStudent = ((existingStudents ?? []) as Array<Record<string, unknown>>).find((row) => {
        const rowNormalizedName = normalizeFullName(String(row.full_name || ""));
        const rowNormalizedClass = normalizeClassName(String(row.class_name || ""));
        const rowNormalizedSection = normalizeSection(row.section as string | null);

        return (
          rowNormalizedName === normalizedFullName &&
          rowNormalizedClass === normalizedClassName &&
          rowNormalizedSection === normalizedSection
        );
      });

      if (matchingStudent?.auth_user_id) {
        return jsonError("هذا الطالب يملك حساب تطبيق مرتبطاً مسبقاً.", 409, {
          full_name: "تم منع إنشاء حساب طالب مكرر لنفس الاسم والصف والشعبة.",
        });
      }

      if (matchingStudent?.id) {
        // Student exists without auth account - will be reused below
      } else if (!branchId) {
        // New student requires branch_id
        return jsonError("يجب تحديد الفرع لإضافة طالب جديد.", 400, {
          "student.branch_id": "الفرع مطلوب لإضافة طالب جديد.",
        });
      }

      if (matchingStudent?.id) {
        let nextPaidFee = validation.value.student!.paid_fee;
        try {
          nextPaidFee = await resolveAuthoritativeStudentPaidFee(
            actorSupabase,
            targetSchoolId,
            String(matchingStudent.id),
            validation.value.student!.paid_fee,
          );
        } catch (paymentError) {
          return jsonError(
            paymentError instanceof Error ? paymentError.message : "تعذر التحقق من إجمالي دفعات الطالب الحالية.",
            500,
          );
        }

        if (nextPaidFee > validation.value.student!.total_fee) {
          return jsonError("المدفوع الفعلي لا يمكن أن يكون أكبر من إجمالي الرسوم.", 400, {
            "student.total_fee": "إجمالي الرسوم أقل من مجموع الدفعات المسجلة فعلياً.",
          });
        }

        const { error: reuseStudentError } = await actorSupabase
          .from("students")
          .update({
            branch_id: branchId,
            full_name: validation.value.full_name,
            class_name: validation.value.student!.class_name,
            section: requestedSection,
            phone: validation.value.phone,
            address: validation.value.student!.address,
            total_fee: validation.value.student!.total_fee,
            paid_fee: nextPaidFee,
            discount_value: validation.value.student!.discount_value,
          })
          .eq("id", String(matchingStudent.id))
          .eq("school_id", targetSchoolId);

        if (reuseStudentError) {
          return jsonError(
            reuseStudentError.message || "تعذر تحديث سجل الطالب الموجود.",
            getPostgrestStatus(reuseStudentError, 400),
          );
        }

        relatedRecordId = String(matchingStudent.id);
        cleanupRelatedRecord = false;
      } else {
        const { data: student, error: studentError } = await actorSupabase
          .from("students")
          .insert({
            school_id: targetSchoolId,
            branch_id: branchId,
            full_name: validation.value.full_name,
            class_name: validation.value.student!.class_name,
            section: requestedSection,
            phone: validation.value.phone,
            address: validation.value.student!.address,
            total_fee: validation.value.student!.total_fee,
            paid_fee: validation.value.student!.paid_fee,
            discount_value: validation.value.student!.discount_value,
            status: "active",
          })
          .select("id")
          .single();

        if (studentError || !student?.id) {
          return jsonError(studentError?.message || "تعذر إنشاء سجل الطالب.", getPostgrestStatus(studentError, 400));
        }

        relatedRecordId = student.id;
        cleanupRelatedRecord = true;
      }
    } else {
      const teacherSubject = validation.value.teacher?.specialization ?? validation.value.teacher?.assignments?.[0]?.subject_name ?? null;
      const teacherInsertPayload: Record<string, unknown> = {
        school_id: targetSchoolId,
        full_name: validation.value.full_name,
        email: loginIdentifier,
        phone: validation.value.phone,
      };

      if (branchId) {
        teacherInsertPayload.branch_id = branchId;
      }

      if (teacherTableCapabilities?.specialization) {
        teacherInsertPayload.specialization = teacherSubject;
      } else if (teacherTableCapabilities?.subject) {
        teacherInsertPayload.subject = teacherSubject;
      }

      if (teacherTableCapabilities?.notes) {
        teacherInsertPayload.notes = validation.value.teacher?.notes ?? null;
      }

      if (teacherTableCapabilities?.is_active) {
        teacherInsertPayload.is_active = validation.value.is_active;
      } else if (teacherTableCapabilities?.status) {
        teacherInsertPayload.status = validation.value.is_active ? "active" : "inactive";
      }

      if (teacherTableCapabilities?.classes_taught) {
        teacherInsertPayload.classes_taught = buildTeacherClassesTaught(validation.value.teacher?.assignments ?? []);
      }

      const { data: existingTeachers, error: existingTeacherError } = await actorSupabase
        .from("teachers")
        .select("id, auth_user_id, phone, email")
        .eq("school_id", targetSchoolId)
        .eq("full_name", validation.value.full_name)
        .limit(25);

      if (existingTeacherError) {
        return jsonError(
          existingTeacherError.message || "تعذر التحقق من تكرار المدرس.",
          getPostgrestStatus(existingTeacherError, 400),
        );
      }

      const incomingPhone = normalizeIdentityText(validation.value.phone);
      const incomingLoginIdentifier = normalizeIdentityText(validation.value.email || loginIdentifier);
      const teacherRows = (existingTeachers ?? []) as Array<Record<string, unknown>>;
      const matchingTeacher = incomingPhone
        ? teacherRows.find(
            (row) =>
              normalizeIdentityText(row.phone) === incomingPhone ||
              (incomingLoginIdentifier && normalizeIdentityText(row.email) === incomingLoginIdentifier),
          )
        : teacherRows.find((row) =>
            incomingLoginIdentifier
              ? normalizeIdentityText(row.email) === incomingLoginIdentifier
              : teacherRows.length === 1 && !normalizeIdentityText(row.phone),
          ) ?? null;

      if (matchingTeacher?.auth_user_id) {
        return jsonError("هذا الأستاذ يملك حساب تطبيق مرتبطاً مسبقاً.", 409, {
          full_name: incomingPhone
            ? "تم منع إنشاء حساب أستاذ مكرر لنفس الاسم ورقم الهاتف."
            : "تم منع إنشاء حساب أستاذ مكرر لهذا الاسم.",
        });
      }

      if (matchingTeacher?.id) {
        const { error: reuseTeacherError } = await actorSupabase
          .from("teachers")
          .update(teacherInsertPayload)
          .eq("id", String(matchingTeacher.id))
          .eq("school_id", targetSchoolId);

        if (reuseTeacherError) {
          return jsonError(
            reuseTeacherError.message || "تعذر تحديث سجل المدرس الموجود.",
            getPostgrestStatus(reuseTeacherError, 400),
          );
        }

        relatedRecordId = String(matchingTeacher.id);
        cleanupRelatedRecord = false;
      } else {
        const { data: teacher, error: teacherError } = await actorSupabase
          .from("teachers")
          .insert(teacherInsertPayload)
          .select("id")
          .single();

        if (teacherError || !teacher?.id) {
          return jsonError(teacherError?.message || "تعذر إنشاء سجل المدرس.", getPostgrestStatus(teacherError, 400));
        }

        relatedRecordId = teacher.id;
        cleanupRelatedRecord = true;
      }
    }

    if (relatedRecordId) {
      const existingManagedProfile = await findManagedProfileByLinkedRecord(actorSupabase, {
        schoolId: targetSchoolId,
        role: validation.value.role,
        relatedRecordId,
      });

      if (existingManagedProfile?.authUserId) {
        return jsonError(
          validation.value.role === "teacher"
            ? "هذا الأستاذ يملك حساب تطبيق مرتبطاً مسبقاً."
            : "هذا الطالب يملك حساب تطبيق مرتبطاً مسبقاً.",
          409,
          {
            full_name:
              validation.value.role === "teacher"
                ? "تم منع إنشاء حساب أستاذ مكرر لأن السجل الحالي مرتبط بحساب موجود بالفعل."
                : "تم منع إنشاء حساب طالب مكرر لأن السجل الحالي مرتبط بحساب موجود بالفعل.",
          },
        );
      }
    }

    const authIdentityPayload = buildManagedAuthIdentityPayload({
      role: validation.value.role,
      schoolId: targetSchoolId,
      fullName: validation.value.full_name,
      loginIdentifier,
      createdBy: actorUserId,
      credentialPatch: {
        temporaryPasswordHash: hashPassword(temporaryPassword),
        hasPendingSetup: true,
        passwordLastResetAt: createdAt,
        cardLastPrintedAt: null,
      },
    });
    const { data: authData, error: createAuthError } = await serviceSupabase.auth.admin.createUser({
      email: loginIdentifier,
      password: temporaryPassword,
      email_confirm: true,
      ...authIdentityPayload,
    });

    if (createAuthError || !authData?.user) {
      await cleanupCreatedUser({
        actorSupabase,
        schoolId: targetSchoolId,
        role: validation.value.role,
        relatedRecordId,
        cleanupRelatedRecord,
      });

      const status = createAuthError?.message?.toLowerCase().includes("already") ? 409 : 400;
      return jsonError(createAuthError?.message || "تعذر إنشاء مستخدم المصادقة.", status, {
        email: "تعذر استخدام معرّف الدخول المحدد.",
      });
    }

    authUserId = authData.user.id;

    if (!validation.value.is_active) {
      const { error: banError } = await serviceSupabase.auth.admin.updateUserById(authUserId, {
        ban_duration: MANAGED_USER_INACTIVE_BAN_DURATION,
      });

      if (banError) {
        await cleanupCreatedUser({
          actorSupabase,
          authUserId,
          schoolId: targetSchoolId,
          role: validation.value.role,
          relatedRecordId,
          cleanupRelatedRecord,
        });
        return jsonError(banError.message || "تعذر تعطيل الحساب الجديد.", 500);
      }
    }

    const relatedTable = validation.value.role === "student" ? "students" : "teachers";
    const { error: linkRelatedRecordError } = await actorSupabase
      .from(relatedTable)
      .update({ auth_user_id: authUserId })
      .eq("id", relatedRecordId)
      .eq("school_id", targetSchoolId);

    if (linkRelatedRecordError) {
      await cleanupCreatedUser({
        actorSupabase,
        authUserId,
        schoolId: targetSchoolId,
        role: validation.value.role,
        relatedRecordId,
        cleanupRelatedRecord,
      });
      return jsonError(
        linkRelatedRecordError.message || "تم إنشاء المستخدم لكن تعذر ربطه بالسجل المطلوب.",
        getPostgrestStatus(linkRelatedRecordError, 400),
      );
    }

    try {
      await syncManagedUserAccountState(actorSupabase, {
        authUserId,
        schoolId: targetSchoolId,
        role: validation.value.role,
        fullName: validation.value.full_name,
        email: loginIdentifier,
        phone: validation.value.phone,
        isActive: validation.value.is_active,
        studentId: validation.value.role === "student" ? relatedRecordId : null,
        teacherId: validation.value.role === "teacher" ? relatedRecordId : null,
        createdBy: actorUserId,
        temporaryPassword,
      });
    } catch (profileError) {
      await cleanupCreatedUser({
        authUserId,
        actorSupabase,
        schoolId: targetSchoolId,
        role: validation.value.role,
        relatedRecordId,
        cleanupRelatedRecord,
      });
      return jsonError(
        profileError instanceof Error ? profileError.message : "تعذر إنشاء ملف الحساب.",
        getPostgrestStatus(profileError as { code?: string | null }, 400),
      );
    }

    if (validation.value.role === "teacher" && relatedRecordId) {
      try {
        await replaceTeacherAssignments(actorSupabase, {
          schoolId: targetSchoolId,
          teacherId: relatedRecordId,
          assignments: validation.value.teacher?.assignments ?? [],
        });
      } catch (assignmentError) {
        await cleanupCreatedUser({
          authUserId,
          actorSupabase,
          schoolId: targetSchoolId,
          role: validation.value.role,
          relatedRecordId,
          cleanupRelatedRecord,
        });

        return jsonError(
          assignmentError instanceof Error ? assignmentError.message : "تعذر حفظ تكليفات المدرس.",
          400,
          {
            teacher: "تعذر ربط تكليفات المدرس الحالية بإعدادات الصفوف والمواد.",
          },
        );
      }
    }

    if (validation.value.role === "student" && relatedRecordId) {
      try {
        await syncStudentTeacherLinks(actorSupabase, {
          schoolId: targetSchoolId,
          studentId: relatedRecordId,
          className: validation.value.student!.class_name,
          section: validation.value.student!.section,
        });
      } catch {
        // Ignore auto-link failures to avoid blocking account creation.
      }
    }

    let decoratedUser: ManagedUserRecord | null = null;
    let accountCard: ManagedUserAccountCard | null = null;

    try {
      decoratedUser = await fetchManagedUserByAuthUserId(actorSupabase, {
        authUserId,
        schoolId: targetSchoolId,
      });
    } catch {
      decoratedUser = null;
    }

    if (!decoratedUser) {
      decoratedUser = buildImmediateManagedUser({
        authUserId,
        schoolId: targetSchoolId,
        role: validation.value.role,
        fullName: validation.value.full_name,
        email: loginIdentifier,
        phone: validation.value.phone,
        isActive: validation.value.is_active,
        createdAt,
        loginIdentifier,
        temporaryPassword,
        studentId: validation.value.role === "student" ? relatedRecordId : null,
        teacherId: validation.value.role === "teacher" ? relatedRecordId : null,
        student:
          validation.value.role === "student"
            ? {
                class_name: validation.value.student!.class_name,
                section: validation.value.student!.section,
                address: validation.value.student!.address,
                total_fee: validation.value.student!.total_fee,
                paid_fee: validation.value.student!.paid_fee,
                discount_value: validation.value.student!.discount_value,
              }
            : null,
        teacher:
          validation.value.role === "teacher"
            ? {
                specialization: getPrimaryTeacherSubjectName({
                  teacher: {
                    specialization: validation.value.teacher?.specialization ?? null,
                    assignments:
                      (validation.value.teacher?.assignments ?? []).map((assignment) => ({
                        subject_name: assignment.subject_name,
                      })) ?? [],
                  },
                }),
                notes: validation.value.teacher?.notes ?? null,
                assignments:
                  (validation.value.teacher?.assignments ?? []).map((assignment, index) => ({
                    id: `pending-${index}`,
                    subject_id: null,
                    subject_name: assignment.subject_name,
                    class_id: null,
                    class_name: assignment.class_name,
                    section_id: null,
                    section_name: assignment.section,
                    is_active: true,
                  })),
              }
            : null,
      });
    }

    try {
      accountCard = decoratedUser
        ? await buildManagedUserAccountCard(actorSupabase, decoratedUser, { temporaryPassword })
        : null;
    } catch {
      const firstTeacherAssignment = validation.value.teacher?.assignments?.[0] ?? null;
      accountCard = buildImmediateAccountCard({
        authUserId,
        role: validation.value.role,
        schoolName: schoolBrand.schoolName,
        schoolLogoUrl: schoolBrand.schoolLogoUrl,
        fullName: validation.value.full_name,
        className:
          validation.value.role === "student"
            ? validation.value.student!.class_name
            : firstTeacherAssignment?.class_name ?? "غير محدد",
        section:
          validation.value.role === "student"
            ? validation.value.student!.section
            : firstTeacherAssignment?.section ?? null,
        loginIdentifier,
        temporaryPassword,
      });
    }

    invalidateManagedUsersListCache(targetSchoolId);
    if (validation.value.role === "student") {
      invalidateSchoolCacheDomains(targetSchoolId, ["dashboard-overview", "payments-meta", "reports-overview"]);
    }

    return NextResponse.json(
      {
        ok: true,
        user: decoratedUser,
        accountCard,
      },
      { status: 201 },
    );
  } catch (error) {
    await cleanupCreatedUser({
      authUserId,
      actorSupabase,
      schoolId: targetSchoolId,
      role: validation.value.role,
      relatedRecordId,
      cleanupRelatedRecord,
    });

    return jsonError(
      error instanceof Error ? error.message : "تعذر إنشاء الحساب المطلوب.",
      500,
    );
  }
}
