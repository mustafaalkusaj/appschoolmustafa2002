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
import { sendPushNotification } from "@/lib/push-notifications";
import {
  createRouteSupabaseClient,
  createServiceSupabaseClient,
  getRouteAuthenticatedUser,
} from "@/lib/supabase-server";
import { buildSchoolCacheTag, rememberWithTtl } from "@/lib/server-cache";

// Mobile session config/features change rarely but are read on every app
// launch. Cache them briefly (in-memory, per-process) and invalidate on the
// super-admin PUT routes so changes still apply near-instantly.
const MOBILE_CONFIG_TTL_MS = 60_000;

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

// ============================================================================
// MOBILE FEATURE FLAGS + APP CONFIG (Phase 4)
// ============================================================================

/** Canonical list of toggleable mobile features. Default = enabled. */
export const MOBILE_FEATURE_KEYS = [
  "exams",
  "messaging",
  "behavior",
  "assignments",
  "attendance",
  "grades",
  "calendar",
  "announcements",
] as const;

export type MobileFeatureKey = (typeof MOBILE_FEATURE_KEYS)[number];

/**
 * Resolve the enabled/disabled state of every mobile feature for a school.
 * Features default to enabled; a row in school_app_features can disable one.
 * Tolerates a missing table (returns all-enabled) so the mobile app never
 * breaks before the migration is applied.
 */
export async function getEnabledFeatures(
  schoolId: string,
): Promise<Record<MobileFeatureKey, boolean>> {
  const defaults = Object.fromEntries(
    MOBILE_FEATURE_KEYS.map((key) => [key, true]),
  ) as Record<MobileFeatureKey, boolean>;

  if (!schoolId) return defaults;

  return rememberWithTtl(
    `mobile-features:${schoolId}`,
    MOBILE_CONFIG_TTL_MS,
    async () => {
      try {
        const supabase = createServiceSupabaseClient();
        const { data, error } = await supabase
          .from("school_app_features")
          .select("feature_key, is_enabled")
          .eq("school_id", schoolId);

        if (error || !Array.isArray(data)) return defaults;

        for (const row of data as Array<{ feature_key: string; is_enabled: boolean }>) {
          if ((MOBILE_FEATURE_KEYS as readonly string[]).includes(row.feature_key)) {
            defaults[row.feature_key as MobileFeatureKey] = Boolean(row.is_enabled);
          }
        }
        return defaults;
      } catch {
        return defaults;
      }
    },
    { tags: [buildSchoolCacheTag(schoolId, "mobile-features")] },
  );
}

/**
 * Read an app_config value for a school, falling back to the global row
 * (school_id IS NULL) when no school-specific override exists.
 * Returns null on missing key/table.
 */
export async function getAppConfigValue(
  key: string,
  schoolId: string | null,
): Promise<Record<string, unknown> | null> {
  // Resolved value depends on both the per-school override AND the global
  // fallback row, so tag with both: any config PUT (global or school) clears it.
  const tags = [`app-config-global:${key}`];
  if (schoolId) tags.push(buildSchoolCacheTag(schoolId, "app-config"));

  return rememberWithTtl(
    `app-config:${key}:${schoolId ?? "global"}`,
    MOBILE_CONFIG_TTL_MS,
    async () => {
      try {
        const supabase = createServiceSupabaseClient();
        const { data, error } = await supabase
          .from("app_config")
          .select("school_id, value")
          .eq("key", key)
          .or(schoolId ? `school_id.eq.${schoolId},school_id.is.null` : "school_id.is.null");

        if (error || !Array.isArray(data) || data.length === 0) return null;

        const rows = data as Array<{ school_id: string | null; value: unknown }>;
        const scoped = rows.find((row) => row.school_id === schoolId);
        const chosen = scoped ?? rows.find((row) => row.school_id === null) ?? rows[0];
        return (chosen?.value && typeof chosen.value === "object"
          ? (chosen.value as Record<string, unknown>)
          : null);
      } catch {
        return null;
      }
    },
    { tags },
  );
}
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

type ModerationVisibilityScope = {
  hasStatus: boolean;
  hasDeletedAt: boolean;
};

const moderationVisibilityScopeCache = new Map<"notifications" | "assignments", Promise<ModerationVisibilityScope>>();

async function getModerationVisibilityScope(
  client: ReturnType<typeof createServiceSupabaseClient>,
  table: "notifications" | "assignments",
): Promise<ModerationVisibilityScope> {
  const cached = moderationVisibilityScopeCache.get(table);
  if (cached) return cached;

  const promise = Promise.all([
    tableHasColumn(client, table, "status").catch(() => false),
    tableHasColumn(client, table, "deleted_at").catch(() => false),
  ]).then(([hasStatus, hasDeletedAt]) => ({ hasStatus, hasDeletedAt }));

  moderationVisibilityScopeCache.set(table, promise);
  return promise;
}

type ModerationVisibilityQueryLike = {
  neq: (column: string, value: unknown) => ModerationVisibilityQueryLike;
  is: (column: string, value: unknown) => ModerationVisibilityQueryLike;
};

function applyModerationVisibilityScope<TQuery>(query: TQuery, scope: ModerationVisibilityScope): TQuery {
  let next = query as unknown as ModerationVisibilityQueryLike;
  if (scope.hasStatus) {
    next = next.neq("status", "deleted_by_admin");
  }
  if (scope.hasDeletedAt) {
    next = next.is("deleted_at", null);
  }
  return next as unknown as TQuery;
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
  const notificationsVisibility = await getModerationVisibilityScope(ctx.serviceSupabase, "notifications");
  let notificationsQuery = ctx.serviceSupabase
    .from("notifications")
    .select(NOTIFICATION_SELECT)
    .eq("user_id", ctx.authUserId)
    .eq("school_id", ctx.schoolId);

  notificationsQuery = applyModerationVisibilityScope(notificationsQuery, notificationsVisibility);

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

  unreadQuery = applyModerationVisibilityScope(unreadQuery, notificationsVisibility);

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

  const assignmentsVisibility = await getModerationVisibilityScope(ctx.serviceSupabase, "assignments");

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

    return queries.map(async (query) => {
      const scoped = applyModerationVisibilityScope(query, assignmentsVisibility);
      const response = await scoped
        .order("created_at", { ascending: false })
        .limit(Math.max(params.limit * 3, 60));

      const record = response as { data?: unknown; error?: unknown };
      return { data: record.data ?? null, error: record.error ?? null };
    });
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
    results.flatMap((result) => (Array.isArray(result.data) ? (result.data as Record<string, unknown>[]) : [])),
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
  if (!paymentsHaveSchoolId) {
    // Without a school_id column the query cannot be scoped to the student's
    // school, which would leak cross-tenant rows. Fail closed instead.
    return { gate: featureGateFromError(null, "payments"), items: [] };
  }

  const { data, error } = await ctx.serviceSupabase
    .from("payments")
    .select(PAYMENT_SELECT)
    .eq("student_id", student.id)
    .eq("school_id", ctx.schoolId)
    .order("created_at", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

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
  if (!attendanceHasSchoolId) {
    // Without a school_id column the query cannot be scoped to the student's
    // school, which would leak cross-tenant rows. Fail closed instead.
    return { gate: featureGateFromError(null, "attendance_records"), items: [] };
  }

  const { data, error } = await ctx.serviceSupabase
    .from("attendance_records")
    .select(ATTENDANCE_SELECT)
    .eq("student_id", student.id)
    .eq("school_id", ctx.schoolId)
    .order("attendance_date", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

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

  query = applyModerationVisibilityScope(query, await getModerationVisibilityScope(ctx.serviceSupabase, "assignments"));

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

  // Try new system first: school_notifications + notification_recipients
  const authUserId = ctx.authUserId;
  if (authUserId) {
    const { data: recipients, error: recipErr } = await ctx.serviceSupabase
      .from("notification_recipients")
      .select(`
        id,
        notification_id,
        is_read,
        read_at,
        created_at,
        school_notifications (
          id,
          title,
          body,
          category,
          priority,
          type,
          media_url,
          media_type,
          sent_by_user_id,
          created_at
        )
      `)
      .eq("user_id", authUserId)
      .order("created_at", { ascending: false })
      .range(params.offset, params.offset + params.limit - 1);

    if (!recipErr && recipients && recipients.length > 0) {
      const items = recipients.map((r: Record<string, unknown>) => {
        const notif = r.school_notifications as Record<string, unknown> | null;
        return {
          id: r.notification_id ?? r.id,
          title: notif?.title ?? "",
          body: notif?.body ?? "",
          category: notif?.category ?? "general",
          priority: notif?.priority ?? "normal",
          type: notif?.type ?? "insite",
          is_read: r.is_read ?? false,
          read_at: r.read_at ?? null,
          media_url: notif?.media_url ?? null,
          media_type: notif?.media_type ?? null,
          created_at: notif?.created_at ?? r.created_at,
        };
      });
      return { gate: AVAILABLE_GATE, items };
    }
  }

  // Fallback: legacy notifications table
  let query = ctx.serviceSupabase
    .from("notifications")
    .select(NOTIFICATION_SELECT)
    .eq("school_id", ctx.schoolId)
    .contains("metadata", { teacher_id: teacher.id });

  query = applyModerationVisibilityScope(query, await getModerationVisibilityScope(ctx.serviceSupabase, "notifications"));

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

// ============================================================================
// MOBILE FEATURE QUERIES (Phase 2 — close API gaps)
// All school-scoped, returning MobileResourceResult for the { ok, gate, items }
// envelope. Each tolerates a missing table via featureGateFromError.
// ============================================================================

export async function queryMobileSubjects(
  ctx: MobileRouteContext,
  params: MobileListParams,
): Promise<MobileResourceResult<Record<string, unknown>>> {
  let query = ctx.serviceSupabase
    .from("subjects")
    .select("id, school_id, name, is_active, created_at")
    .eq("school_id", ctx.schoolId)
    .eq("is_active", true)
    .order("name", { ascending: true })
    .range(params.offset, params.offset + params.limit - 1);

  if (params.search) {
    query = query.ilike("name", `%${params.search}%`);
  }

  const { data, error } = await query;
  if (error) {
    return { gate: featureGateFromError(error, "subjects"), items: [] };
  }

  return {
    gate: AVAILABLE_GATE,
    items: Array.isArray(data) ? (data as unknown as Record<string, unknown>[]) : [],
  };
}

export async function queryMobileQuestions(
  ctx: MobileRouteContext,
  params: MobileListParams,
  filters: { subject?: string; difficulty?: string; type?: string },
): Promise<MobileResourceResult<Record<string, unknown>>> {
  let query = ctx.serviceSupabase
    .from("questions")
    .select("id, school_id, subject, unit, difficulty, type, prompt, options, answer, created_by, created_at")
    .eq("school_id", ctx.schoolId)
    .order("created_at", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (filters.subject) query = query.eq("subject", filters.subject);
  if (filters.difficulty) query = query.eq("difficulty", filters.difficulty);
  if (filters.type) query = query.eq("type", filters.type);
  if (params.search) query = query.ilike("prompt", `%${params.search}%`);

  const { data, error } = await query;
  if (error) {
    return { gate: featureGateFromError(error, "questions"), items: [] };
  }

  return {
    gate: AVAILABLE_GATE,
    items: Array.isArray(data) ? (data as unknown as Record<string, unknown>[]) : [],
  };
}

export async function queryMobileExams(
  ctx: MobileRouteContext,
  params: MobileListParams,
): Promise<MobileResourceResult<Record<string, unknown>>> {
  const { data, error } = await ctx.serviceSupabase
    .from("exams")
    .select("id, school_id, title, type, subject, class_name, total_marks, starts_at, ends_at, created_by, created_at")
    .eq("school_id", ctx.schoolId)
    .order("starts_at", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (error) {
    return { gate: featureGateFromError(error, "exams"), items: [] };
  }

  return {
    gate: AVAILABLE_GATE,
    items: Array.isArray(data) ? (data as unknown as Record<string, unknown>[]) : [],
  };
}

export async function queryMobileBehaviorLogs(
  ctx: MobileRouteContext,
  params: MobileListParams,
  filters: { studentId?: string },
): Promise<MobileResourceResult<Record<string, unknown>>> {
  // behavior_logs has no roster column, so school_id alone lets a teacher read
  // ANY student's records in the school (IDOR). Constrain to the teacher's own
  // assigned roster. For non-teacher callers (e.g. admin) assigned_students is
  // empty/undefined, so this scoping does not apply.
  const rosterIds = Array.from(
    new Set(
      (ctx.account.teacher?.assigned_students ?? [])
        .map((student) => normalizeText(student.student_id))
        .filter(Boolean),
    ),
  );
  const isTeacher = ctx.account.teacher != null;

  // A teacher requesting a specific student must own them in their roster.
  if (isTeacher && filters.studentId && !rosterIds.includes(filters.studentId)) {
    return { gate: AVAILABLE_GATE, items: [] };
  }

  let query = ctx.serviceSupabase
    .from("behavior_logs")
    .select("id, school_id, student_id, student_name, behavior_type, points, note, created_at")
    .eq("school_id", ctx.schoolId)
    .order("created_at", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (filters.studentId) {
    query = query.eq("student_id", filters.studentId);
  } else if (isTeacher) {
    // No specific student: a teacher only sees their own roster's records.
    if (rosterIds.length === 0) {
      return { gate: AVAILABLE_GATE, items: [] };
    }
    query = query.in("student_id", rosterIds);
  }

  const { data, error } = await query;
  if (error) {
    return { gate: featureGateFromError(error, "behavior_logs"), items: [] };
  }

  return {
    gate: AVAILABLE_GATE,
    items: Array.isArray(data) ? (data as unknown as Record<string, unknown>[]) : [],
  };
}

// Whitelist for values interpolated into PostgREST `.or()` filters. Allows
// Latin/Arabic letters, digits, spaces, dash and underscore only — this blocks
// the comma / parenthesis / dot characters PostgREST uses as filter syntax,
// preventing filter injection via raw user input.
const SAFE_OR_FILTER_VALUE = /^[\w؀-ۿݐ-ݿ -]+$/;

function safeOrFilterValue(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed && SAFE_OR_FILTER_VALUE.test(trimmed) ? trimmed : null;
}

export async function queryMobileCalendarEvents(
  ctx: MobileRouteContext,
  params: MobileListParams,
  filters: { from?: string; to?: string; targetClass?: string; targetSection?: string },
): Promise<MobileResourceResult<Record<string, unknown>>> {
  let query = ctx.serviceSupabase
    .from("calendar_events")
    .select(
      "id, school_id, branch_id, title, title_en, date, end_date, type, hijri_date, description, color, is_recurring, is_global, target_class, target_section, created_by, created_at",
    )
    .or(`school_id.eq.${ctx.schoolId},is_global.eq.true`)
    .order("date", { ascending: true })
    .range(params.offset, params.offset + params.limit - 1);

  if (filters.from) query = query.gte("date", filters.from);
  if (filters.to) query = query.lte("date", filters.to);

  const safeTargetClass = safeOrFilterValue(filters.targetClass);
  if (safeTargetClass) query = query.or(`target_class.is.null,target_class.eq.${safeTargetClass}`);

  const safeTargetSection = safeOrFilterValue(filters.targetSection);
  if (safeTargetSection) query = query.or(`target_section.is.null,target_section.eq.${safeTargetSection}`);

  const { data, error } = await query;
  if (error) {
    return { gate: featureGateFromError(error, "calendar_events"), items: [] };
  }

  return {
    gate: AVAILABLE_GATE,
    items: Array.isArray(data) ? (data as unknown as Record<string, unknown>[]) : [],
  };
}

export async function queryMobileAnnouncements(
  ctx: MobileRouteContext,
  params: MobileListParams,
): Promise<MobileResourceResult<Record<string, unknown>>> {
  const { data, error } = await ctx.serviceSupabase
    .from("announcements")
    .select("id, school_id, author_id, author_name, title, body, kind, link_url, audience, is_active, created_at")
    .eq("school_id", ctx.schoolId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (error) {
    return { gate: featureGateFromError(error, "announcements"), items: [] };
  }

  return {
    gate: AVAILABLE_GATE,
    items: Array.isArray(data) ? (data as unknown as Record<string, unknown>[]) : [],
  };
}

export async function queryMobileConversations(
  ctx: MobileRouteContext,
  params: MobileListParams,
): Promise<MobileResourceResult<Record<string, unknown>>> {
  const participantResponse = await ctx.serviceSupabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", ctx.authUserId);

  if (participantResponse.error) {
    return { gate: featureGateFromError(participantResponse.error, "conversation_participants"), items: [] };
  }

  const conversationIds = Array.from(
    new Set(
      (participantResponse.data ?? [])
        .map((row) => normalizeText((row as Record<string, unknown>).conversation_id))
        .filter(Boolean),
    ),
  );

  if (conversationIds.length === 0) {
    return { gate: AVAILABLE_GATE, items: [] };
  }

  const { data, error } = await ctx.serviceSupabase
    .from("conversations")
    .select("id, school_id, title, created_at")
    .in("id", conversationIds)
    .eq("school_id", ctx.schoolId)
    .order("created_at", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (error) {
    return { gate: featureGateFromError(error, "conversations"), items: [] };
  }

  const conversations = Array.isArray(data) ? (data as unknown as Record<string, unknown>[]) : [];

  const withLastMessage = await Promise.all(
    conversations.map(async (conversation) => {
      const conversationId = normalizeText(conversation.id);
      if (!conversationId) return { ...conversation, last_message: null };

      const lastMessage = await ctx.serviceSupabase
        .from("messages")
        .select("id, conversation_id, sender_id, body, created_at, read_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return { ...conversation, last_message: lastMessage.data ?? null };
    }),
  );

  return { gate: AVAILABLE_GATE, items: withLastMessage };
}

// ============================================================================
// MOBILE WRITE MUTATIONS (Phase 3 — mobile can write, not only read)
// All school-scoped, role-checked at the route layer. Each validates input,
// inserts via the service supabase client, and returns { ok, data }-style
// payloads. Notifications are fired additively and never block the write.
// ============================================================================

export interface MobileMutationResult<T = Record<string, unknown>> {
  ok: boolean;
  gate: MobileFeatureGate;
  message?: string;
  data?: T;
}

/** Verify a student belongs to the current school; returns the row or null. */
async function loadScopedStudent(
  ctx: MobileRouteContext,
  studentId: string,
): Promise<{ id: string; branch_id: string | null; full_name: string; status: string } | null> {
  const { data, error } = await ctx.serviceSupabase
    .from("students")
    .select("id, branch_id, full_name, status")
    .eq("id", studentId)
    .eq("school_id", ctx.schoolId)
    .maybeSingle();
  if (error || !data) return null;
  return data as { id: string; branch_id: string | null; full_name: string; status: string };
}

/**
 * Record attendance for a single student (teacher surface).
 * Upserts on (school_id, student_id, attendance_date). Fires notifyAbsence
 * when the recorded status is absent/late.
 */
export async function recordTeacherAttendance(
  ctx: MobileRouteContext,
  input: {
    student_id?: unknown;
    status?: unknown;
    attendance_date?: unknown;
    note?: unknown;
  },
): Promise<MobileMutationResult> {
  const studentId = normalizeText(input.student_id);
  const status = normalizeText(input.status);
  const validStatuses = ["present", "absent", "late", "excused"];

  if (!studentId) {
    return { ok: false, gate: AVAILABLE_GATE, message: "اختر طالبًا أولاً." };
  }
  if (!validStatuses.includes(status)) {
    return { ok: false, gate: AVAILABLE_GATE, message: "حالة الحضور غير صحيحة." };
  }

  const student = await loadScopedStudent(ctx, studentId);
  if (!student) {
    return { ok: false, gate: AVAILABLE_GATE, message: "الطالب المحدد غير موجود داخل المدرسة." };
  }

  const rawDate = normalizeText(input.attendance_date);
  const attendanceDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
    ? rawDate
    : new Date().toISOString().slice(0, 10);
  const note = normalizeText(input.note) || null;

  const { data, error } = await ctx.serviceSupabase
    .from("attendance_records")
    .upsert(
      {
        school_id: ctx.schoolId,
        branch_id: student.branch_id,
        student_id: studentId,
        attendance_date: attendanceDate,
        status,
        note,
      },
      { onConflict: "school_id,student_id,attendance_date" },
    )
    .select("id, student_id, attendance_date, status, note")
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      gate: featureGateFromError(error, "attendance_records"),
      message: readErrorMessage(error, "تعذر حفظ سجل الحضور."),
    };
  }

  if (status === "absent" || status === "late") {
    try {
      const { notifyAbsence } = await import("@/lib/notify-events");
      await notifyAbsence({
        supabase: ctx.serviceSupabase,
        schoolId: ctx.schoolId,
        branchId: student.branch_id,
        studentId,
        attendanceDate,
        status,
      });
    } catch {
      // notification failure must never break attendance write
    }
  }

  return {
    ok: true,
    gate: AVAILABLE_GATE,
    message: "تم حفظ سجل الحضور.",
    data: (data ?? undefined) as Record<string, unknown> | undefined,
  };
}

/**
 * Teacher-initiated broadcast to their own assigned students. Replaces the
 * previous mobile path that POSTed per-recipient to the admin-only
 * /api/web/notifications/send (always 403 for teachers, and per-recipient
 * fan-out tripped the 5/min limit). Recipients are resolved + scoped entirely
 * server-side from the teacher's assigned roster, then delivered in one call.
 */
export async function sendTeacherBroadcast(
  ctx: MobileRouteContext,
  input: {
    title?: unknown;
    message?: unknown;
    class_name?: unknown;
    section?: unknown;
    student_id?: unknown;
    type?: unknown;
  },
): Promise<MobileMutationResult> {
  const title = normalizeText(input.title);
  const message = normalizeText(input.message);
  if (!title || !message) {
    return { ok: false, gate: AVAILABLE_GATE, message: "عنوان الإشعار ومحتواه مطلوبان." };
  }

  const teacher = ctx.account.teacher;
  if (!teacher) {
    return { ok: false, gate: AVAILABLE_GATE, message: "تعذر تحديد بيانات المعلم." };
  }

  const targetStudentId = normalizeText(input.student_id);
  const targetClass = normalizeText(input.class_name).toLowerCase();
  const targetSection = normalizeText(input.section).toLowerCase();

  // assigned_students is already the authoritative, branch-scoped roster.
  const recipients = teacher.assigned_students.filter((student) => {
    if (targetStudentId) return student.student_id === targetStudentId;
    if (targetClass && normalizeText(student.class_name).toLowerCase() !== targetClass) return false;
    if (targetSection && normalizeText(student.section).toLowerCase() !== targetSection) return false;
    return true;
  });

  const userIds = recipients
    .map((student) => student.auth_user_id)
    .filter((id): id is string => Boolean(id && id.trim()));

  if (userIds.length === 0) {
    return {
      ok: false,
      gate: AVAILABLE_GATE,
      message: "لا توجد حسابات طلاب مرتبطة بالشعب المحددة أو أن الطلاب غير مرتبطين بحسابات دخول.",
    };
  }

  const result = await sendPushNotification(ctx.serviceSupabase, {
    schoolId: ctx.schoolId,
    // The mobile account context carries no branch on identity; recipients are
    // already explicitly resolved from the teacher's roster, so branch is only
    // metadata here — leave it null.
    branchId: null,
    userIds,
    type: normalizeText(input.type) || "teacher_broadcast",
    title,
    message,
    metadata: { teacher_id: teacher.id },
  });

  return {
    ok: true,
    gate: AVAILABLE_GATE,
    message: `تم إرسال ${result.targeted} إشعار.`,
    data: {
      targeted: result.targeted,
      sent: result.sent,
      failed: result.failed,
      in_app_saved: result.inAppSaved,
    },
  };
}

/** Create a behavior log entry (teacher surface). */
export async function createBehaviorLog(
  ctx: MobileRouteContext,
  input: {
    student_id?: unknown;
    student_name?: unknown;
    behavior_type?: unknown;
    points?: unknown;
    note?: unknown;
  },
): Promise<MobileMutationResult> {
  const behaviorType = normalizeText(input.behavior_type);
  if (!behaviorType) {
    return { ok: false, gate: AVAILABLE_GATE, message: "نوع السلوك مطلوب." };
  }

  const studentId = normalizeText(input.student_id) || null;
  let studentName = normalizeText(input.student_name);

  if (studentId) {
    const student = await loadScopedStudent(ctx, studentId);
    if (!student) {
      return { ok: false, gate: AVAILABLE_GATE, message: "الطالب المحدد غير موجود داخل المدرسة." };
    }
    if (!studentName) studentName = student.full_name;
  }

  if (!studentName) {
    return { ok: false, gate: AVAILABLE_GATE, message: "اسم الطالب مطلوب." };
  }

  const parsedPoints = Number(
    typeof input.points === "number" || typeof input.points === "string" ? input.points : NaN,
  );
  const pointsValue = Number.isFinite(parsedPoints) ? Math.trunc(parsedPoints) : 0;
  const note = normalizeText(input.note) || null;

  const { data, error } = await ctx.serviceSupabase
    .from("behavior_logs")
    .insert({
      school_id: ctx.schoolId,
      student_id: studentId,
      student_name: studentName,
      behavior_type: behaviorType,
      points: pointsValue,
      note,
    })
    .select("id, school_id, student_id, student_name, behavior_type, points, note, created_at")
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      gate: featureGateFromError(error, "behavior_logs"),
      message: readErrorMessage(error, "تعذر حفظ سجل السلوك."),
    };
  }

  return {
    ok: true,
    gate: AVAILABLE_GATE,
    message: "تم حفظ سجل السلوك.",
    data: (data ?? undefined) as Record<string, unknown> | undefined,
  };
}

/**
 * Send a message in a conversation (any authenticated role).
 * The sender must be a participant of the conversation and the
 * conversation must belong to the caller's school.
 */
export async function sendConversationMessage(
  ctx: MobileRouteContext,
  input: { conversation_id?: unknown; body?: unknown },
): Promise<MobileMutationResult> {
  const conversationId = normalizeText(input.conversation_id);
  const body = normalizeText(input.body);

  if (!conversationId) {
    return { ok: false, gate: AVAILABLE_GATE, message: "المحادثة غير محددة." };
  }
  if (!body) {
    return { ok: false, gate: AVAILABLE_GATE, message: "نص الرسالة مطلوب." };
  }

  const MESSAGE_MAX_LENGTH = 5000;
  if (body.length > MESSAGE_MAX_LENGTH) {
    return {
      ok: false,
      gate: AVAILABLE_GATE,
      message: `نص الرسالة يتجاوز الحد الأقصى المسموح (${MESSAGE_MAX_LENGTH} حرف).`,
    };
  }

  // Conversation must belong to the caller's school.
  const conversation = await ctx.serviceSupabase
    .from("conversations")
    .select("id, school_id")
    .eq("id", conversationId)
    .eq("school_id", ctx.schoolId)
    .maybeSingle();

  if (conversation.error) {
    return {
      ok: false,
      gate: featureGateFromError(conversation.error, "conversations"),
      message: readErrorMessage(conversation.error, "تعذر التحقق من المحادثة."),
    };
  }
  if (!conversation.data) {
    return { ok: false, gate: AVAILABLE_GATE, message: "المحادثة غير موجودة داخل المدرسة." };
  }

  // Sender must be a participant.
  const participant = await ctx.serviceSupabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", ctx.authUserId)
    .maybeSingle();

  if (participant.error) {
    return {
      ok: false,
      gate: featureGateFromError(participant.error, "conversation_participants"),
      message: readErrorMessage(participant.error, "تعذر التحقق من المشاركة في المحادثة."),
    };
  }
  if (!participant.data) {
    return { ok: false, gate: AVAILABLE_GATE, message: "لا تملك صلاحية المراسلة في هذه المحادثة." };
  }

  const { data, error } = await ctx.serviceSupabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: ctx.authUserId,
      body,
    })
    .select("id, conversation_id, sender_id, body, created_at, read_at")
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      gate: featureGateFromError(error, "messages"),
      message: readErrorMessage(error, "تعذر إرسال الرسالة."),
    };
  }

  return {
    ok: true,
    gate: AVAILABLE_GATE,
    message: "تم إرسال الرسالة.",
    data: (data ?? undefined) as Record<string, unknown> | undefined,
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
