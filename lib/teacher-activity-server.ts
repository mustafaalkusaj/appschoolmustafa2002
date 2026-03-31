import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isMissingTableError } from "@/lib/admin-infrastructure";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import type {
  FeeNotificationDetail,
  FeeNotificationHistoryItem,
  FeeNotificationInput,
  HomeworkDetail,
  HomeworkFilters,
  HomeworkListItem,
  MonitoringMetaOption,
  MonitoringMetaResponse,
  MonitoringStudentOption,
  TeacherActivityAuditEntry,
  TeacherActivityStatus,
  TeacherMessageDetail,
  TeacherMessageFilters,
  TeacherMessageListItem,
} from "@/lib/teacher-activity";
import type { Permission } from "@/types/roles";

type ServiceSupabaseClient = ReturnType<typeof createServiceSupabaseClient>;

type JsonRecord = Record<string, unknown>;
type BranchRow = { id: string; name: string | null };
type TeacherRow = { id: string; full_name: string | null };
type StudentRow = {
  id: string;
  full_name: string | null;
  class_name: string | null;
  section: string | null;
  branch_id: string | null;
  auth_user_id?: string | null;
};

type TeacherActivityScope = {
  actorSupabase: any;
  actorUserId: string;
  actorRole: "super_admin" | "admin";
  schoolId: string;
  schoolName: string | null;
  serviceSupabase: ServiceSupabaseClient;
  allowedBranchIds: string[] | null;
  availableBranches: MonitoringMetaOption[];
};

function asRecord(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown) {
  const normalized = asString(value);
  return normalized.length > 0 ? normalized : null;
}

function asNullableNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isStatusValue(value: string | null): value is TeacherActivityStatus {
  return value === "active" || value === "edited_by_admin" || value === "deleted_by_admin";
}

function buildSearchClause(fields: string[], search: string) {
  const normalized = asString(search);
  if (!normalized) return null;
  return fields.map((field) => `${field}.ilike.%${normalized}%`).join(",");
}

function normalizeTargets(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asRecord(item))
    .map(
      (item) =>
        ({
          user_id: asNullableString(item.user_id),
          student_id: asNullableString(item.student_id),
          student_name: asNullableString(item.student_name),
          class_name: asNullableString(item.class_name),
          section: asNullableString(item.section),
        }) satisfies TeacherMessageListItem["targets"][number],
    );
}

export function jsonError(message: string, status: number, fieldErrors?: Record<string, string | undefined>) {
  // Filter out undefined values so the serialised payload only contains actual errors
  const cleanErrors = fieldErrors
    ? (Object.fromEntries(
        Object.entries(fieldErrors).filter((e): e is [string, string] => typeof e[1] === "string"),
      ) as Record<string, string>)
    : undefined;
  return NextResponse.json(
    { error: { message, ...(cleanErrors && Object.keys(cleanErrors).length > 0 ? { fieldErrors: cleanErrors } : {}) } },
    { status },
  );
}

async function actorHasAnyPermission(
  actorSupabase: any,
  actorUserId: string,
  actorRole: "super_admin" | "admin",
  permissions: Permission[],
) {
  if (actorRole === "super_admin") return true;
  const checks = await Promise.all(permissions.map((permission) => routeUserHasPermission(actorSupabase, actorUserId, permission)));
  return checks.some(Boolean);
}

async function resolveTeacherActivityScope(
  request: NextRequest,
  options: { requestedSchoolId?: string | null; requiredPermissions: Permission[] },
): Promise<{ ok: true; value: TeacherActivityScope } | { ok: false; status: number; message: string }> {
  const scopedActor = await resolveSchoolScopedActorContext(
    options.requestedSchoolId ?? null,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "هذه الوحدة متاحة للمدير أو المدير العام فقط.",
    },
    request.headers.get("authorization"),
  );

  if ("status" in scopedActor) {
    return { ok: false, status: scopedActor.status, message: scopedActor.message };
  }

  const { actorSupabase, actorUserId, actorRole: scopedActorRole, targetSchoolId } = scopedActor.value;
  if (scopedActorRole !== "super_admin" && scopedActorRole !== "admin") {
    return { ok: false, status: 403, message: "هذه الوحدة متاحة للمدير أو المدير العام فقط." };
  }

  const actorRole: TeacherActivityScope["actorRole"] = scopedActorRole;
  const authorized = await actorHasAnyPermission(actorSupabase, actorUserId, actorRole, options.requiredPermissions);
  if (!authorized) {
    return { ok: false, status: 403, message: "لا تملك الصلاحية المطلوبة لهذه العملية." };
  }

  const serviceSupabase = createServiceSupabaseClient();
  const [{ data: school }, { data: branches, error: branchesError }] = await Promise.all([
    serviceSupabase.from("schools").select("id, name").eq("id", targetSchoolId).maybeSingle(),
    serviceSupabase.from("branches").select("id, name").eq("school_id", targetSchoolId).order("name", { ascending: true }),
  ]);

  if (branchesError && !isMissingTableError(branchesError, "branches")) {
    return { ok: false, status: 500, message: branchesError.message };
  }

  let allowedBranchIds: string[] | null = null;
  if (actorRole === "admin") {
    const { data: scopeRows, error: scopeError } = await serviceSupabase
      .from("admin_branch_scopes")
      .select("branch_id")
      .eq("user_id", actorUserId)
      .eq("school_id", targetSchoolId);

    if (scopeError && !isMissingTableError(scopeError, "admin_branch_scopes")) {
      return { ok: false, status: 500, message: scopeError.message };
    }

    if (!scopeError && Array.isArray(scopeRows) && scopeRows.length > 0) {
      allowedBranchIds = scopeRows
        .map((row) => asNullableString((row as JsonRecord).branch_id))
        .filter((value): value is string => Boolean(value));
    }
  }

  const availableBranches = ((branches ?? []) as BranchRow[])
    .filter((branch) => !allowedBranchIds || allowedBranchIds.includes(branch.id))
    .map((branch) => ({ id: branch.id, name: branch.name?.trim() || "فرع" }));

  return {
    ok: true,
    value: {
      actorSupabase,
      actorUserId,
      actorRole,
      schoolId: targetSchoolId,
      schoolName: asNullableString(school?.name),
      serviceSupabase,
      allowedBranchIds,
      availableBranches,
    },
  };
}

function applyBranchScopeToQuery(query: any, scope: TeacherActivityScope, requestedBranchId?: string | null) {
  const branchId = asNullableString(requestedBranchId);

  if (branchId) {
    if (scope.allowedBranchIds && !scope.allowedBranchIds.includes(branchId)) {
      return { ok: false as const, status: 403, message: "لا يمكنك الوصول إلى بيانات هذا الفرع." };
    }
    return { ok: true as const, value: query.eq("branch_id", branchId) };
  }

  if (scope.allowedBranchIds && scope.allowedBranchIds.length > 0) {
    return { ok: true as const, value: query.in("branch_id", scope.allowedBranchIds) };
  }

  return { ok: true as const, value: query };
}

function applySharedOrdering(query: any, sort: string) {
  if (sort === "oldest") return query.order("created_at", { ascending: true });
  if (sort === "teacher") return query.order("teacher_name", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });
  if (sort === "school") return query.order("school_name", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });
  return query.order("created_at", { ascending: false });
}

async function fetchAuditTrail(serviceSupabase: ServiceSupabaseClient, entityType: string, entityId: string) {
  const { data, error } = await serviceSupabase
    .from("audit_logs")
    .select("id, actor_name, actor_email, action_type, summary, metadata, created_at")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });

  if (error && !isMissingTableError(error, "audit_logs")) throw error;

  return ((data ?? []) as JsonRecord[]).map(
    (row) =>
      ({
        id: asString(row.id),
        actorName: asNullableString(row.actor_name),
        actorEmail: asNullableString(row.actor_email),
        actionType: asString(row.action_type),
        summary: asString(row.summary),
        createdAt: asString(row.created_at),
        reason: asNullableString(asRecord(row.metadata).reason),
        oldValue:
          typeof asRecord(row.metadata).old_value === "object" && asRecord(row.metadata).old_value !== null
            ? (asRecord(row.metadata).old_value as Record<string, unknown>)
            : null,
        newValue:
          typeof asRecord(row.metadata).new_value === "object" && asRecord(row.metadata).new_value !== null
            ? (asRecord(row.metadata).new_value as Record<string, unknown>)
            : null,
      }) satisfies TeacherActivityAuditEntry,
  );
}

async function logTeacherActivityAuditAction(options: {
  serviceSupabase: ServiceSupabaseClient;
  actorUserId: string;
  actorRole: string;
  actionType: string;
  entityType: string;
  entityId: string;
  summary: string;
  schoolId: string;
  branchId?: string | null;
  reason?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}) {
  try {
    const actor = await options.serviceSupabase.auth.admin.getUserById(options.actorUserId);
    const { error } = await options.serviceSupabase.from("audit_logs").insert({
      actor_id: options.actorUserId,
      actor_email: actor.data.user?.email ?? null,
      actor_name:
        (typeof actor.data.user?.user_metadata?.full_name === "string" ? actor.data.user.user_metadata.full_name : null) ??
        actor.data.user?.email ??
        null,
      action_type: options.actionType,
      entity_type: options.entityType,
      entity_id: options.entityId,
      summary: options.summary,
      metadata: {
        actor_role: options.actorRole,
        school_id: options.schoolId,
        branch_id: options.branchId ?? null,
        reason: options.reason ?? null,
        old_value: options.oldValue ?? null,
        new_value: options.newValue ?? null,
      },
    });

    if (error && !isMissingTableError(error, "audit_logs")) {
      console.error("[teacher-activity audit] insert failed", error);
    }
  } catch (error) {
    console.error("[teacher-activity audit] unexpected failure", error);
  }
}

function mapTeacherMessageRow(row: JsonRecord): TeacherMessageListItem {
  const status = asNullableString(row.status);
  return {
    id: asString(row.group_id),
    representativeId: asString(row.representative_id),
    title: asNullableString(row.title) ?? "إشعار من المدرس",
    message: asNullableString(row.message) ?? "",
    type: asNullableString(row.type),
    status: isStatusValue(status) ? status : "active",
    schoolId: asString(row.school_id),
    schoolName: asNullableString(row.school_name),
    branchId: asNullableString(row.branch_id),
    branchName: asNullableString(row.branch_name),
    teacherId: asNullableString(row.teacher_id),
    teacherName: asNullableString(row.teacher_name),
    targetCount: Number(row.target_count ?? 0),
    targets: normalizeTargets(row.targets),
    createdAt: asNullableString(row.created_at),
    updatedAt: asNullableString(row.updated_at),
    moderatedAt: asNullableString(row.moderated_at),
    moderationReason: asNullableString(row.moderation_reason),
  };
}

function mapHomeworkRow(row: JsonRecord): HomeworkListItem {
  const status = asNullableString(row.status);
  return {
    id: asString(row.id),
    title: asNullableString(row.title) ?? "واجب",
    description: asNullableString(row.description),
    subject: asNullableString(row.subject),
    className: asNullableString(row.class_name),
    section: asNullableString(row.section),
    studentId: asNullableString(row.student_id),
    studentName: asNullableString(row.student_name),
    contentKind: asNullableString(row.content_kind),
    dueAt: asNullableString(row.due_at),
    status: isStatusValue(status) ? status : "active",
    schoolId: asString(row.school_id),
    schoolName: asNullableString(row.school_name),
    branchId: asNullableString(row.branch_id),
    branchName: asNullableString(row.branch_name),
    teacherId: asNullableString(row.teacher_id),
    teacherName: asNullableString(row.teacher_name),
    createdAt: asNullableString(row.created_at),
    updatedAt: asNullableString(row.updated_at),
    moderatedAt: asNullableString(row.moderated_at),
    moderationReason: asNullableString(row.moderation_reason),
    attachment:
      asNullableString(row.attachment_bucket) || asNullableString(row.attachment_path)
        ? {
            bucket: asNullableString(row.attachment_bucket),
            path: asNullableString(row.attachment_path),
            name: asNullableString(row.attachment_name),
            mimeType: asNullableString(row.attachment_mime_type),
            sizeBytes: asNullableNumber(row.attachment_size_bytes),
          }
        : null,
  };
}

export async function getTeacherActivityMeta(
  request: NextRequest,
  options?: {
    schoolId?: string | null;
    studentQuery?: string | null;
    branchId?: string | null;
    className?: string | null;
    section?: string | null;
  },
) {
  const scopeResult = await resolveTeacherActivityScope(request, {
    requestedSchoolId: options?.schoolId ?? null,
    requiredPermissions: ["view_teacher_activity", "view_fee_notifications"],
  });
  if (!scopeResult.ok) return scopeResult;

  const scope = scopeResult.value;
  let teachersQuery = scope.serviceSupabase.from("teachers").select("id, full_name").eq("school_id", scope.schoolId).order("full_name", { ascending: true });
  const scopedTeachers = applyBranchScopeToQuery(teachersQuery, scope, options?.branchId ?? null);
  if (!scopedTeachers.ok) return scopedTeachers;

  let studentsQuery = scope.serviceSupabase
    .from("students")
    .select("id, full_name, class_name, section, branch_id")
    .eq("school_id", scope.schoolId)
    .order("full_name", { ascending: true })
    .limit(asString(options?.studentQuery).length > 0 ? 25 : 12);
  const scopedStudents = applyBranchScopeToQuery(studentsQuery, scope, options?.branchId ?? null);
  if (!scopedStudents.ok) return scopedStudents;

  if (asNullableString(options?.className)) scopedStudents.value = scopedStudents.value.eq("class_name", asString(options?.className));
  if (asNullableString(options?.section)) scopedStudents.value = scopedStudents.value.eq("section", asString(options?.section));
  if (asString(options?.studentQuery).length > 0) {
    scopedStudents.value = scopedStudents.value.or(buildSearchClause(["full_name", "class_name", "section"], asString(options?.studentQuery)) ?? "");
  }

  let classRowsQuery = scope.serviceSupabase.from("students").select("class_name, section, branch_id").eq("school_id", scope.schoolId);
  const scopedClassRows = applyBranchScopeToQuery(classRowsQuery, scope, options?.branchId ?? null);
  if (!scopedClassRows.ok) return scopedClassRows;

  const [teachersResult, studentsResult, classRowsResult] = await Promise.all([scopedTeachers.value, scopedStudents.value, scopedClassRows.value]);
  if (teachersResult.error || studentsResult.error || classRowsResult.error) {
    return {
      ok: false as const,
      status: 500,
      message:
        teachersResult.error?.message ||
        studentsResult.error?.message ||
        classRowsResult.error?.message ||
        "تعذر تحميل بيانات المرشحات.",
    };
  }

  const classes = Array.from(
    new Set(
      ((classRowsResult.data ?? []) as JsonRecord[])
        .map((row) => asNullableString(row.class_name))
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((left, right) => left.localeCompare(right, "ar"));

  const sections = Array.from(
    new Set(
      ((classRowsResult.data ?? []) as JsonRecord[])
        .map((row) => asNullableString(row.section))
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((left, right) => left.localeCompare(right, "ar"));

  return {
    ok: true as const,
    value: {
      branches: scope.availableBranches,
      teachers: ((teachersResult.data ?? []) as TeacherRow[]).map((teacher) => ({ id: teacher.id, name: teacher.full_name?.trim() || "مدرس" })),
      classes,
      sections,
      students: ((studentsResult.data ?? []) as StudentRow[]).map(
        (student) =>
          ({
            id: student.id,
            fullName: student.full_name?.trim() || "طالب",
            className: asNullableString(student.class_name),
            section: asNullableString(student.section),
            branchId: asNullableString(student.branch_id),
          }) satisfies MonitoringStudentOption,
      ),
    } satisfies MonitoringMetaResponse,
  };
}

export async function listTeacherMessages(request: NextRequest, filters: TeacherMessageFilters) {
  const scopeResult = await resolveTeacherActivityScope(request, {
    requestedSchoolId: filters.schoolId,
    requiredPermissions: ["view_teacher_activity"],
  });
  if (!scopeResult.ok) return scopeResult;

  const scope = scopeResult.value;
  let query = scope.serviceSupabase.from("dashboard_teacher_message_groups").select("*", { count: "exact" }).eq("school_id", scope.schoolId);
  const scopedQuery = applyBranchScopeToQuery(query, scope, filters.branchId);
  if (!scopedQuery.ok) return scopedQuery;
  query = scopedQuery.value;

  if (filters.teacherId) query = query.eq("teacher_id", filters.teacherId);
  if (filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.messageType) query = query.eq("type", filters.messageType);
  if (filters.className) query = query.contains("targets", [{ class_name: filters.className }]);
  if (filters.section) query = query.contains("targets", [{ section: filters.section }]);
  if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
  if (filters.dateTo) query = query.lte("created_at", filters.dateTo);

  const searchClause = buildSearchClause(["title", "message", "teacher_name", "school_name"], filters.search);
  if (searchClause) query = query.or(searchClause);

  query = applySharedOrdering(query, filters.sort);

  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;
  const { data, count, error } = await query.range(from, to);
  if (error) return { ok: false as const, status: 500, message: error.message || "تعذر تحميل رسائل الأساتذة." };

  return {
    ok: true as const,
    value: { items: ((data ?? []) as JsonRecord[]).map(mapTeacherMessageRow), totalCount: count ?? 0 },
  };
}

async function fetchTeacherMessageDetailInternal(scope: TeacherActivityScope, groupId: string) {
  let groupQuery = scope.serviceSupabase.from("dashboard_teacher_message_groups").select("*").eq("group_id", groupId).eq("school_id", scope.schoolId);
  const scopedGroupQuery = applyBranchScopeToQuery(groupQuery, scope);
  if (!scopedGroupQuery.ok) return scopedGroupQuery;

  const { data: groupRow, error: groupError } = await scopedGroupQuery.value.maybeSingle();
  if (groupError) return { ok: false as const, status: 500, message: groupError.message };
  if (!groupRow) return { ok: false as const, status: 404, message: "لم يتم العثور على الرسالة المطلوبة." };

  let rowsQuery = scope.serviceSupabase
    .from("notifications")
    .select("id, title, message, link, note, due_at, metadata, status, created_at, updated_at, moderated_at, moderation_reason, deleted_at, branch_id")
    .eq("message_group_id", groupId)
    .eq("school_id", scope.schoolId)
    .order("created_at", { ascending: true });
  const scopedRowsQuery = applyBranchScopeToQuery(rowsQuery, scope);
  if (!scopedRowsQuery.ok) return scopedRowsQuery;

  const [rowsResult, auditTrail] = await Promise.all([
    scopedRowsQuery.value,
    fetchAuditTrail(scope.serviceSupabase, "teacher_message", groupId),
  ]);

  if (rowsResult.error) return { ok: false as const, status: 500, message: rowsResult.error.message };

  const firstRow = asRecord((rowsResult.data ?? [])[0]);
  const metadata = asRecord(firstRow.metadata);
  const base = mapTeacherMessageRow(groupRow as JsonRecord);

  return {
    ok: true as const,
    value: {
      ...base,
      note: asNullableString(firstRow.note),
      dueAt: asNullableString(firstRow.due_at),
      link: asNullableString(firstRow.link),
      attachment:
        asNullableString(metadata.attachment_bucket) || asNullableString(metadata.attachment_path)
          ? {
              bucket: asNullableString(metadata.attachment_bucket),
              path: asNullableString(metadata.attachment_path),
              name: asNullableString(metadata.attachment_name),
              mimeType: asNullableString(metadata.attachment_mime_type),
              sizeBytes: asNullableNumber(metadata.attachment_size_bytes),
            }
          : null,
      auditTrail,
    } satisfies TeacherMessageDetail,
  };
}

export async function getTeacherMessageDetail(request: NextRequest, groupId: string, schoolId?: string | null) {
  const scopeResult = await resolveTeacherActivityScope(request, {
    requestedSchoolId: schoolId ?? null,
    requiredPermissions: ["view_teacher_activity"],
  });
  if (!scopeResult.ok) return scopeResult;
  return fetchTeacherMessageDetailInternal(scopeResult.value, groupId);
}

export async function updateTeacherMessageByAdmin(
  request: NextRequest,
  groupId: string,
  input: {
    title: string;
    message: string;
    note: string | null;
    link: string | null;
    dueAt: string | null;
    reason: string | null;
    schoolId?: string | null;
  },
) {
  const scopeResult = await resolveTeacherActivityScope(request, {
    requestedSchoolId: input.schoolId ?? null,
    requiredPermissions: ["moderate_teacher_activity"],
  });
  if (!scopeResult.ok) return scopeResult;

  const scope = scopeResult.value;
  const current = await fetchTeacherMessageDetailInternal(scope, groupId);
  if (!current.ok) return current;
  if (current.value.status === "deleted_by_admin") return { ok: false as const, status: 409, message: "لا يمكن تعديل رسالة محذوفة." };

  const now = new Date().toISOString();
  let updateQuery = scope.serviceSupabase
    .from("notifications")
    .update({
      title: input.title,
      message: input.message,
      note: input.note,
      link: input.link,
      due_at: input.dueAt,
      status: "edited_by_admin",
      updated_by: scope.actorUserId,
      updated_at: now,
      moderated_by: scope.actorUserId,
      moderated_at: now,
      moderation_reason: input.reason,
    })
    .eq("message_group_id", groupId)
    .eq("school_id", scope.schoolId)
    .is("deleted_at", null)
    .select("id");
  const scopedUpdate = applyBranchScopeToQuery(updateQuery, scope);
  if (!scopedUpdate.ok) return scopedUpdate;
  const { data, error } = await scopedUpdate.value;
  if (error) return { ok: false as const, status: 500, message: error.message };
  if (!data || data.length === 0) return { ok: false as const, status: 404, message: "الرسالة المطلوبة غير متاحة ضمن نطاقك الحالي." };

  await logTeacherActivityAuditAction({
    serviceSupabase: scope.serviceSupabase,
    actorUserId: scope.actorUserId,
    actorRole: scope.actorRole,
    actionType: "update",
    entityType: "teacher_message",
    entityId: groupId,
    summary: `تعديل رسالة مدرس: ${input.title}`,
    schoolId: scope.schoolId,
    branchId: current.value.branchId,
    reason: input.reason,
    oldValue: {
      title: current.value.title,
      message: current.value.message,
      note: current.value.note,
      link: current.value.link,
      due_at: current.value.dueAt,
      status: current.value.status,
    },
    newValue: {
      title: input.title,
      message: input.message,
      note: input.note,
      link: input.link,
      due_at: input.dueAt,
      status: "edited_by_admin",
    },
  });

  return fetchTeacherMessageDetailInternal(scope, groupId);
}

export async function deleteTeacherMessageByAdmin(
  request: NextRequest,
  groupId: string,
  input: { reason: string | null; schoolId?: string | null },
) {
  const scopeResult = await resolveTeacherActivityScope(request, {
    requestedSchoolId: input.schoolId ?? null,
    requiredPermissions: ["moderate_teacher_activity"],
  });
  if (!scopeResult.ok) return scopeResult;

  const scope = scopeResult.value;
  const current = await fetchTeacherMessageDetailInternal(scope, groupId);
  if (!current.ok) return current;
  if (current.value.status === "deleted_by_admin") return { ok: false as const, status: 409, message: "تم حذف هذه الرسالة سابقاً." };

  const now = new Date().toISOString();
  let deleteQuery = scope.serviceSupabase
    .from("notifications")
    .update({
      status: "deleted_by_admin",
      updated_by: scope.actorUserId,
      updated_at: now,
      moderated_by: scope.actorUserId,
      moderated_at: now,
      moderation_reason: input.reason,
      deleted_by: scope.actorUserId,
      deleted_at: now,
    })
    .eq("message_group_id", groupId)
    .eq("school_id", scope.schoolId)
    .is("deleted_at", null)
    .select("id");
  const scopedDelete = applyBranchScopeToQuery(deleteQuery, scope);
  if (!scopedDelete.ok) return scopedDelete;
  const { data, error } = await scopedDelete.value;
  if (error) return { ok: false as const, status: 500, message: error.message };
  if (!data || data.length === 0) return { ok: false as const, status: 404, message: "الرسالة المطلوبة غير متاحة ضمن نطاقك الحالي." };

  await logTeacherActivityAuditAction({
    serviceSupabase: scope.serviceSupabase,
    actorUserId: scope.actorUserId,
    actorRole: scope.actorRole,
    actionType: "delete",
    entityType: "teacher_message",
    entityId: groupId,
    summary: `حذف رسالة مدرس: ${current.value.title}`,
    schoolId: scope.schoolId,
    branchId: current.value.branchId,
    reason: input.reason,
    oldValue: { title: current.value.title, message: current.value.message, status: current.value.status },
    newValue: { status: "deleted_by_admin", deleted_at: now },
  });

  return { ok: true as const, value: { id: groupId, status: "deleted_by_admin" as TeacherActivityStatus, deletedAt: now } };
}

export async function listHomework(request: NextRequest, filters: HomeworkFilters) {
  const scopeResult = await resolveTeacherActivityScope(request, {
    requestedSchoolId: filters.schoolId,
    requiredPermissions: ["view_teacher_activity"],
  });
  if (!scopeResult.ok) return scopeResult;

  const scope = scopeResult.value;
  let query = scope.serviceSupabase.from("dashboard_homework_monitoring").select("*", { count: "exact" }).eq("school_id", scope.schoolId);
  const scopedQuery = applyBranchScopeToQuery(query, scope, filters.branchId);
  if (!scopedQuery.ok) return scopedQuery;
  query = scopedQuery.value;

  if (filters.teacherId) query = query.eq("teacher_id", filters.teacherId);
  if (filters.className) query = query.eq("class_name", filters.className);
  if (filters.section) query = query.eq("section", filters.section);
  if (filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.contentKind) query = query.eq("content_kind", filters.contentKind);
  if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
  if (filters.dateTo) query = query.lte("created_at", filters.dateTo);

  const searchClause = buildSearchClause(["title", "description", "subject", "teacher_name", "student_name", "class_name", "section"], filters.search);
  if (searchClause) query = query.or(searchClause);

  query = applySharedOrdering(query, filters.sort);

  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;
  const { data, count, error } = await query.range(from, to);
  if (error) return { ok: false as const, status: 500, message: error.message || "تعذر تحميل الواجبات." };

  return { ok: true as const, value: { items: ((data ?? []) as JsonRecord[]).map(mapHomeworkRow), totalCount: count ?? 0 } };
}

async function fetchHomeworkDetailInternal(scope: TeacherActivityScope, homeworkId: string) {
  let query = scope.serviceSupabase.from("dashboard_homework_monitoring").select("*").eq("id", homeworkId).eq("school_id", scope.schoolId);
  const scopedQuery = applyBranchScopeToQuery(query, scope);
  if (!scopedQuery.ok) return scopedQuery;

  const [rowResult, auditTrail] = await Promise.all([
    scopedQuery.value.maybeSingle(),
    fetchAuditTrail(scope.serviceSupabase, "homework", homeworkId),
  ]);

  if (rowResult.error) return { ok: false as const, status: 500, message: rowResult.error.message };
  if (!rowResult.data) return { ok: false as const, status: 404, message: "لم يتم العثور على الواجب المطلوب." };

  const base = mapHomeworkRow(rowResult.data as JsonRecord);
  return {
    ok: true as const,
    value: {
      ...base,
      metadata: asRecord((rowResult.data as JsonRecord).metadata),
      auditTrail,
    } satisfies HomeworkDetail,
  };
}

export async function getHomeworkDetail(request: NextRequest, homeworkId: string, schoolId?: string | null) {
  const scopeResult = await resolveTeacherActivityScope(request, {
    requestedSchoolId: schoolId ?? null,
    requiredPermissions: ["view_teacher_activity"],
  });
  if (!scopeResult.ok) return scopeResult;
  return fetchHomeworkDetailInternal(scopeResult.value, homeworkId);
}

export async function updateHomeworkByAdmin(
  request: NextRequest,
  homeworkId: string,
  input: {
    title: string;
    description: string | null;
    subject: string | null;
    dueAt: string | null;
    reason: string | null;
    contentKind: string | null;
    schoolId?: string | null;
  },
) {
  const scopeResult = await resolveTeacherActivityScope(request, {
    requestedSchoolId: input.schoolId ?? null,
    requiredPermissions: ["moderate_teacher_activity"],
  });
  if (!scopeResult.ok) return scopeResult;

  const scope = scopeResult.value;
  const current = await fetchHomeworkDetailInternal(scope, homeworkId);
  if (!current.ok) return current;
  if (current.value.status === "deleted_by_admin") return { ok: false as const, status: 409, message: "لا يمكن تعديل واجب محذوف." };

  const now = new Date().toISOString();
  let updateQuery = scope.serviceSupabase
    .from("assignments")
    .update({
      title: input.title,
      description: input.description,
      subject: input.subject,
      due_at: input.dueAt,
      content_kind: input.contentKind ?? current.value.contentKind,
      status: "edited_by_admin",
      updated_by: scope.actorUserId,
      updated_at: now,
      moderated_by: scope.actorUserId,
      moderated_at: now,
      moderation_reason: input.reason,
    })
    .eq("id", homeworkId)
    .eq("school_id", scope.schoolId)
    .is("deleted_at", null)
    .select("id");
  const scopedUpdate = applyBranchScopeToQuery(updateQuery, scope);
  if (!scopedUpdate.ok) return scopedUpdate;
  const { data, error } = await scopedUpdate.value;
  if (error) return { ok: false as const, status: 500, message: error.message };
  if (!data || data.length === 0) return { ok: false as const, status: 404, message: "الواجب المطلوب غير متاح ضمن نطاقك الحالي." };

  await logTeacherActivityAuditAction({
    serviceSupabase: scope.serviceSupabase,
    actorUserId: scope.actorUserId,
    actorRole: scope.actorRole,
    actionType: "update",
    entityType: "homework",
    entityId: homeworkId,
    summary: `تعديل واجب: ${input.title}`,
    schoolId: scope.schoolId,
    branchId: current.value.branchId,
    reason: input.reason,
    oldValue: {
      title: current.value.title,
      description: current.value.description,
      subject: current.value.subject,
      due_at: current.value.dueAt,
      content_kind: current.value.contentKind,
      status: current.value.status,
    },
    newValue: {
      title: input.title,
      description: input.description,
      subject: input.subject,
      due_at: input.dueAt,
      content_kind: input.contentKind ?? current.value.contentKind,
      status: "edited_by_admin",
    },
  });

  return fetchHomeworkDetailInternal(scope, homeworkId);
}

export async function deleteHomeworkByAdmin(
  request: NextRequest,
  homeworkId: string,
  input: { reason: string | null; schoolId?: string | null },
) {
  const scopeResult = await resolveTeacherActivityScope(request, {
    requestedSchoolId: input.schoolId ?? null,
    requiredPermissions: ["moderate_teacher_activity"],
  });
  if (!scopeResult.ok) return scopeResult;

  const scope = scopeResult.value;
  const current = await fetchHomeworkDetailInternal(scope, homeworkId);
  if (!current.ok) return current;
  if (current.value.status === "deleted_by_admin") return { ok: false as const, status: 409, message: "تم حذف هذا الواجب سابقاً." };

  const now = new Date().toISOString();
  let deleteQuery = scope.serviceSupabase
    .from("assignments")
    .update({
      status: "deleted_by_admin",
      updated_by: scope.actorUserId,
      updated_at: now,
      moderated_by: scope.actorUserId,
      moderated_at: now,
      moderation_reason: input.reason,
      deleted_by: scope.actorUserId,
      deleted_at: now,
    })
    .eq("id", homeworkId)
    .eq("school_id", scope.schoolId)
    .is("deleted_at", null)
    .select("id");
  const scopedDelete = applyBranchScopeToQuery(deleteQuery, scope);
  if (!scopedDelete.ok) return scopedDelete;
  const { data, error } = await scopedDelete.value;
  if (error) return { ok: false as const, status: 500, message: error.message };
  if (!data || data.length === 0) return { ok: false as const, status: 404, message: "الواجب المطلوب غير متاح ضمن نطاقك الحالي." };

  await logTeacherActivityAuditAction({
    serviceSupabase: scope.serviceSupabase,
    actorUserId: scope.actorUserId,
    actorRole: scope.actorRole,
    actionType: "delete",
    entityType: "homework",
    entityId: homeworkId,
    summary: `حذف واجب: ${current.value.title}`,
    schoolId: scope.schoolId,
    branchId: current.value.branchId,
    reason: input.reason,
    oldValue: { title: current.value.title, description: current.value.description, status: current.value.status },
    newValue: { status: "deleted_by_admin", deleted_at: now },
  });

  return { ok: true as const, value: { id: homeworkId, status: "deleted_by_admin" as TeacherActivityStatus, deletedAt: now } };
}

function mapFeeHistoryRow(row: JsonRecord, creatorNames: Map<string, string>, branchNames: Map<string, string>): FeeNotificationHistoryItem {
  return {
    id: asString(row.id),
    title: asNullableString(row.title) ?? "تنبيه قسط",
    message: asNullableString(row.message) ?? "",
    note: asNullableString(row.note),
    dueAt: asNullableString(row.due_at),
    deepLink: asNullableString(row.deep_link),
    targetMode: (asString(row.target_mode) as FeeNotificationHistoryItem["targetMode"]) || "all_students",
    sentCount: Number(row.sent_count ?? 0),
    failedCount: Number(row.failed_count ?? 0),
    createdAt: asString(row.created_at),
    schoolId: asString(row.school_id),
    branchId: asNullableString(row.branch_id),
    branchName: asNullableString(row.branch_id) ? branchNames.get(asString(row.branch_id)) ?? null : null,
    createdBy: asNullableString(row.created_by),
    createdByName: asNullableString(row.created_by) ? creatorNames.get(asString(row.created_by)) ?? null : null,
    targetFilters: asRecord(row.target_filters),
  };
}

async function fetchCreatorNames(serviceSupabase: ServiceSupabaseClient, userIds: string[]) {
  if (userIds.length === 0) return new Map<string, string>();
  const { data, error } = await serviceSupabase.from("user_profiles").select("id, full_name, email").in("id", userIds);
  if (error) throw error;
  return new Map(((data ?? []) as JsonRecord[]).map((row) => [asString(row.id), asNullableString(row.full_name) ?? asNullableString(row.email) ?? "مدير"]));
}

async function fetchBranchNames(serviceSupabase: ServiceSupabaseClient, branchIds: string[]) {
  if (branchIds.length === 0) return new Map<string, string>();
  const { data, error } = await serviceSupabase.from("branches").select("id, name").in("id", branchIds);
  if (error && !isMissingTableError(error, "branches")) throw error;
  return new Map(((data ?? []) as BranchRow[]).map((row) => [row.id, row.name?.trim() || "فرع"]));
}

export async function listFeeNotifications(
  request: NextRequest,
  filters: { schoolId?: string | null; branchId?: string | null; page?: number; pageSize?: number; search?: string | null },
) {
  const scopeResult = await resolveTeacherActivityScope(request, {
    requestedSchoolId: filters.schoolId ?? null,
    requiredPermissions: ["view_fee_notifications"],
  });
  if (!scopeResult.ok) return scopeResult;

  const scope = scopeResult.value;
  let query = scope.serviceSupabase.from("fee_notifications").select("*", { count: "exact" }).eq("school_id", scope.schoolId);
  const scopedQuery = applyBranchScopeToQuery(query, scope, filters.branchId ?? null);
  if (!scopedQuery.ok) return scopedQuery;
  query = scopedQuery.value;

  const searchClause = buildSearchClause(["title", "message", "note"], asString(filters.search));
  if (searchClause) query = query.or(searchClause);

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, to);
  if (error) return { ok: false as const, status: 500, message: error.message };

  const rows = (data ?? []) as JsonRecord[];
  const creatorIds = Array.from(new Set(rows.map((row) => asNullableString(row.created_by)).filter((value): value is string => Boolean(value))));
  const branchIds = Array.from(new Set(rows.map((row) => asNullableString(row.branch_id)).filter((value): value is string => Boolean(value))));
  const [creatorNames, branchNames] = await Promise.all([fetchCreatorNames(scope.serviceSupabase, creatorIds), fetchBranchNames(scope.serviceSupabase, branchIds)]);

  return { ok: true as const, value: { items: rows.map((row) => mapFeeHistoryRow(row, creatorNames, branchNames)), totalCount: count ?? 0 } };
}

async function fetchFeeNotificationDetailInternal(scope: TeacherActivityScope, notificationId: string) {
  let query = scope.serviceSupabase.from("fee_notifications").select("*").eq("id", notificationId).eq("school_id", scope.schoolId);
  const scopedQuery = applyBranchScopeToQuery(query, scope);
  if (!scopedQuery.ok) return scopedQuery;

  const [rowResult, auditTrail] = await Promise.all([
    scopedQuery.value.maybeSingle(),
    fetchAuditTrail(scope.serviceSupabase, "fee_notification", notificationId),
  ]);
  if (rowResult.error) return { ok: false as const, status: 500, message: rowResult.error.message };
  if (!rowResult.data) return { ok: false as const, status: 404, message: "لم يتم العثور على إشعار الأقساط المطلوب." };

  const feeRow = rowResult.data as JsonRecord;
  const recipientsResult = await scope.serviceSupabase
    .from("fee_notification_recipients")
    .select("id, student_id, user_id, delivery_status, failure_reason, created_at")
    .eq("fee_notification_id", notificationId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (recipientsResult.error) return { ok: false as const, status: 500, message: recipientsResult.error.message };

  const recipients = (recipientsResult.data ?? []) as JsonRecord[];
  const studentIds = Array.from(new Set(recipients.map((row) => asNullableString(row.student_id)).filter((value): value is string => Boolean(value))));
  const creatorId = asNullableString(feeRow.created_by);
  const branchId = asNullableString(feeRow.branch_id);
  const [studentRows, creatorNames, branchNames] = await Promise.all([
    studentIds.length > 0 ? scope.serviceSupabase.from("students").select("id, full_name").in("id", studentIds) : Promise.resolve({ data: [] as JsonRecord[], error: null }),
    fetchCreatorNames(scope.serviceSupabase, creatorId ? [creatorId] : []),
    fetchBranchNames(scope.serviceSupabase, branchId ? [branchId] : []),
  ]);
  if (studentRows.error) return { ok: false as const, status: 500, message: studentRows.error.message };

  const studentNames = new Map(((studentRows.data ?? []) as JsonRecord[]).map((row) => [asString(row.id), asNullableString(row.full_name) ?? "طالب"]));
  const history = mapFeeHistoryRow(feeRow, creatorNames, branchNames);

  return {
    ok: true as const,
    value: {
      ...history,
      recipients: recipients.map((row) => ({
        id: asString(row.id),
        deliveryStatus: asString(row.delivery_status),
        failureReason: asNullableString(row.failure_reason),
        studentId: asNullableString(row.student_id),
        studentName: asNullableString(row.student_id) ? studentNames.get(asString(row.student_id)) ?? null : null,
        userId: asNullableString(row.user_id),
        createdAt: asString(row.created_at),
      })),
      auditTrail,
    } satisfies FeeNotificationDetail,
  };
}

export async function getFeeNotificationDetail(request: NextRequest, notificationId: string, schoolId?: string | null) {
  const scopeResult = await resolveTeacherActivityScope(request, {
    requestedSchoolId: schoolId ?? null,
    requiredPermissions: ["view_fee_notifications"],
  });
  if (!scopeResult.ok) return scopeResult;
  return fetchFeeNotificationDetailInternal(scopeResult.value, notificationId);
}

export async function createFeeNotification(request: NextRequest, input: FeeNotificationInput) {
  const scopeResult = await resolveTeacherActivityScope(request, {
    requestedSchoolId: input.schoolId ?? null,
    requiredPermissions: ["send_fee_notifications"],
  });
  if (!scopeResult.ok) return scopeResult;

  const scope = scopeResult.value;
  let studentQuery = scope.serviceSupabase
    .from("students")
    .select("id, full_name, class_name, section, branch_id, auth_user_id")
    .eq("school_id", scope.schoolId)
    .order("full_name", { ascending: true });
  const scopedStudents = applyBranchScopeToQuery(studentQuery, scope, input.branchId);
  if (!scopedStudents.ok) return scopedStudents;
  studentQuery = scopedStudents.value;

  if (input.targetMode === "class_section") {
    studentQuery = studentQuery.eq("class_name", input.className);
    if (input.section) studentQuery = studentQuery.eq("section", input.section);
  }

  if (input.targetMode === "specific_students") {
    studentQuery = studentQuery.in("id", input.studentIds);
  }

  const { data: students, error: studentsError } = await studentQuery;
  if (studentsError) return { ok: false as const, status: 500, message: studentsError.message };

  const studentRows = (students ?? []) as StudentRow[];
  if (studentRows.length === 0) return { ok: false as const, status: 400, message: "لا يوجد طلاب مطابقون لنطاق الإرسال المحدد." };

  if (input.targetMode === "specific_students") {
    const foundIds = new Set(studentRows.map((student) => student.id));
    const missingIds = input.studentIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) return { ok: false as const, status: 403, message: "بعض الطلاب المحددين غير متاحين ضمن نطاقك الحالي." };
  }

  const targetFilters = {
    target_mode: input.targetMode,
    branch_id: input.branchId,
    class_name: input.className,
    section: input.section,
    student_ids: input.studentIds,
  };

  const { data: feeNotification, error: feeNotificationError } = await scope.serviceSupabase
    .from("fee_notifications")
    .insert({
      school_id: scope.schoolId,
      branch_id: input.branchId,
      created_by: scope.actorUserId,
      title: input.title,
      message: input.message,
      note: input.note,
      due_at: input.dueAt,
      deep_link: input.deepLink,
      target_mode: input.targetMode,
      target_filters: targetFilters,
      metadata: { school_name: scope.schoolName },
    })
    .select("id")
    .single();
  if (feeNotificationError || !feeNotification?.id) {
    return { ok: false as const, status: 500, message: feeNotificationError?.message || "تعذر إنشاء سجل تنبيه القسط." };
  }

  const feeNotificationId = feeNotification.id as string;
  const sendableStudents = studentRows.filter((student) => asNullableString(student.auth_user_id));
  const failedStudents = studentRows.filter((student) => !asNullableString(student.auth_user_id));
  let insertedNotifications: Array<{ id: string; user_id: string | null }> = [];
  let insertErrorMessage: string | null = null;

  if (sendableStudents.length > 0) {
    const { data: notificationRows, error: notificationsError } = await scope.serviceSupabase
      .from("notifications")
      .insert(
        sendableStudents.map((student) => ({
          user_id: student.auth_user_id,
          school_id: scope.schoolId,
          branch_id: student.branch_id,
          sender_user_id: scope.actorUserId,
          type: "fee_installment",
          source: "fee_installment",
          title: input.title,
          message: input.message,
          note: input.note,
          due_at: input.dueAt,
          link: input.deepLink,
          message_group_id: feeNotificationId,
          metadata: {
            fee_notification_id: feeNotificationId,
            student_id: student.id,
            class_name: student.class_name,
            section: student.section,
            target_mode: input.targetMode,
          },
        })),
      )
      .select("id, user_id");

    if (notificationsError) {
      insertErrorMessage = notificationsError.message;
    } else {
      insertedNotifications = ((notificationRows ?? []) as JsonRecord[]).map((row) => ({
        id: asString(row.id),
        user_id: asNullableString(row.user_id),
      }));
    }
  }

  const notificationIdsByUserId = new Map(insertedNotifications.filter((row) => row.user_id).map((row) => [row.user_id as string, row.id]));
  const recipientRows = [
    ...sendableStudents.map((student) => ({
      fee_notification_id: feeNotificationId,
      school_id: scope.schoolId,
      branch_id: student.branch_id,
      student_id: student.id,
      user_id: student.auth_user_id ?? null,
      notification_id: student.auth_user_id ? notificationIdsByUserId.get(student.auth_user_id) ?? null : null,
      delivery_status: insertErrorMessage ? "failed" : "sent",
      failure_reason: insertErrorMessage,
    })),
    ...failedStudents.map((student) => ({
      fee_notification_id: feeNotificationId,
      school_id: scope.schoolId,
      branch_id: student.branch_id,
      student_id: student.id,
      user_id: null,
      notification_id: null,
      delivery_status: "failed",
      failure_reason: "لا يوجد حساب تطبيق مرتبط بهذا الطالب.",
    })),
  ];

  if (recipientRows.length > 0) {
    const { error: recipientsError } = await scope.serviceSupabase.from("fee_notification_recipients").insert(recipientRows);
    if (recipientsError) return { ok: false as const, status: 500, message: recipientsError.message };
  }

  const sentCount = insertErrorMessage ? 0 : sendableStudents.length;
  const failedCount = studentRows.length - sentCount;
  await scope.serviceSupabase.from("fee_notifications").update({ sent_count: sentCount, failed_count: failedCount }).eq("id", feeNotificationId);

  await logTeacherActivityAuditAction({
    serviceSupabase: scope.serviceSupabase,
    actorUserId: scope.actorUserId,
    actorRole: scope.actorRole,
    actionType: "create",
    entityType: "fee_notification",
    entityId: feeNotificationId,
    summary: `إرسال تنبيه قسط: ${input.title}`,
    schoolId: scope.schoolId,
    branchId: input.branchId,
    newValue: {
      title: input.title,
      target_mode: input.targetMode,
      sent_count: sentCount,
      failed_count: failedCount,
      due_at: input.dueAt,
    },
  });

  if (insertErrorMessage) return { ok: false as const, status: 500, message: `تم إنشاء السجل لكن فشل إرسال الإشعارات: ${insertErrorMessage}` };

  return fetchFeeNotificationDetailInternal(scope, feeNotificationId);
}
