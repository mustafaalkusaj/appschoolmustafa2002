import { NextRequest, NextResponse } from "next/server";

import { enrichAssignmentRows, enrichGradeRows } from "@/lib/academic-records-server";
import { isMissingTableError } from "@/lib/admin-infrastructure";
import type {
  ManagedAppAccountContext,
  ManagedAppStudentPreview,
  ManagedAppTeacherPreview,
} from "@/lib/managed-user-app-context";
import { buildManagedAppAccountContext } from "@/lib/managed-user-app-context";
import type { ManagedTeacherAssignmentRecord, ManagedUserRole } from "@/lib/managed-users";
import { tableHasColumn } from "@/lib/managed-users-server";
import {
  createRouteSupabaseClient,
  createServiceSupabaseClient,
  getRouteAuthenticatedUser,
} from "@/lib/supabase-server";

export type MobileFeatureGate = {
  available: boolean;
  code?: "missing_table" | "forbidden" | "unknown";
  message?: string;
};

export interface MobileListParams {
  page: number;
  limit: number;
  offset: number;
  search: string;
}

export interface MobileRouteContext {
  authUserId: string;
  role: ManagedUserRole;
  schoolId: string;
  account: ManagedAppAccountContext;
  serviceSupabase: ReturnType<typeof createServiceSupabaseClient>;
}

export interface MobileResourceResult<T> {
  gate: MobileFeatureGate;
  items: T[];
}

const AVAILABLE_GATE: MobileFeatureGate = { available: true };
const NOTIFICATION_SELECT = "id, user_id, school_id, type, title, message, is_read, link, metadata, created_at";
const PAYMENT_SELECT = [
  "id",
  "school_id",
  "branch_id",
  "student_id",
  "created_by",
  "amount",
  "receipt_number",
  "payment_method",
  "installment_id",
  "notes",
  "qr_code",
  "created_at",
  "manual_receipt_number",
].join(", ");
const ATTENDANCE_SELECT = "id, student_id, school_id, branch_id, attendance_date, status, note, created_at, updated_at";

function readErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallback;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: { message } }, { status });
}

function featureGateFromError(error: unknown, fallbackName: string): MobileFeatureGate {
  const message = readErrorMessage(error, `تعذر تحميل ${fallbackName}.`).toLowerCase();

  if (isMissingTableError(error, fallbackName) || message.includes("could not find the table")) {
    return {
      available: false,
      code: "missing_table",
      message: `البيانات المطلوبة (${fallbackName}) غير جاهزة بعد في Supabase.`,
    };
  }

  if (message.includes("permission") || message.includes("unauthorized") || message.includes("not allowed")) {
    return {
      available: false,
      code: "forbidden",
      message: `لا توجد صلاحية كافية للوصول إلى ${fallbackName}.`,
    };
  }

  return {
    available: false,
    code: "unknown",
    message: readErrorMessage(error, `تعذر تحميل ${fallbackName}.`),
  };
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getTimestamp(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

function sortRowsByDateDesc<T extends Record<string, unknown>>(items: T[], keys: string[]) {
  return [...items].sort((left, right) => {
    const leftTime = new Date(getTimestamp(left, keys) ?? 0).getTime();
    const rightTime = new Date(getTimestamp(right, keys) ?? 0).getTime();
    return rightTime - leftTime;
  });
}

function dedupeRowsById<T extends Record<string, unknown>>(items: T[]) {
  const map = new Map<string, T>();

  items.forEach((item) => {
    const id = normalizeText(item.id);
    if (id) {
      map.set(id, item);
    }
  });

  return Array.from(map.values());
}

function safeNumber(value: string | null, fallback: number) {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

async function applyModerationVisibilityScope(
  query: any,
  client: ReturnType<typeof createServiceSupabaseClient>,
  table: "notifications" | "assignments",
) {
  const [hasStatus, hasDeletedAt] = await Promise.all([
    tableHasColumn(client, table, "status").catch(() => false),
    tableHasColumn(client, table, "deleted_at").catch(() => false),
  ]);

  let nextQuery = query;
  if (hasStatus) {
    nextQuery = nextQuery.neq("status", "deleted_by_admin");
  }
  if (hasDeletedAt) {
    nextQuery = nextQuery.is("deleted_at", null);
  }
  return nextQuery;
}

export function parseMobileListParams(req: NextRequest, defaults?: { limit?: number; maxLimit?: number }): MobileListParams {
  const url = new URL(req.url);
  const limit = Math.min(
    safeNumber(url.searchParams.get("limit"), defaults?.limit ?? 20),
    defaults?.maxLimit ?? 100,
  );
  const page = safeNumber(url.searchParams.get("page"), 1);

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    search: normalizeText(url.searchParams.get("search")),
  };
}

export function paginateItems<T>(items: T[], params: Pick<MobileListParams, "page" | "limit" | "offset">) {
  return {
    items: items.slice(params.offset, params.offset + params.limit),
    page: params.page,
    limit: params.limit,
    total: items.length,
    has_more: params.offset + params.limit < items.length,
  };
}

export async function resolveMobileRouteContext(
  req: NextRequest,
  expectedRole?: ManagedUserRole,
): Promise<{ ok: true; value: MobileRouteContext } | { ok: false; response: NextResponse }> {
  try {
    const routeSupabase = await createRouteSupabaseClient();
    const authResult = await getRouteAuthenticatedUser(routeSupabase, req.headers.get("authorization"));

    if (authResult.error || !authResult.data.user?.id) {
      return { ok: false, response: jsonError("يجب تسجيل الدخول أولاً.", 401) };
    }

    const account = await buildManagedAppAccountContext(authResult.data.user.id);

    if (!account.identity.role || !account.access.allowed || !account.identity.school_id) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            ok: false,
            account,
            error: {
              message: account.access.message,
              reason: account.access.reason,
            },
          },
          { status: 403 },
        ),
      };
    }

    if (expectedRole && account.identity.role !== expectedRole) {
      return { ok: false, response: jsonError("هذا الحساب لا يملك صلاحية استخدام هذا المسار.", 403) };
    }

    return {
      ok: true,
      value: {
        authUserId: authResult.data.user.id,
        role: account.identity.role,
        schoolId: account.identity.school_id,
        account,
        serviceSupabase: createServiceSupabaseClient(),
      },
    };
  } catch (error) {
    return {
      ok: false,
      response: jsonError(readErrorMessage(error, "تعذر التحقق من جلسة تطبيق الموبايل."), 500),
    };
  }
}

export function buildMobileSessionPayload(account: ManagedAppAccountContext) {
  return {
    identity: account.identity,
    school: account.school,
    linkage: account.linkage,
    access: account.access,
    profile: account.profile,
    app_account: account.app_account,
    student: account.student
      ? {
          id: account.student.id,
          full_name: account.student.full_name,
          class_name: account.student.class_name,
          section: account.student.section,
          address: account.student.address,
          status: account.student.status,
          payment_summary: account.student.payment_summary,
          attendance_summary: account.student.attendance_summary,
          linked_teachers: account.student.linked_teachers,
        }
      : null,
    teacher: account.teacher
      ? {
          id: account.teacher.id,
          full_name: account.teacher.full_name,
          specialization: account.teacher.specialization,
          notes: account.teacher.notes,
          assignments: account.teacher.assignments,
          assigned_students_count: account.teacher.assigned_students.length,
        }
      : null,
  };
}

async function queryStudentNotificationsInternal(
  ctx: MobileRouteContext,
  params: MobileListParams,
) {
  let notificationsQuery = ctx.serviceSupabase
    .from("notifications")
    .select(NOTIFICATION_SELECT)
    .eq("user_id", ctx.authUserId)
    .eq("school_id", ctx.schoolId);

  notificationsQuery = await applyModerationVisibilityScope(notificationsQuery, ctx.serviceSupabase, "notifications");

  const response = await notificationsQuery
    .order("created_at", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (response.error) {
    return {
      gate: featureGateFromError(response.error, "notifications"),
      items: [] as Record<string, unknown>[],
      total: 0,
      unreadCount: 0,
    };
  }

  let unreadQuery = ctx.serviceSupabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.authUserId)
    .eq("school_id", ctx.schoolId)
    .eq("is_read", false);

  unreadQuery = await applyModerationVisibilityScope(unreadQuery, ctx.serviceSupabase, "notifications");

  const unreadResponse = await unreadQuery;

  return {
    gate: AVAILABLE_GATE,
    items: Array.isArray(response.data) ? (response.data as unknown as Record<string, unknown>[]) : [],
    total: response.data?.length ?? 0,
    unreadCount: typeof unreadResponse.count === "number" ? unreadResponse.count : 0,
  };
}

export async function queryStudentNotifications(
  ctx: MobileRouteContext,
  params: MobileListParams,
) {
  return queryStudentNotificationsInternal(ctx, params);
}

export async function queryStudentAssignments(
  ctx: MobileRouteContext,
  params: MobileListParams,
): Promise<MobileResourceResult<Record<string, unknown>>> {
  const student = ctx.account.student;

  if (!student?.id) {
    return { gate: AVAILABLE_GATE, items: [] };
  }

  const buildQueries = () => {
    const queries = [
      ctx.serviceSupabase.from("assignments").select("*").eq("student_id", student.id).eq("school_id", ctx.schoolId),
    ];

    if (student.class_name) {
      queries.push(
        ctx.serviceSupabase
          .from("assignments")
          .select("*")
          .eq("school_id", ctx.schoolId)
          .is("student_id", null)
          .eq("class_name", student.class_name)
          .is("section", null),
      );

      if (student.section) {
        queries.push(
          ctx.serviceSupabase
            .from("assignments")
            .select("*")
            .eq("school_id", ctx.schoolId)
            .is("student_id", null)
            .eq("class_name", student.class_name)
            .eq("section", student.section),
        );
      }
    }

    return queries.map(async (query) =>
      (await applyModerationVisibilityScope(query, ctx.serviceSupabase, "assignments"))
        .order("created_at", { ascending: false })
        .limit(Math.max(params.limit * 3, 60)),
    );
  };

  const results = await Promise.all(buildQueries());
  const failed = results.find((result) => result.error)?.error;

  if (failed) {
    return {
      gate: featureGateFromError(failed, "assignments"),
      items: [],
    };
  }

  const rows = dedupeRowsById(
    results.flatMap((result) =>
      Array.isArray(result.data) ? (result.data as unknown as Record<string, unknown>[]) : [],
    ),
  );

  return {
    gate: AVAILABLE_GATE,
    items: await enrichAssignmentRows(
      ctx.serviceSupabase,
      sortRowsByDateDesc(rows, ["due_at", "created_at"]).slice(params.offset, params.offset + params.limit),
    ),
  };
}

export async function queryStudentGrades(
  ctx: MobileRouteContext,
  params: MobileListParams,
): Promise<MobileResourceResult<Record<string, unknown>>> {
  const student = ctx.account.student;

  if (!student?.id) {
    return { gate: AVAILABLE_GATE, items: [] };
  }

  const { data, error } = await ctx.serviceSupabase
    .from("grades")
    .select("*")
    .eq("school_id", ctx.schoolId)
    .eq("student_id", student.id)
    .order("graded_at", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (error) {
    return {
      gate: featureGateFromError(error, "grades"),
      items: [],
    };
  }

  return {
    gate: AVAILABLE_GATE,
    items: await enrichGradeRows(
      ctx.serviceSupabase,
      Array.isArray(data) ? (data as unknown as Record<string, unknown>[]) : [],
    ),
  };
}

export async function queryStudentPayments(
  ctx: MobileRouteContext,
  params: MobileListParams,
): Promise<MobileResourceResult<Record<string, unknown>>> {
  const student = ctx.account.student;

  if (!student?.id) {
    return { gate: AVAILABLE_GATE, items: [] };
  }

  const paymentsHaveSchoolId = await tableHasColumn(ctx.serviceSupabase, "payments", "school_id");
  let query = ctx.serviceSupabase
    .from("payments")
    .select(PAYMENT_SELECT)
    .eq("student_id", student.id)
    .order("created_at", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (paymentsHaveSchoolId) {
    query = query.eq("school_id", ctx.schoolId);
  }

  const { data, error } = await query;

  if (error) {
    return {
      gate: featureGateFromError(error, "payments"),
      items: [],
    };
  }

  return {
    gate: AVAILABLE_GATE,
    items: Array.isArray(data) ? (data as unknown as Record<string, unknown>[]) : [],
  };
}

export async function queryStudentAttendance(
  ctx: MobileRouteContext,
  params: MobileListParams,
): Promise<MobileResourceResult<Record<string, unknown>>> {
  const student = ctx.account.student;

  if (!student?.id) {
    return { gate: AVAILABLE_GATE, items: [] };
  }

  const attendanceHasSchoolId = await tableHasColumn(ctx.serviceSupabase, "attendance_records", "school_id");
  let query = ctx.serviceSupabase
    .from("attendance_records")
    .select(ATTENDANCE_SELECT)
    .eq("student_id", student.id)
    .order("attendance_date", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (attendanceHasSchoolId) {
    query = query.eq("school_id", ctx.schoolId);
  }

  const { data, error } = await query;

  if (error) {
    return {
      gate: featureGateFromError(error, "attendance_records"),
      items: [],
    };
  }

  return {
    gate: AVAILABLE_GATE,
    items: Array.isArray(data) ? (data as unknown as Record<string, unknown>[]) : [],
  };
}

export async function queryTeacherAssignments(
  ctx: MobileRouteContext,
  params: MobileListParams,
): Promise<MobileResourceResult<Record<string, unknown>>> {
  const teacher = ctx.account.teacher;

  if (!teacher?.id) {
    return { gate: AVAILABLE_GATE, items: [] };
  }

  let query = ctx.serviceSupabase
    .from("assignments")
    .select("*")
    .eq("school_id", ctx.schoolId)
    .eq("teacher_id", teacher.id);

  query = await applyModerationVisibilityScope(query, ctx.serviceSupabase, "assignments");

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (error) {
    return {
      gate: featureGateFromError(error, "assignments"),
      items: [],
    };
  }

  return {
    gate: AVAILABLE_GATE,
    items: await enrichAssignmentRows(
      ctx.serviceSupabase,
      Array.isArray(data) ? (data as unknown as Record<string, unknown>[]) : [],
    ),
  };
}

export async function queryTeacherGrades(
  ctx: MobileRouteContext,
  params: MobileListParams,
): Promise<MobileResourceResult<Record<string, unknown>>> {
  const teacher = ctx.account.teacher;

  if (!teacher?.id) {
    return { gate: AVAILABLE_GATE, items: [] };
  }

  const { data, error } = await ctx.serviceSupabase
    .from("grades")
    .select("*")
    .eq("school_id", ctx.schoolId)
    .eq("teacher_id", teacher.id)
    .order("graded_at", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (error) {
    return {
      gate: featureGateFromError(error, "grades"),
      items: [],
    };
  }

  return {
    gate: AVAILABLE_GATE,
    items: await enrichGradeRows(
      ctx.serviceSupabase,
      Array.isArray(data) ? (data as unknown as Record<string, unknown>[]) : [],
    ),
  };
}

export async function queryTeacherNotifications(
  ctx: MobileRouteContext,
  params: MobileListParams,
): Promise<MobileResourceResult<Record<string, unknown>>> {
  const teacher = ctx.account.teacher;

  if (!teacher?.id) {
    return { gate: AVAILABLE_GATE, items: [] };
  }

  let query = ctx.serviceSupabase
    .from("notifications")
    .select(NOTIFICATION_SELECT)
    .eq("school_id", ctx.schoolId)
    .contains("metadata", { teacher_id: teacher.id });

  query = await applyModerationVisibilityScope(query, ctx.serviceSupabase, "notifications");

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (error) {
    return {
      gate: featureGateFromError(error, "notifications"),
      items: [],
    };
  }

  return {
    gate: AVAILABLE_GATE,
    items: Array.isArray(data) ? (data as unknown as Record<string, unknown>[]) : [],
  };
}

export async function queryTeacherStudents(
  ctx: MobileRouteContext,
  params: MobileListParams,
): Promise<{
  items: ManagedAppStudentPreview[];
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}> {
  const students = ctx.account.teacher?.assigned_students ?? [];
  const query = params.search.toLowerCase();
  const filtered = !query
    ? students
    : students.filter((student) =>
        [student.full_name, student.class_name, student.section]
          .map((value) => normalizeText(value).toLowerCase())
          .some((value) => value.includes(query)),
      );

  return paginateItems(filtered, params);
}

export function buildTeacherClassesPayload(account: ManagedAppAccountContext) {
  const assignments = account.teacher?.assignments ?? [];
  const subjects = Array.from(
    new Set(assignments.map((assignment) => normalizeText(assignment.subject_name)).filter(Boolean)),
  );

  return {
    assignments,
    subjects,
  };
}

export async function buildStudentDashboardPayload(ctx: MobileRouteContext) {
  const params = { page: 1, limit: 5, offset: 0, search: "" };
  const [notifications, assignments, grades] = await Promise.all([
    queryStudentNotificationsInternal(ctx, params),
    queryStudentAssignments(ctx, params),
    queryStudentGrades(ctx, params),
  ]);

  return {
    summary: {
      student_name: ctx.account.student?.full_name ?? ctx.account.profile.full_name,
      class_name: ctx.account.student?.class_name ?? null,
      section: ctx.account.student?.section ?? null,
      unread_notifications: notifications.unreadCount,
      notifications_count: notifications.total,
      assignments_count: assignments.items.length,
      grades_count: grades.items.length,
      payment_summary: ctx.account.student?.payment_summary ?? null,
      attendance_summary: ctx.account.student?.attendance_summary ?? null,
    },
    linked_teachers: ctx.account.student?.linked_teachers ?? ([] satisfies ManagedAppTeacherPreview[]),
    recent_notifications: notifications.items,
    recent_assignments: assignments.items,
    recent_grades: grades.items,
    gates: {
      notifications: notifications.gate,
      assignments: assignments.gate,
      grades: grades.gate,
    },
  };
}

export async function buildTeacherDashboardPayload(ctx: MobileRouteContext) {
  const params = { page: 1, limit: 5, offset: 0, search: "" };
  const [notifications, assignments, grades] = await Promise.all([
    queryTeacherNotifications(ctx, params),
    queryTeacherAssignments(ctx, params),
    queryTeacherGrades(ctx, params),
  ]);

  return {
    summary: {
      teacher_name: ctx.account.teacher?.full_name ?? ctx.account.profile.full_name,
      subject: ctx.account.teacher?.specialization ?? null,
      classes_count: ctx.account.teacher?.assignments.length ?? 0,
      students_count: ctx.account.teacher?.assigned_students.length ?? 0,
      notifications_count: notifications.items.length,
      assignments_count: assignments.items.length,
      grades_count: grades.items.length,
    },
    assignments: ctx.account.teacher?.assignments ?? ([] satisfies ManagedTeacherAssignmentRecord[]),
    assigned_students_preview: (ctx.account.teacher?.assigned_students ?? []).slice(0, 6),
    recent_notifications: notifications.items,
    recent_assignments: assignments.items,
    recent_grades: grades.items,
    gates: {
      notifications: notifications.gate,
      assignments: assignments.gate,
      grades: grades.gate,
    },
  };
}
