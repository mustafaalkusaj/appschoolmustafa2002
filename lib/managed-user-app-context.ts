import { isMissingTableError } from "@/lib/admin-infrastructure";
import type {
  ManagedTeacherAssignmentRecord,
  ManagedUserAppAccountSummary,
  ManagedUserRole,
  ManagedUserRecord,
} from "@/lib/managed-users";
import {
  fetchManagedAccountSchoolBrand,
  fetchTeacherAssignments,
  findMatchingTeacherIdsForStudent,
  getTeacherTableCapabilities,
  resolveManagedAccountBase,
  tableHasColumn,
} from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

export type ManagedAppAccessReason =
  | "ok"
  | "not_managed_account"
  | "missing_school_scope"
  | "inactive_account"
  | "missing_linked_record"
  | "inactive_linked_record";

export interface ManagedAppAccessState {
  allowed: boolean;
  reason: ManagedAppAccessReason;
  message: string;
}

export interface ManagedAppTeacherPreview {
  teacher_id: string;
  auth_user_id: string | null;
  full_name: string;
  subject: string | null;
  class_name: string | null;
  section: string | null;
}

export interface ManagedAppStudentPreview {
  student_id: string;
  auth_user_id: string | null;
  full_name: string;
  class_name: string | null;
  section: string | null;
  status: string | null;
}

export interface ManagedStudentAppData {
  id: string;
  full_name: string | null;
  class_name: string | null;
  section: string | null;
  address: string | null;
  status: string | null;
  payment_summary: {
    total_fee: number;
    paid_fee: number;
    discount_value: number;
    remaining_fee: number;
    payment_count: number;
    recorded_payments_total: number;
    last_payment_at: string | null;
  };
  attendance_summary: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    total_records: number;
    attendance_rate: number | null;
    last_attendance_at: string | null;
  };
  linked_teachers: ManagedAppTeacherPreview[];
}

export interface ManagedTeacherAppData {
  id: string;
  full_name: string | null;
  specialization: string | null;
  notes: string | null;
  assignments: ManagedTeacherAssignmentRecord[];
  assigned_students: ManagedAppStudentPreview[];
}

export interface ManagedAppAccountContext {
  identity: {
    auth_user_id: string;
    role: ManagedUserRole | null;
    school_id: string | null;
    login_identifier: string | null;
    is_active: boolean;
  };
  school: {
    id: string | null;
    name: string | null;
    logo_url: string | null;
    primary_color: string | null;
    secondary_color: string | null;
    theme_preset: string | null;
  };
  linkage: {
    managed_profile_exists: boolean;
    linked_record_type: ManagedUserRole | null;
    linked_record_id: string | null;
    linked_record_status: "ok" | "missing";
  };
  access: ManagedAppAccessState;
  profile: {
    full_name: string;
    email: string;
    phone: string | null;
    created_at: string | null;
    updated_at: string | null;
  };
  app_account: ManagedUserAppAccountSummary | null;
  student: ManagedStudentAppData | null;
  teacher: ManagedTeacherAppData | null;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value: unknown) {
  const normalized = normalizeText(value);
  return normalized || null;
}

const columnAvailabilityCache = new Map<string, Promise<boolean>>();
const STUDENT_PREVIEW_SELECT = "id, auth_user_id, full_name, class_name, section, status";
const ATTENDANCE_STATUSES = ["present", "absent", "late", "excused"] as const;

function studentStatusAllowsApp(status: string | null | undefined) {
  const normalized = normalizeText(status).toLowerCase();
  return !normalized || normalized === "active";
}

function buildAccessState(input: {
  role: ManagedUserRole | null;
  schoolId: string | null;
  user: ManagedUserRecord | null;
  authUserIsActive: boolean;
}): ManagedAppAccessState {
  if (!input.role) {
    return {
      allowed: false,
      reason: "not_managed_account",
      message: "الحساب الحالي ليس حساب طالب أو مدرس جاهزاً للتطبيق.",
    };
  }

  if (!input.schoolId) {
    return {
      allowed: false,
      reason: "missing_school_scope",
      message: "لا يوجد نطاق مدرسة صالح لهذا الحساب.",
    };
  }

  if (!input.authUserIsActive || input.user?.is_active === false) {
    return {
      allowed: false,
      reason: "inactive_account",
      message: "حساب التطبيق الحالي غير نشط.",
    };
  }

  if (!input.user) {
    return {
      allowed: false,
      reason: "missing_linked_record",
      message: "تعذر العثور على ملف الحساب أو السجل المرتبط بهذا المستخدم.",
    };
  }

  if (input.role === "student") {
    if (!input.user.student?.id) {
      return {
        allowed: false,
        reason: "missing_linked_record",
        message: "حساب الطالب لا يملك سجل طالب مرتبطاً بشكل صالح.",
      };
    }

    if (!studentStatusAllowsApp(input.user.student.status)) {
      return {
        allowed: false,
        reason: "inactive_linked_record",
        message: "سجل الطالب الحالي غير صالح للدخول إلى التطبيق.",
      };
    }
  }

  if (input.role === "teacher") {
    if (!input.user.teacher?.id) {
      return {
        allowed: false,
        reason: "missing_linked_record",
        message: "حساب المدرس لا يملك سجل مدرس مرتبطاً بشكل صالح.",
      };
    }

    if (input.user.teacher.is_active === false) {
      return {
        allowed: false,
        reason: "inactive_linked_record",
        message: "سجل المدرس الحالي غير نشط.",
      };
    }
  }

  return {
    allowed: true,
    reason: "ok",
    message: "الحساب جاهز للاستخدام من التطبيق.",
  };
}

async function queryHasColumn(table: string, column: string) {
  const cacheKey = `${table}:${column}`;
  const cached = columnAvailabilityCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const probe = (async () => {
    const serviceSupabase = createServiceSupabaseClient();

    try {
      return await tableHasColumn(serviceSupabase, table, column);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string" &&
        (error.message.toLowerCase().includes("could not find") ||
          isMissingTableError(error as { message: string }, table))
      ) {
        return false;
      }

      throw error;
    }
  })();

  columnAvailabilityCache.set(cacheKey, probe);
  return probe;
}

import { calculateStudentRemainingFee } from "@/lib/students/financials";

async function fetchStudentPaymentSummary(user: ManagedUserRecord) {
  const totalFee = user.student?.total_fee ?? 0;
  const paidFee = user.student?.paid_fee ?? 0;
  const discountValue = user.student?.discount_value ?? 0;
  const fallback = {
    total_fee: totalFee,
    paid_fee: paidFee,
    discount_value: discountValue,
    remaining_fee: calculateStudentRemainingFee({
      total_fee: totalFee,
      paid_fee: paidFee,
      discount_value: discountValue,
    }),
    payment_count: 0,
    recorded_payments_total: paidFee,
    last_payment_at: null,
  };

  if (!user.student?.id) {
    return fallback;
  }

  const serviceSupabase = createServiceSupabaseClient();
  const paymentsHaveSchoolId = await queryHasColumn("payments", "school_id");
  const buildPaymentCountQuery = () => {
    let query = serviceSupabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("student_id", user.student!.id);
    if (paymentsHaveSchoolId) {
      query = query.eq("school_id", user.school_id);
    }
    return query;
  };

  const buildLatestPaymentQuery = () => {
    let query = serviceSupabase
      .from("payments")
      .select("created_at")
      .eq("student_id", user.student!.id);
    if (paymentsHaveSchoolId) {
      query = query.eq("school_id", user.school_id);
    }
    return query.order("created_at", { ascending: false }).limit(1);
  };

  const [{ count, error: countError }, { data: latestRows, error: latestError }] = await Promise.all([
    buildPaymentCountQuery(),
    buildLatestPaymentQuery(),
  ]);

  const paymentError = countError ?? latestError;
  if (paymentError) {
    if (isMissingTableError(paymentError, "payments") || paymentError.message.toLowerCase().includes("could not find")) {
      return fallback;
    }

    throw paymentError;
  }

  return {
    ...fallback,
    payment_count: typeof count === "number" ? count : 0,
    recorded_payments_total: fallback.recorded_payments_total,
    last_payment_at: typeof latestRows?.[0]?.created_at === "string" ? latestRows[0].created_at : null,
  };
}

async function fetchStudentAttendanceSummary(user: ManagedUserRecord) {
  const fallback = {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    total_records: 0,
    attendance_rate: null,
    last_attendance_at: null,
  };

  if (!user.student?.id) {
    return fallback;
  }

  const serviceSupabase = createServiceSupabaseClient();
  const attendanceHasSchoolId = await queryHasColumn("attendance_records", "school_id");

  const buildAttendanceCountQuery = (status?: (typeof ATTENDANCE_STATUSES)[number]) => {
    let query = serviceSupabase
      .from("attendance_records")
      .select("id", { count: "exact", head: true })
      .eq("student_id", user.student!.id);
    if (attendanceHasSchoolId) {
      query = query.eq("school_id", user.school_id);
    }
    if (status) {
      query = query.ilike("status", status);
    }
    return query;
  };

  const buildLatestAttendanceQuery = () => {
    let query = serviceSupabase
      .from("attendance_records")
      .select("attendance_date")
      .eq("student_id", user.student!.id);
    if (attendanceHasSchoolId) {
      query = query.eq("school_id", user.school_id);
    }
    return query.order("attendance_date", { ascending: false }).limit(1);
  };

  const attendanceResponses = await Promise.all([
    buildAttendanceCountQuery(),
    buildLatestAttendanceQuery(),
    ...ATTENDANCE_STATUSES.map((status) => buildAttendanceCountQuery(status)),
  ]);

  const [totalResponse, latestResponse, ...statusResponses] = attendanceResponses;
  const attendanceError = [totalResponse.error, latestResponse.error, ...statusResponses.map((response) => response.error)].find(Boolean);

  if (attendanceError) {
    if (
      isMissingTableError(attendanceError, "attendance_records") ||
      attendanceError.message.toLowerCase().includes("could not find")
    ) {
      return fallback;
    }

    throw attendanceError;
  }

  const counts = ATTENDANCE_STATUSES.reduce<{
    present: number;
    absent: number;
    late: number;
    excused: number;
  }>((summary, status, index) => {
    summary[status] = typeof statusResponses[index]?.count === "number" ? statusResponses[index].count : 0;
    return summary;
  }, {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
  });

  const totalRecords = typeof totalResponse.count === "number" ? totalResponse.count : 0;
  const attendanceRate =
    totalRecords > 0 ? Math.round((((counts.present + counts.late) / totalRecords) * 100) * 100) / 100 : null;

  return {
    ...counts,
    total_records: totalRecords,
    attendance_rate: attendanceRate,
    last_attendance_at:
      typeof latestResponse.data?.[0]?.attendance_date === "string" ? latestResponse.data[0].attendance_date : null,
  };
}

function mapTeacherPreview(
  teacher: Record<string, unknown>,
  assignments: ManagedTeacherAssignmentRecord[],
): ManagedAppTeacherPreview {
  const primaryAssignment = assignments.find((assignment) => assignment.is_active) ?? assignments[0] ?? null;
  const specialization =
    nullableText(teacher.specialization) ??
    nullableText(teacher.subject) ??
    primaryAssignment?.subject_name ??
    null;

  return {
    teacher_id: String(teacher.id),
    auth_user_id: nullableText(teacher.auth_user_id),
    full_name: normalizeText(teacher.full_name) || "مدرس بدون اسم",
    subject: specialization,
    class_name: primaryAssignment?.class_name ?? null,
    section: primaryAssignment?.section_name ?? null,
  };
}

async function fetchStudentLinkedTeachers(user: ManagedUserRecord) {
  if (!user.student?.id || !user.student.class_name) {
    return [] satisfies ManagedAppTeacherPreview[];
  }

  const serviceSupabase = createServiceSupabaseClient();
  let teacherIds: string[] = [];

  const { data: linkedRows, error: linksError } = await serviceSupabase
    .from("student_teacher_links")
    .select("teacher_id")
    .eq("school_id", user.school_id)
    .eq("student_id", user.student.id);

  if (linksError) {
    if (isMissingTableError(linksError, "student_teacher_links")) {
      teacherIds = await findMatchingTeacherIdsForStudent(serviceSupabase, {
        schoolId: user.school_id,
        className: user.student.class_name,
        section: user.student.section,
      });
    } else {
      throw linksError;
    }
  } else {
    teacherIds = Array.from(
      new Set(
        ((linkedRows ?? []) as Array<Record<string, unknown>>)
          .map((row) => nullableText(row.teacher_id))
          .filter((value): value is string => Boolean(value)),
      ),
    );
  }

  if (teacherIds.length === 0) {
    teacherIds = await findMatchingTeacherIdsForStudent(serviceSupabase, {
      schoolId: user.school_id,
      className: user.student.class_name,
      section: user.student.section,
    });
  }

  if (teacherIds.length === 0) {
    return [] satisfies ManagedAppTeacherPreview[];
  }

  const teacherCapabilities = await getTeacherTableCapabilities(serviceSupabase);
  const teacherSelect = [
    "id",
    "auth_user_id",
    "full_name",
    ...(teacherCapabilities.specialization ? ["specialization"] : []),
    ...(teacherCapabilities.subject ? ["subject"] : []),
  ].join(", ");

  const { data: teacherRows, error: teacherError } = await serviceSupabase
    .from("teachers")
    .select(teacherSelect)
    .eq("school_id", user.school_id)
    .in("id", teacherIds);

  if (teacherError) {
    throw teacherError;
  }

  const assignmentsByTeacherId = await fetchTeacherAssignments(serviceSupabase, teacherIds, {
    schoolId: user.school_id,
  });

  return ((teacherRows ?? []) as unknown as Array<Record<string, unknown>>)
    .map((teacher) => mapTeacherPreview(teacher, assignmentsByTeacherId.get(String(teacher.id)) ?? []))
    .sort((left, right) => left.full_name.localeCompare(right.full_name, "ar"));
}

function mapStudentPreview(student: Record<string, unknown>): ManagedAppStudentPreview {
  return {
    student_id: String(student.id),
    auth_user_id: nullableText(student.auth_user_id),
    full_name: normalizeText(student.full_name) || "طالب بدون اسم",
    class_name: nullableText(student.class_name),
    section: nullableText(student.section),
    status: nullableText(student.status),
  };
}

async function fetchTeacherAssignedStudents(user: ManagedUserRecord) {
  if (!user.teacher?.id) {
    return [] satisfies ManagedAppStudentPreview[];
  }

  const serviceSupabase = createServiceSupabaseClient();
  let studentIds: string[] = [];

  const { data: linkedRows, error: linksError } = await serviceSupabase
    .from("student_teacher_links")
    .select("student_id")
    .eq("school_id", user.school_id)
    .eq("teacher_id", user.teacher.id);

  if (linksError && !isMissingTableError(linksError, "student_teacher_links")) {
    throw linksError;
  }

  if (!linksError) {
    studentIds = Array.from(
      new Set(
        ((linkedRows ?? []) as Array<Record<string, unknown>>)
          .map((row) => nullableText(row.student_id))
          .filter((value): value is string => Boolean(value)),
      ),
    );
  }

  if (studentIds.length > 0) {
    const { data: linkedStudents, error: linkedStudentsError } = await serviceSupabase
      .from("students")
      .select(STUDENT_PREVIEW_SELECT)
      .eq("school_id", user.school_id)
      .in("id", studentIds);

    if (linkedStudentsError) {
      throw linkedStudentsError;
    }

    return ((linkedStudents ?? []) as Array<Record<string, unknown>>)
      .map(mapStudentPreview)
      .sort((left, right) => left.full_name.localeCompare(right.full_name, "ar"));
  }

  if ((user.teacher.assignments ?? []).length === 0) {
    return [] satisfies ManagedAppStudentPreview[];
  }

  const assignmentTargets = Array.from(
    new Map(
      (user.teacher.assignments ?? [])
        .filter((assignment) => Boolean(normalizeText(assignment.class_name)))
        .map((assignment) => [
          `${normalizeText(assignment.class_name).toLowerCase()}::${normalizeText(assignment.section_name).toLowerCase()}`,
          {
            className: assignment.class_name,
            section: assignment.section_name ?? null,
          },
        ]),
    ).values(),
  );

  const studentResponses = await Promise.all(
    assignmentTargets.map((target) => {
      let query = serviceSupabase
        .from("students")
        .select(STUDENT_PREVIEW_SELECT)
        .eq("school_id", user.school_id)
        .eq("class_name", target.className);

      if (target.section) {
        query = query.eq("section", target.section);
      }

      return query;
    }),
  );

  const uniqueStudents = new Map<string, Record<string, unknown>>();

  studentResponses.forEach((response) => {
    if (response.error) {
      throw response.error;
    }

    ((response.data ?? []) as Array<Record<string, unknown>>).forEach((student) => {
      if (student.id) {
        uniqueStudents.set(String(student.id), student);
      }
    });
  });

  return Array.from(uniqueStudents.values())
    .map(mapStudentPreview)
    .sort((left, right) => left.full_name.localeCompare(right.full_name, "ar"));
}

export async function buildManagedAppAccountContext(authUserId: string): Promise<ManagedAppAccountContext> {
  const resolvedAccount = await resolveManagedAccountBase(authUserId);
  const { authUser, schoolId, role, user } = resolvedAccount;
  const loginIdentifier = resolvedAccount.loginIdentifier;
  const schoolBrand =
    schoolId !== null ? await fetchManagedAccountSchoolBrand(createServiceSupabaseClient(), schoolId) : null;

  const access = buildAccessState({
    role,
    schoolId,
    user,
    authUserIsActive: resolvedAccount.authUserIsActive,
  });

  const student =
    role === "student" && user?.student
      ? {
          id: user.student.id,
          full_name: user.student.full_name,
          class_name: user.student.class_name,
          section: user.student.section,
          address: user.student.address,
          status: user.student.status,
          payment_summary: await fetchStudentPaymentSummary(user),
          attendance_summary: await fetchStudentAttendanceSummary(user),
          linked_teachers: await fetchStudentLinkedTeachers(user),
        }
      : null;

  const teacher =
    role === "teacher" && user?.teacher
      ? {
          id: user.teacher.id,
          full_name: user.teacher.full_name,
          specialization: user.teacher.specialization,
          notes: user.teacher.notes,
          assignments: user.teacher.assignments,
          assigned_students: await fetchTeacherAssignedStudents(user),
        }
      : null;

  return {
    identity: resolvedAccount.identity,
    school: {
      id: schoolId,
      name: schoolBrand?.schoolName ?? null,
      logo_url: schoolBrand?.schoolLogoUrl ?? null,
      primary_color: schoolBrand?.primaryColor ?? null,
      secondary_color: schoolBrand?.secondaryColor ?? null,
      theme_preset: schoolBrand?.themePreset ?? null,
    },
    linkage: resolvedAccount.linkage,
    access,
    profile: {
      full_name: (user?.full_name ?? normalizeText(authUser.user_metadata?.full_name)) || "حساب بدون اسم",
      email: user?.email ?? authUser.email ?? loginIdentifier ?? "",
      phone: user?.phone ?? nullableText(authUser.user_metadata?.phone),
      created_at: user?.created_at ?? (typeof authUser.created_at === "string" ? authUser.created_at : null),
      updated_at: user?.updated_at ?? null,
    },
    app_account: user?.app_account ?? (loginIdentifier
      ? {
          login_identifier: loginIdentifier,
          has_temporary_password: false,
          password_last_reset_at: null,
          card_last_printed_at: null,
        }
      : null),
    student,
    teacher,
  };
}
