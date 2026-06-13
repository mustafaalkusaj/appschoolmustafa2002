export const TEACHER_ACTIVITY_STATUSES = ["active", "edited_by_admin", "deleted_by_admin"] as const;

export type TeacherActivityStatus = (typeof TEACHER_ACTIVITY_STATUSES)[number];

export const TEACHER_ACTIVITY_SORTS = ["newest", "oldest", "teacher", "school"] as const;

export type TeacherActivitySort = (typeof TEACHER_ACTIVITY_SORTS)[number];

export const FEE_NOTIFICATION_TARGET_MODES = [
  "all_students",
  "school",
  "branch",
  "class_section",
  "specific_students",
] as const;

export type FeeNotificationTargetMode = (typeof FEE_NOTIFICATION_TARGET_MODES)[number];

export type TeacherActivityPagination = {
  page: number;
  pageSize: number;
};

export type TeacherActivityFilters = TeacherActivityPagination & {
  schoolId: string | null;
  branchId: string | null;
  teacherId: string | null;
  className: string | null;
  section: string | null;
  status: TeacherActivityStatus | "all";
  search: string;
  sort: TeacherActivitySort;
  dateFrom: string | null;
  dateTo: string | null;
};

export type TeacherMessageFilters = TeacherActivityFilters & {
  messageType: string | null;
};

export type HomeworkFilters = TeacherActivityFilters & {
  contentKind: string | null;
};

export type TeacherActivityTarget = {
  user_id: string | null;
  student_id: string | null;
  student_name: string | null;
  class_name: string | null;
  section: string | null;
};

export type TeacherActivityAuditEntry = {
  id: string;
  actorName: string | null;
  actorEmail: string | null;
  actionType: string;
  summary: string;
  createdAt: string;
  reason: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
};

export type TeacherMessageListItem = {
  id: string;
  representativeId: string;
  title: string;
  message: string;
  type: string | null;
  status: TeacherActivityStatus;
  schoolId: string;
  schoolName: string | null;
  branchId: string | null;
  branchName: string | null;
  teacherId: string | null;
  teacherName: string | null;
  targetCount: number;
  targets: TeacherActivityTarget[];
  createdAt: string | null;
  updatedAt: string | null;
  moderatedAt: string | null;
  moderationReason: string | null;
};

export type TeacherMessageDetail = TeacherMessageListItem & {
  note: string | null;
  dueAt: string | null;
  link: string | null;
  attachment: {
    bucket: string | null;
    path: string | null;
    name: string | null;
    mimeType: string | null;
    sizeBytes: number | null;
  } | null;
  auditTrail: TeacherActivityAuditEntry[];
};

export type HomeworkListItem = {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  className: string | null;
  section: string | null;
  studentId: string | null;
  studentName: string | null;
  contentKind: string | null;
  dueAt: string | null;
  status: TeacherActivityStatus;
  schoolId: string;
  schoolName: string | null;
  branchId: string | null;
  branchName: string | null;
  teacherId: string | null;
  teacherName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  moderatedAt: string | null;
  moderationReason: string | null;
  attachment: {
    bucket: string | null;
    path: string | null;
    name: string | null;
    mimeType: string | null;
    sizeBytes: number | null;
  } | null;
};

export type HomeworkDetail = HomeworkListItem & {
  metadata: Record<string, unknown> | null;
  auditTrail: TeacherActivityAuditEntry[];
};

export type MonitoringMetaOption = {
  id: string;
  name: string;
};

export type MonitoringStudentOption = {
  id: string;
  fullName: string;
  className: string | null;
  section: string | null;
  branchId: string | null;
};

export type MonitoringMetaResponse = {
  branches: MonitoringMetaOption[];
  teachers: MonitoringMetaOption[];
  classes: string[];
  sections: string[];
  students: MonitoringStudentOption[];
};

export type FeeNotificationInput = {
  schoolId: string | null;
  title: string;
  message: string;
  note: string | null;
  dueAt: string | null;
  deepLink: string | null;
  targetMode: FeeNotificationTargetMode;
  branchId: string | null;
  className: string | null;
  section: string | null;
  studentIds: string[];
};

export type FeeNotificationHistoryItem = {
  id: string;
  title: string;
  message: string;
  note: string | null;
  dueAt: string | null;
  deepLink: string | null;
  targetMode: FeeNotificationTargetMode;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  schoolId: string;
  branchId: string | null;
  branchName: string | null;
  createdBy: string | null;
  createdByName: string | null;
  targetFilters: Record<string, unknown>;
};

export type FeeNotificationDetail = FeeNotificationHistoryItem & {
  recipients: Array<{
    id: string;
    deliveryStatus: string;
    failureReason: string | null;
    studentId: string | null;
    studentName: string | null;
    userId: string | null;
    createdAt: string;
  }>;
  auditTrail: TeacherActivityAuditEntry[];
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown) {
  const normalized = asString(value);
  return normalized.length > 0 ? normalized : null;
}

function asPositiveInteger(value: string | null, fallback: number, min = 1, max = 100) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function parseDate(value: unknown) {
  const normalized = asNullableString(value);
  if (!normalized) return null;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function parseStatus(value: string | null): TeacherActivityStatus | "all" {
  if (!value || value === "all") return "all";
  return TEACHER_ACTIVITY_STATUSES.includes(value as TeacherActivityStatus)
    ? (value as TeacherActivityStatus)
    : "all";
}

function parseSort(value: string | null): TeacherActivitySort {
  if (!value) return "newest";
  return TEACHER_ACTIVITY_SORTS.includes(value as TeacherActivitySort)
    ? (value as TeacherActivitySort)
    : "newest";
}

function readParam(searchParams: URLSearchParams, ...keys: string[]) {
  for (const key of keys) {
    const value = searchParams.get(key);
    if (value !== null) return value;
  }
  return null;
}

export function parseTeacherMessageFilters(searchParams: URLSearchParams): TeacherMessageFilters {
  return {
    schoolId: asNullableString(readParam(searchParams, "schoolId", "school_id")),
    branchId: asNullableString(readParam(searchParams, "branchId", "branch_id")),
    teacherId: asNullableString(readParam(searchParams, "teacherId", "teacher_id")),
    className: asNullableString(readParam(searchParams, "className", "class_name")),
    section: asNullableString(readParam(searchParams, "section")),
    status: parseStatus(readParam(searchParams, "status")),
    search: asString(readParam(searchParams, "search")),
    sort: parseSort(readParam(searchParams, "sort")),
    page: asPositiveInteger(readParam(searchParams, "page"), 1),
    pageSize: asPositiveInteger(readParam(searchParams, "pageSize", "page_size"), 20, 1, 100),
    dateFrom: parseDate(readParam(searchParams, "dateFrom", "date_from")),
    dateTo: parseDate(readParam(searchParams, "dateTo", "date_to")),
    messageType: asNullableString(readParam(searchParams, "messageType", "message_type")),
  };
}

export function parseHomeworkFilters(searchParams: URLSearchParams): HomeworkFilters {
  return {
    schoolId: asNullableString(readParam(searchParams, "schoolId", "school_id")),
    branchId: asNullableString(readParam(searchParams, "branchId", "branch_id")),
    teacherId: asNullableString(readParam(searchParams, "teacherId", "teacher_id")),
    className: asNullableString(readParam(searchParams, "className", "class_name")),
    section: asNullableString(readParam(searchParams, "section")),
    status: parseStatus(readParam(searchParams, "status")),
    search: asString(readParam(searchParams, "search")),
    sort: parseSort(readParam(searchParams, "sort")),
    page: asPositiveInteger(readParam(searchParams, "page"), 1),
    pageSize: asPositiveInteger(readParam(searchParams, "pageSize", "page_size"), 20, 1, 100),
    dateFrom: parseDate(readParam(searchParams, "dateFrom", "date_from")),
    dateTo: parseDate(readParam(searchParams, "dateTo", "date_to")),
    contentKind: asNullableString(readParam(searchParams, "contentKind", "content_kind")),
  };
}

export function validateTeacherMessageModerationInput(body: unknown) {
  const data = (body ?? {}) as Record<string, unknown>;
  const title = asString(data.title);
  const message = asString(data.message);

  if (!title) {
    return { ok: false as const, message: "عنوان الرسالة مطلوب.", fieldErrors: { title: "عنوان الرسالة مطلوب." } };
  }

  if (!message) {
    return { ok: false as const, message: "محتوى الرسالة مطلوب.", fieldErrors: { message: "محتوى الرسالة مطلوب." } };
  }

  const dueAtInput = data.due_at;
  const dueAt = dueAtInput === null || dueAtInput === "" ? null : parseDate(dueAtInput);
  if (dueAtInput !== undefined && dueAtInput !== null && dueAtInput !== "" && !dueAt) {
    return { ok: false as const, message: "تاريخ الاستحقاق غير صالح.", fieldErrors: { due_at: "تاريخ الاستحقاق غير صالح." } };
  }

  return {
    ok: true as const,
    value: {
      title,
      message,
      note: asNullableString(data.note),
      link: asNullableString(data.link),
      dueAt,
      reason: asNullableString(data.reason),
    },
  };
}

export function validateHomeworkModerationInput(body: unknown) {
  const data = (body ?? {}) as Record<string, unknown>;
  const title = asString(data.title);

  if (!title) {
    return { ok: false as const, message: "عنوان الواجب مطلوب.", fieldErrors: { title: "عنوان الواجب مطلوب." } };
  }

  const dueAtInput = data.due_at;
  const dueAt = dueAtInput === null || dueAtInput === "" ? null : parseDate(dueAtInput);
  if (dueAtInput !== undefined && dueAtInput !== null && dueAtInput !== "" && !dueAt) {
    return { ok: false as const, message: "تاريخ التسليم غير صالح.", fieldErrors: { due_at: "تاريخ التسليم غير صالح." } };
  }

  return {
    ok: true as const,
    value: {
      title,
      description: asNullableString(data.description),
      subject: asNullableString(data.subject),
      dueAt,
      reason: asNullableString(data.reason),
      contentKind: asNullableString(data.content_kind),
    },
  };
}

export function validateFeeNotificationInput(body: unknown) {
  const data = (body ?? {}) as Record<string, unknown>;
  const title = asString(data.title);
  const message = asString(data.message);
  const targetMode = asString(data.target_mode) as FeeNotificationTargetMode;

  if (!title) {
    return { ok: false as const, message: "عنوان الإشعار مطلوب.", fieldErrors: { title: "عنوان الإشعار مطلوب." } };
  }

  if (!message) {
    return { ok: false as const, message: "نص الإشعار مطلوب.", fieldErrors: { message: "نص الإشعار مطلوب." } };
  }

  if (!FEE_NOTIFICATION_TARGET_MODES.includes(targetMode)) {
    return { ok: false as const, message: "نوع الاستهداف غير مدعوم.", fieldErrors: { target_mode: "نوع الاستهداف غير مدعوم." } };
  }

  const dueAtInput = data.due_at;
  const dueAt = dueAtInput === null || dueAtInput === "" ? null : parseDate(dueAtInput);
  if (dueAtInput !== undefined && dueAtInput !== null && dueAtInput !== "" && !dueAt) {
    return { ok: false as const, message: "تاريخ الاستحقاق غير صالح.", fieldErrors: { due_at: "تاريخ الاستحقاق غير صالح." } };
  }

  const studentIds = Array.isArray(data.student_ids)
    ? Array.from(
        new Set(
          data.student_ids.filter((item): item is string => typeof item === "string" && item.trim().length > 0),
        ),
      )
    : [];

  if (targetMode === "branch" && !asNullableString(data.branch_id)) {
    return { ok: false as const, message: "يجب تحديد الفرع لهذا النوع من الاستهداف.", fieldErrors: { branch_id: "اختر فرعاً واحداً على الأقل." } };
  }

  if (targetMode === "class_section" && !asNullableString(data.class_name)) {
    return { ok: false as const, message: "يجب تحديد الصف لهذا النوع من الاستهداف.", fieldErrors: { class_name: "اختر الصف المطلوب." } };
  }

  if (targetMode === "specific_students" && studentIds.length === 0) {
    return { ok: false as const, message: "اختر طالباً واحداً على الأقل.", fieldErrors: { student_ids: "حدد الطلاب المستهدفين." } };
  }

  return {
    ok: true as const,
    value: {
      schoolId: asNullableString(data.school_id ?? data.schoolId),
      title,
      message,
      note: asNullableString(data.note),
      dueAt,
      deepLink: asNullableString(data.deep_link ?? data.deepLink),
      targetMode,
      branchId: asNullableString(data.branch_id ?? data.branchId),
      className: asNullableString(data.class_name ?? data.className),
      section: asNullableString(data.section),
      studentIds,
    } satisfies FeeNotificationInput,
  };
}
