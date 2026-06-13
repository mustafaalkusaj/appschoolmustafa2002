import { isMissingColumnError, isMissingTableError } from "@/lib/admin-infrastructure";
import type { ManagedTeacherAssignmentRecord } from "@/lib/managed-users";
import { tableHasColumn } from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

export type AcademicFeatureGate = {
  available: boolean;
  code?: "missing_table" | "forbidden" | "unknown";
  message?: string;
};

export interface AcademicMutationResult {
  ok: boolean;
  gate: AcademicFeatureGate;
  message: string | null;
  affectedCount?: number;
}

export interface TeacherAssignmentCreateInput {
  title?: unknown;
  description?: unknown;
  subject?: unknown;
  class_name?: unknown;
  section?: unknown;
  student_id?: unknown;
  due_at?: unknown;
  content_kind?: unknown;
  attachment?: unknown;
  metadata?: unknown;
}

export interface TeacherGradeCreateInput {
  student_id?: unknown;
  subject?: unknown;
  exam_type?: unknown;
  score?: unknown;
  max_score?: unknown;
  note?: unknown;
}

type ServiceSupabaseClient = ReturnType<typeof createServiceSupabaseClient>;

export interface AcademicTeacherRouteContext {
  schoolId: string;
  account: {
    teacher: {
      id: string;
      assignments: ManagedTeacherAssignmentRecord[];
    } | null;
  };
  serviceSupabase: ServiceSupabaseClient;
}

const AVAILABLE_GATE: AcademicFeatureGate = { available: true };

type LookupRecord = Record<string, unknown>;
type StudentScopeRecord = {
  id: string;
  full_name: string;
  class_name: string | null;
  section: string | null;
};

type TableColumnSupport = Record<string, boolean>;

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

function featureGateFromError(error: unknown, fallbackName: string): AcademicFeatureGate {
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

function asObject(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value: unknown) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizeLookupKey(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function getClassLookupName(row: LookupRecord | null | undefined) {
  return normalizeText(row?.name) || normalizeText(row?.grade);
}

function getSectionLookupName(row: LookupRecord | null | undefined) {
  return normalizeText(row?.section) || normalizeText(row?.name);
}

function matchesLookupText(left: unknown, right: unknown) {
  const normalizedLeft = normalizeLookupKey(left);
  const normalizedRight = normalizeLookupKey(right);
  return Boolean(normalizedLeft) && normalizedLeft === normalizedRight;
}

function normalizeContentKind(value: unknown) {
  return normalizeText(value).toLowerCase() === "exam_material" ? "exam_material" : "homework";
}

function normalizeIsoTimestamp(value: unknown) {
  const raw = normalizeText(value);
  if (!raw) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return `${raw}T12:00:00.000Z`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function extractAttachmentMetadata(value: unknown) {
  const row = asObject(value);
  const bucket = nullableText(row.bucket);
  const path = nullableText(row.path);

  if (!bucket || !path) {
    return {
      attachment: null,
      metadata: {
        attachment_bucket: null,
        attachment_path: null,
        attachment_name: null,
        attachment_mime_type: null,
        attachment_size_bytes: null,
        attachment_kind: null,
      },
    };
  }

  const attachment = {
    bucket,
    path,
    file_name: nullableText(row.file_name) ?? path.split("/").filter(Boolean).pop() ?? "attachment",
    mime_type: nullableText(row.mime_type),
    size_bytes: normalizeNumber(row.size_bytes),
    kind: nullableText(row.kind),
  };

  return {
    attachment,
    metadata: {
      attachment_bucket: attachment.bucket,
      attachment_path: attachment.path,
      attachment_name: attachment.file_name,
      attachment_mime_type: attachment.mime_type,
      attachment_size_bytes: attachment.size_bytes,
      attachment_kind: attachment.kind,
    },
  };
}

async function safeTableHasColumn(client: ServiceSupabaseClient, table: string, column: string) {
  try {
    return await tableHasColumn(client as never, table, column);
  } catch (error) {
    if (isMissingTableError(error, table) || readErrorMessage(error, "").toLowerCase().includes("could not find")) {
      return false;
    }

    throw error;
  }
}

async function loadColumnSupport(client: ServiceSupabaseClient, table: string, columns: string[]) {
  const entries = await Promise.all(
    columns.map(async (column) => [column, await safeTableHasColumn(client, table, column)] as const),
  );

  return Object.fromEntries(entries) as TableColumnSupport;
}

async function resolveScopedStudent(
  client: ServiceSupabaseClient,
  schoolId: string,
  studentId: string,
): Promise<StudentScopeRecord | null> {
  const studentsHaveSchoolId = await safeTableHasColumn(client, "students", "school_id");
  let query = client
    .from("students")
    .select("id, full_name, class_name, section")
    .eq("id", studentId)
    .limit(1);

  if (studentsHaveSchoolId) {
    query = query.eq("school_id", schoolId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw error;
  }

  if (!data?.id) {
    return null;
  }

  return {
    id: String(data.id),
    full_name: normalizeText(data.full_name) || "طالب",
    class_name: nullableText(data.class_name),
    section: nullableText(data.section),
  };
}

async function resolveSubjectId(
  client: ServiceSupabaseClient,
  schoolId: string,
  subjectName: string | null,
) {
  const normalizedSubject = nullableText(subjectName);
  if (!normalizedSubject) {
    return null;
  }

  const subjectsHasId = await safeTableHasColumn(client, "subjects", "id");
  const subjectsHasName = await safeTableHasColumn(client, "subjects", "name");
  if (!subjectsHasId || !subjectsHasName) {
    return null;
  }

  const subjectColumns = await loadColumnSupport(client, "subjects", ["school_id", "is_active"]);

  let lookup = client.from("subjects").select("id, name");
  if (subjectColumns.school_id) {
    lookup = lookup.eq("school_id", schoolId);
  }

  const { data: existingRows, error: existingError } = await lookup;
  if (existingError) {
    throw existingError;
  }

  const existingMatch = ((existingRows ?? []) as LookupRecord[]).find((row) =>
    matchesLookupText(row.name, normalizedSubject),
  );

  if (existingMatch?.id) {
    return String(existingMatch.id);
  }

  const insertPayload: Record<string, unknown> = {
    name: normalizedSubject,
  };

  if (subjectColumns.school_id) {
    insertPayload.school_id = schoolId;
  }

  if (subjectColumns.is_active) {
    insertPayload.is_active = true;
  }

  const { data: insertedRow, error: insertError } = await client
    .from("subjects")
    .insert(insertPayload)
    .select("id")
    .maybeSingle();

  if (!insertError && insertedRow?.id) {
    return String(insertedRow.id);
  }

  if (insertError && !isMissingColumnError(insertError)) {
    const { data: retryRows, error: retryError } = await lookup;
    if (retryError) {
      throw retryError;
    }

    const retryMatch = ((retryRows ?? []) as LookupRecord[]).find((row) =>
      matchesLookupText(row.name, normalizedSubject),
    );

    if (retryMatch?.id) {
      return String(retryMatch.id);
    }

    throw insertError;
  }

  return null;
}

async function resolveClassScopeIds(
  client: ServiceSupabaseClient,
  schoolId: string,
  className: string | null,
  section: string | null,
) {
  const normalizedClassName = nullableText(className);
  if (!normalizedClassName) {
    return {
      classId: null,
      sectionId: null,
    };
  }

  const classesHasId = await safeTableHasColumn(client, "classes", "id");
  if (!classesHasId) {
    return {
      classId: null,
      sectionId: null,
    };
  }

  const classesHaveSchoolId = await safeTableHasColumn(client, "classes", "school_id");

  let classQuery = client.from("classes").select("*");
  if (classesHaveSchoolId) {
    classQuery = classQuery.eq("school_id", schoolId);
  }

  const { data: classRows, error: classError } = await classQuery;
  if (classError) {
    throw classError;
  }

  const matchingClassRows = ((classRows ?? []) as LookupRecord[]).filter((row) =>
    matchesLookupText(getClassLookupName(row), normalizedClassName),
  );

  if (matchingClassRows.length === 0) {
    throw new Error(`الصف "${normalizedClassName}" غير موجود ضمن إعدادات المدرسة الحالية.`);
  }

  const normalizedSection = nullableText(section);
  const legacySectionMatch = normalizedSection
    ? matchingClassRows.find((row) => matchesLookupText(getSectionLookupName(row), normalizedSection))
    : null;

  if (legacySectionMatch?.id) {
    return {
      classId: String(legacySectionMatch.id),
      sectionId: null,
    };
  }

  const preferredClassRow = matchingClassRows.find((row) => !getSectionLookupName(row)) ?? matchingClassRows[0];

  if (!normalizedSection) {
    return {
      classId: String(preferredClassRow.id),
      sectionId: null,
    };
  }

  const sectionsHasId = await safeTableHasColumn(client, "sections", "id");
  const sectionsHaveClassId = await safeTableHasColumn(client, "sections", "class_id");
  if (!sectionsHasId || !sectionsHaveClassId) {
    throw new Error(`الشعبة "${normalizedSection}" غير موجودة ضمن الصف "${normalizedClassName}".`);
  }

  const sectionsHaveSchoolId = await safeTableHasColumn(client, "sections", "school_id");

  let sectionQuery = client.from("sections").select("*").eq("class_id", preferredClassRow.id);
  if (sectionsHaveSchoolId) {
    sectionQuery = sectionQuery.eq("school_id", schoolId);
  }

  const { data: sectionRows, error: sectionError } = await sectionQuery;
  if (sectionError) {
    throw sectionError;
  }

  const sectionRow = ((sectionRows ?? []) as LookupRecord[]).find((row) =>
    matchesLookupText(getSectionLookupName(row), normalizedSection),
  );

  if (!sectionRow?.id) {
    throw new Error(`الشعبة "${normalizedSection}" غير موجودة ضمن الصف "${normalizedClassName}".`);
  }

  return {
    classId: String(preferredClassRow.id),
    sectionId: String(sectionRow.id),
  };
}

export function teacherHasSubjectScope(
  assignments: ManagedTeacherAssignmentRecord[],
  subject: string | null,
  className: string | null,
  section: string | null,
) {
  const normalizedClassName = normalizeLookupKey(className);
  if (!normalizedClassName) {
    return false;
  }

  const normalizedSubject = normalizeLookupKey(subject);
  const normalizedSection = normalizeLookupKey(section);

  return assignments.some((assignment) => {
    if (normalizeLookupKey(assignment.class_name) !== normalizedClassName) {
      return false;
    }

    if (normalizedSubject && normalizeLookupKey(assignment.subject_name) !== normalizedSubject) {
      return false;
    }

    const assignmentSection = normalizeLookupKey(assignment.section_name);

    if (!normalizedSection) {
      return !assignmentSection;
    }

    return !assignmentSection || assignmentSection === normalizedSection;
  });
}

async function loadTeacherTableSupport(client: ServiceSupabaseClient, table: "assignments" | "grades") {
  if (!await safeTableHasColumn(client, table, "id")) {
    return null;
  }

  const columns =
    table === "assignments"
      ? [
          "subject_id",
          "class_id",
          "section_id",
          "content_kind",
          "metadata",
          "attachment_bucket",
          "attachment_path",
          "attachment_name",
          "attachment_mime_type",
          "attachment_size_bytes",
        ]
      : ["subject_id", "class_id", "section_id", "assignment_id"];

  return loadColumnSupport(client, table, columns);
}

function mergeMetadata(base: unknown, extra: Record<string, unknown>) {
  return {
    ...asObject(base),
    ...extra,
  };
}

export async function createTeacherAssignmentRecord(
  ctx: AcademicTeacherRouteContext,
  input: TeacherAssignmentCreateInput,
): Promise<AcademicMutationResult> {
  const teacher = ctx.account.teacher;

  if (!teacher?.id) {
    return {
      ok: false,
      gate: AVAILABLE_GATE,
      message: "حساب المعلم الحالي غير مرتبط بسجل صالح.",
    };
  }

  const columnSupport = await loadTeacherTableSupport(ctx.serviceSupabase, "assignments");
  if (!columnSupport) {
    const gate = featureGateFromError({ message: "Could not find the table 'public.assignments' in the schema cache" }, "assignments");
    return {
      ok: false,
      gate,
      message: gate.message ?? "جدول assignments غير جاهز بعد.",
    };
  }

  const title = normalizeText(input.title).slice(0, 240);
  if (!title) {
    return {
      ok: false,
      gate: AVAILABLE_GATE,
      message: "أدخل عنوان الواجب أولاً.",
    };
  }

  const description = nullableText(input.description);
  const requestedStudentId = nullableText(input.student_id);
  const contentKind = normalizeContentKind(input.content_kind);
  const dueAt = normalizeIsoTimestamp(input.due_at);

  let scopedStudent: StudentScopeRecord | null = null;
  let className = nullableText(input.class_name);
  let section = nullableText(input.section);

  if (requestedStudentId) {
    scopedStudent = await resolveScopedStudent(ctx.serviceSupabase, ctx.schoolId, requestedStudentId);
    if (!scopedStudent) {
      return {
        ok: false,
        gate: AVAILABLE_GATE,
        message: "الطالب المحدد غير موجود داخل المدرسة الحالية.",
      };
    }

    className = scopedStudent.class_name;
    section = scopedStudent.section;
  }

  const subject =
    nullableText(input.subject) ??
    teacher.assignments.find((assignment) => assignment.is_active)?.subject_name ??
    teacher.assignments[0]?.subject_name ??
    null;

  if (!subject) {
    return {
      ok: false,
      gate: AVAILABLE_GATE,
      message: "اختر المادة أولاً قبل نشر الواجب.",
    };
  }

  if (!className) {
    return {
      ok: false,
      gate: AVAILABLE_GATE,
      message: "اختر الصف المستهدف أولاً.",
    };
  }

  if (!teacherHasSubjectScope(teacher.assignments, subject, className, section)) {
    return {
      ok: false,
      gate: AVAILABLE_GATE,
      message: "لا يمكن إنشاء واجب خارج المادة والصفوف والشعب المسندة لهذا المعلم.",
    };
  }

  let subjectId: string | null = null;
  let scopeIds = { classId: null as string | null, sectionId: null as string | null };

  try {
    [subjectId, scopeIds] = await Promise.all([
      resolveSubjectId(ctx.serviceSupabase, ctx.schoolId, subject),
      resolveClassScopeIds(ctx.serviceSupabase, ctx.schoolId, className, section),
    ]);
  } catch (error) {
    return {
      ok: false,
      gate: AVAILABLE_GATE,
      message: readErrorMessage(error, "تعذر تحديد المادة أو الصف أو الشعبة للواجب."),
    };
  }

  const attachment = extractAttachmentMetadata(input.attachment);
  const payload: Record<string, unknown> = {
    school_id: ctx.schoolId,
    teacher_id: teacher.id,
    student_id: scopedStudent?.id ?? null,
    class_name: className,
    section,
    subject,
    title,
    description,
    due_at: dueAt,
  };

  if (columnSupport.subject_id) {
    payload.subject_id = subjectId;
  }

  if (columnSupport.class_id) {
    payload.class_id = scopeIds.classId;
  }

  if (columnSupport.section_id) {
    payload.section_id = scopeIds.sectionId;
  }

  if (columnSupport.content_kind) {
    payload.content_kind = contentKind;
  }

  if (columnSupport.metadata) {
    payload.metadata = mergeMetadata(input.metadata, {
      content_kind: contentKind,
      target_mode: scopedStudent?.id ? "student" : section ? "section" : "class",
      ...attachment.metadata,
    });
  }

  if (columnSupport.attachment_bucket) {
    payload.attachment_bucket = attachment.attachment?.bucket ?? null;
  }

  if (columnSupport.attachment_path) {
    payload.attachment_path = attachment.attachment?.path ?? null;
  }

  if (columnSupport.attachment_name) {
    payload.attachment_name = attachment.attachment?.file_name ?? null;
  }

  if (columnSupport.attachment_mime_type) {
    payload.attachment_mime_type = attachment.attachment?.mime_type ?? null;
  }

  if (columnSupport.attachment_size_bytes) {
    payload.attachment_size_bytes = attachment.attachment?.size_bytes ?? null;
  }

  const { data, error } = await ctx.serviceSupabase.from("assignments").insert(payload).select("id");

  if (error) {
    return {
      ok: false,
      gate: featureGateFromError(error, "assignments"),
      message: readErrorMessage(error, "تعذر حفظ الواجب."),
    };
  }

  // Event-driven notification — additive, never blocks the write.
  try {
    const { notifyNewAssignment } = await import("@/lib/notify-events");
    await notifyNewAssignment({
      supabase: ctx.serviceSupabase,
      schoolId: ctx.schoolId,
      studentIds: scopedStudent?.id ? [scopedStudent.id] : undefined,
      className,
      section,
      title,
      subject,
      dueAt,
    });
  } catch {
    // notification failure must never break the assignment write
  }

  return {
    ok: true,
    gate: AVAILABLE_GATE,
    message: "تم حفظ الواجب بنجاح.",
    affectedCount: data?.length ?? 1,
  };
}

export async function createTeacherGradeRecord(
  ctx: AcademicTeacherRouteContext,
  input: TeacherGradeCreateInput,
): Promise<AcademicMutationResult> {
  const teacher = ctx.account.teacher;

  if (!teacher?.id) {
    return {
      ok: false,
      gate: AVAILABLE_GATE,
      message: "حساب المعلم الحالي غير مرتبط بسجل صالح.",
    };
  }

  const columnSupport = await loadTeacherTableSupport(ctx.serviceSupabase, "grades");
  if (!columnSupport) {
    const gate = featureGateFromError({ message: "Could not find the table 'public.grades' in the schema cache" }, "grades");
    return {
      ok: false,
      gate,
      message: gate.message ?? "جدول grades غير جاهز بعد.",
    };
  }

  const studentId = nullableText(input.student_id);
  if (!studentId) {
    return {
      ok: false,
      gate: AVAILABLE_GATE,
      message: "اختر طالبًا أولاً.",
    };
  }

  const score = normalizeNumber(input.score);
  if (score === null) {
    return {
      ok: false,
      gate: AVAILABLE_GATE,
      message: "أدخل درجة صحيحة.",
    };
  }

  const maxScore = normalizeNumber(input.max_score);
  if (maxScore !== null && maxScore <= 0) {
    return {
      ok: false,
      gate: AVAILABLE_GATE,
      message: "الدرجة النهائية يجب أن تكون أكبر من صفر.",
    };
  }

  const scopedStudent = await resolveScopedStudent(ctx.serviceSupabase, ctx.schoolId, studentId);
  if (!scopedStudent) {
    return {
      ok: false,
      gate: AVAILABLE_GATE,
      message: "الطالب المحدد غير موجود داخل المدرسة الحالية.",
    };
  }

  const subject =
    nullableText(input.subject) ??
    teacher.assignments.find((assignment) => assignment.is_active)?.subject_name ??
    teacher.assignments[0]?.subject_name ??
    null;

  if (!subject) {
    return {
      ok: false,
      gate: AVAILABLE_GATE,
      message: "اختر المادة أولاً قبل حفظ الدرجة.",
    };
  }

  if (!scopedStudent.class_name) {
    return {
      ok: false,
      gate: AVAILABLE_GATE,
      message: "الطالب المحدد لا يملك صفًا صالحًا.",
    };
  }

  if (!teacherHasSubjectScope(teacher.assignments, subject, scopedStudent.class_name, scopedStudent.section)) {
    return {
      ok: false,
      gate: AVAILABLE_GATE,
      message: "لا يمكن تسجيل درجة لطالب خارج المادة والصفوف والشعب المسندة لهذا المعلم.",
    };
  }

  let subjectId: string | null = null;
  let scopeIds = { classId: null as string | null, sectionId: null as string | null };

  try {
    [subjectId, scopeIds] = await Promise.all([
      resolveSubjectId(ctx.serviceSupabase, ctx.schoolId, subject),
      resolveClassScopeIds(ctx.serviceSupabase, ctx.schoolId, scopedStudent.class_name, scopedStudent.section),
    ]);
  } catch (error) {
    return {
      ok: false,
      gate: AVAILABLE_GATE,
      message: readErrorMessage(error, "تعذر تحديد المادة أو الصف أو الشعبة للدرجة."),
    };
  }

  const payload: Record<string, unknown> = {
    school_id: ctx.schoolId,
    teacher_id: teacher.id,
    student_id: scopedStudent.id,
    subject,
    exam_type: nullableText(input.exam_type),
    score,
    max_score: maxScore,
    note: nullableText(input.note),
    graded_at: new Date().toISOString(),
  };

  if (columnSupport.subject_id) {
    payload.subject_id = subjectId;
  }

  if (columnSupport.class_id) {
    payload.class_id = scopeIds.classId;
  }

  if (columnSupport.section_id) {
    payload.section_id = scopeIds.sectionId;
  }

  const { data, error } = await ctx.serviceSupabase.from("grades").insert(payload).select("id");

  if (error) {
    return {
      ok: false,
      gate: featureGateFromError(error, "grades"),
      message: readErrorMessage(error, "تعذر حفظ الدرجة."),
    };
  }

  // Event-driven notification — additive, never blocks the write.
  try {
    const { notifyNewGrade } = await import("@/lib/notify-events");
    await notifyNewGrade({
      supabase: ctx.serviceSupabase,
      schoolId: ctx.schoolId,
      studentId: scopedStudent.id,
      subject,
      score,
      maxScore,
    });
  } catch {
    // notification failure must never break the grade write
  }

  return {
    ok: true,
    gate: AVAILABLE_GATE,
    message: "تم حفظ الدرجة بنجاح.",
    affectedCount: data?.length ?? 1,
  };
}

async function fetchLookupMap(
  client: ServiceSupabaseClient,
  table: string,
  ids: string[],
  select: string,
  key: string,
) {
  if (ids.length === 0) {
    return new Map<string, LookupRecord>();
  }

  try {
    const { data, error } = await client.from(table).select(select).in(key, ids);
    if (error) {
      throw error;
    }

    return new Map(
      ((data ?? []) as unknown as LookupRecord[])
        .map((row) => {
          const id = nullableText(row[key]);
          return id ? [id, row] : null;
        })
        .filter((entry): entry is [string, LookupRecord] => Boolean(entry)),
    );
  } catch (error) {
    if (isMissingTableError(error, table) || isMissingColumnError(error)) {
      return new Map<string, LookupRecord>();
    }

    throw error;
  }
}

export async function enrichAssignmentRows(
  client: ServiceSupabaseClient,
  rows: Record<string, unknown>[],
) {
  const normalizedRows = rows.map((row) => asObject(row));
  const studentIds = Array.from(
    new Set(normalizedRows.map((row) => nullableText(row.student_id)).filter((value): value is string => Boolean(value))),
  );
  const teacherIds = Array.from(
    new Set(normalizedRows.map((row) => nullableText(row.teacher_id)).filter((value): value is string => Boolean(value))),
  );
  const subjectIds = Array.from(
    new Set(normalizedRows.map((row) => nullableText(row.subject_id)).filter((value): value is string => Boolean(value))),
  );

  const [studentsById, teachersById, subjectsById] = await Promise.all([
    fetchLookupMap(client, "students", studentIds, "id, full_name, class_name, section", "id"),
    fetchLookupMap(client, "teachers", teacherIds, "id, full_name", "id"),
    fetchLookupMap(client, "subjects", subjectIds, "id, name", "id"),
  ]);

  return normalizedRows.map((row) => {
    const student = nullableText(row.student_id) ? studentsById.get(String(row.student_id)) ?? null : null;
    const teacher = nullableText(row.teacher_id) ? teachersById.get(String(row.teacher_id)) ?? null : null;
    const subject = nullableText(row.subject_id) ? subjectsById.get(String(row.subject_id)) ?? null : null;

    return {
      ...row,
      class_name: nullableText(row.class_name) ?? nullableText(student?.class_name),
      section: nullableText(row.section) ?? nullableText(student?.section),
      subject: nullableText(row.subject) ?? nullableText(subject?.name),
      student_name: nullableText(student?.full_name),
      teacher_name: nullableText(teacher?.full_name),
    };
  });
}

export async function enrichGradeRows(
  client: ServiceSupabaseClient,
  rows: Record<string, unknown>[],
) {
  const normalizedRows = rows.map((row) => asObject(row));
  const studentIds = Array.from(
    new Set(normalizedRows.map((row) => nullableText(row.student_id)).filter((value): value is string => Boolean(value))),
  );
  const teacherIds = Array.from(
    new Set(normalizedRows.map((row) => nullableText(row.teacher_id)).filter((value): value is string => Boolean(value))),
  );
  const subjectIds = Array.from(
    new Set(normalizedRows.map((row) => nullableText(row.subject_id)).filter((value): value is string => Boolean(value))),
  );

  const [studentsById, teachersById, subjectsById] = await Promise.all([
    fetchLookupMap(client, "students", studentIds, "id, full_name, class_name, section", "id"),
    fetchLookupMap(client, "teachers", teacherIds, "id, full_name", "id"),
    fetchLookupMap(client, "subjects", subjectIds, "id, name", "id"),
  ]);

  return normalizedRows.map((row) => {
    const student = nullableText(row.student_id) ? studentsById.get(String(row.student_id)) ?? null : null;
    const teacher = nullableText(row.teacher_id) ? teachersById.get(String(row.teacher_id)) ?? null : null;
    const subject = nullableText(row.subject_id) ? subjectsById.get(String(row.subject_id)) ?? null : null;

    return {
      ...row,
      subject: nullableText(row.subject) ?? nullableText(subject?.name),
      student_name: nullableText(student?.full_name),
      class_name: nullableText(student?.class_name),
      section: nullableText(student?.section),
      teacher_name: nullableText(teacher?.full_name),
    };
  });
}
