import "server-only"
import type { SupabaseClient } from '@supabase/supabase-js'
import type { GradeEntry, GradeEntryInput, GradeEntryUpdate } from './types'
import { computeGradeLabel, computePercentage } from './grade-calculator'

// ---------------------------------------------------------------------------
// Feature gate type (mirrors AcademicFeatureGate in academic-records-server)
// ---------------------------------------------------------------------------

export type GradeFeatureGate = {
  available: boolean
  code?: 'missing_table' | 'forbidden' | 'unknown'
  message?: string
}

const AVAILABLE_GATE: GradeFeatureGate = { available: true }

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type LookupRecord = Record<string, unknown>

function nullableText(value: unknown): string | null {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return normalized || null
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : String(value ?? '')
}

function featureGateFromError(error: unknown, tableName: string): GradeFeatureGate {
  const msg =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message).toLowerCase()
        : ''

  if (msg.includes('could not find the table') || msg.includes(`"${tableName}"`)) {
    return {
      available: false,
      code: 'missing_table',
      message: `جدول ${tableName} غير جاهز بعد في Supabase.`,
    }
  }

  if (msg.includes('permission') || msg.includes('unauthorized') || msg.includes('not allowed')) {
    return {
      available: false,
      code: 'forbidden',
      message: `لا توجد صلاحية كافية للوصول إلى ${tableName}.`,
    }
  }

  return {
    available: false,
    code: 'unknown',
    message:
      error instanceof Error && error.message.trim()
        ? error.message
        : `تعذر تحميل ${tableName}.`,
  }
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    const msg = ((error as { message: string }).message).trim()
    if (msg) return msg
  }
  return fallback
}

function isMissingTableError(error: unknown): boolean {
  const msg =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : ''
  return msg.includes('could not find the table')
}

async function fetchLookupMap(
  client: SupabaseClient,
  table: string,
  ids: string[],
  selectCols: string,
  keyCol: string,
): Promise<Map<string, LookupRecord>> {
  if (ids.length === 0) return new Map()

  try {
    const { data, error } = await client.from(table).select(selectCols).in(keyCol, ids)
    if (error) throw error

    return new Map(
      ((data ?? []) as unknown as LookupRecord[])
        .map((row) => {
          const id = nullableText(row[keyCol])
          return id ? ([id, row] as [string, LookupRecord]) : null
        })
        .filter((entry): entry is [string, LookupRecord] => Boolean(entry)),
    )
  } catch {
    return new Map()
  }
}

async function enrichGradeEntryRows(
  client: SupabaseClient,
  rows: LookupRecord[],
): Promise<GradeEntry[]> {
  const studentIds = Array.from(
    new Set(
      rows
        .map((r) => nullableText(r.student_id))
        .filter((v): v is string => Boolean(v)),
    ),
  )
  const teacherIds = Array.from(
    new Set(
      rows
        .map((r) => nullableText(r.teacher_id))
        .filter((v): v is string => Boolean(v)),
    ),
  )
  const subjectIds = Array.from(
    new Set(
      rows
        .map((r) => nullableText(r.subject_id))
        .filter((v): v is string => Boolean(v)),
    ),
  )
  const sectionIds = Array.from(
    new Set(
      rows
        .map((r) => nullableText(r.section_id))
        .filter((v): v is string => Boolean(v)),
    ),
  )
  const classIds = Array.from(
    new Set(
      rows
        .map((r) => nullableText(r.class_id))
        .filter((v): v is string => Boolean(v)),
    ),
  )

  const [studentsById, teachersById, subjectsById, sectionsById, classesById] = await Promise.all([
    fetchLookupMap(client, 'students', studentIds, 'id, full_name', 'id'),
    fetchLookupMap(client, 'teachers', teacherIds, 'id, full_name', 'id'),
    fetchLookupMap(client, 'subjects', subjectIds, 'id, name', 'id'),
    fetchLookupMap(client, 'sections', sectionIds, 'id, name', 'id'),
    fetchLookupMap(client, 'classes', classIds, 'id, name', 'id'),
  ])

  return rows.map((row) => {
    const student = nullableText(row.student_id)
      ? (studentsById.get(asString(row.student_id)) ?? null)
      : null
    const teacher = nullableText(row.teacher_id)
      ? (teachersById.get(asString(row.teacher_id)) ?? null)
      : null
    const subject = nullableText(row.subject_id)
      ? (subjectsById.get(asString(row.subject_id)) ?? null)
      : null
    const section = nullableText(row.section_id)
      ? (sectionsById.get(asString(row.section_id)) ?? null)
      : null
    const cls = nullableText(row.class_id)
      ? (classesById.get(asString(row.class_id)) ?? null)
      : null

    return {
      ...(row as unknown as GradeEntry),
      student_name: nullableText(student?.full_name),
      subject_name: nullableText(subject?.name),
      teacher_name: nullableText(teacher?.full_name) ?? nullableText(row.teacher_name),
      section_name: nullableText(section?.name),
      class_name: nullableText(cls?.name),
    }
  })
}

// ---------------------------------------------------------------------------
// Audit log helper (fire-and-forget)
// ---------------------------------------------------------------------------

async function writeGradeAuditLog(
  client: SupabaseClient,
  schoolId: string,
  gradeEntryId: string,
  changedBy: string,
  changes: Array<{ field: string; oldValue: unknown; newValue: unknown }>,
  reason?: string,
): Promise<void> {
  if (changes.length === 0) return

  const rows = changes.map((c) => ({
    school_id: schoolId,
    grade_entry_id: gradeEntryId,
    changed_by: changedBy,
    changed_at: new Date().toISOString(),
    field_name: c.field,
    old_value: c.oldValue !== null && c.oldValue !== undefined ? String(c.oldValue) : null,
    new_value: c.newValue !== null && c.newValue !== undefined ? String(c.newValue) : null,
    reason: reason ?? null,
  }))

  try {
    await client.from('grade_audit_log').insert(rows)
  } catch {
    // fire-and-forget: audit failures must never propagate
  }
}

/**
 * Collect changes between old and new entry for audit logging.
 * Tracks score, max_score, grade_type_id, note.
 */
function collectEntryChanges(
  prev: LookupRecord,
  next: Partial<GradeEntryInput & GradeEntryUpdate>,
): Array<{ field: string; oldValue: unknown; newValue: unknown }> {
  const trackedFields = ['score', 'max_score', 'grade_type_id', 'grade_type_name', 'note'] as const
  const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = []

  for (const field of trackedFields) {
    if (field in next && next[field] !== prev[field]) {
      changes.push({ field, oldValue: prev[field] ?? null, newValue: next[field] ?? null })
    }
  }

  return changes
}

// ---------------------------------------------------------------------------
// Resolve grade label safely
// ---------------------------------------------------------------------------

function resolveGradeLabel(score: number, maxScore: number): string {
  const pct = maxScore > 0 ? computePercentage(score, maxScore) : 0
  return computeGradeLabel(pct).labelAr
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface GradeEntriesFilter {
  classId?: string
  sectionId?: string
  subjectId?: string
  studentId?: string
  /** When set, restricts results to entries whose student_id is in this list (branch isolation). */
  studentIds?: string[]
  gradeTypeId?: string
  academicYear: string
  semester?: 1 | 2
  status?: import('./types').GradeStatus
}

export interface GradeEntriesResult {
  ok: boolean
  gate: GradeFeatureGate
  items: GradeEntry[]
}

/**
 * Fetch grade entries for a given scope (class/section/subject/student).
 * In the new system, each row is an individual entry — no empty row seeding.
 */
export async function fetchGradeEntries(
  serviceSupabase: SupabaseClient,
  schoolId: string,
  filters: GradeEntriesFilter,
): Promise<GradeEntriesResult> {
  try {
    let query = serviceSupabase
      .from('grade_entries')
      .select('*')
      .eq('school_id', schoolId)
      .eq('academic_year', filters.academicYear)
      .order('created_at', { ascending: false })

    if (filters.classId) query = query.eq('class_id', filters.classId)
    if (filters.sectionId) query = query.eq('section_id', filters.sectionId)
    if (filters.subjectId) query = query.eq('subject_id', filters.subjectId)
    if (filters.studentId) query = query.eq('student_id', filters.studentId)
    if (filters.studentIds && filters.studentIds.length > 0) query = query.in('student_id', filters.studentIds)
    if (filters.gradeTypeId) query = query.eq('grade_type_id', filters.gradeTypeId)
    if (filters.semester) query = query.eq('semester', filters.semester)
    if (filters.status) query = query.eq('status', filters.status)

    const { data, error } = await query

    if (error) {
      if (isMissingTableError(error)) {
        return {
          ok: false,
          gate: { available: false, code: 'missing_table', message: 'جدول grade_entries غير جاهز بعد.' },
          items: [],
        }
      }
      throw error
    }

    const rows = (data ?? []) as unknown as LookupRecord[]
    const items = await enrichGradeEntryRows(serviceSupabase, rows)

    return { ok: true, gate: AVAILABLE_GATE, items }
  } catch (err) {
    return {
      ok: false,
      gate: featureGateFromError(err, 'grade_entries'),
      items: [],
    }
  }
}

/**
 * @deprecated Use fetchGradeEntries instead. Kept for backward compatibility.
 */
export const fetchGradeEntriesForSection = fetchGradeEntries

export interface StudentGradeHistoryResult {
  ok: boolean
  gate: GradeFeatureGate
  items: GradeEntry[]
}

/**
 * Fetch the full grade history for one student.
 * Items are returned sorted newest first; callers group them as needed.
 */
export async function fetchStudentGradeHistory(
  serviceSupabase: SupabaseClient,
  schoolId: string,
  studentId: string,
): Promise<StudentGradeHistoryResult> {
  try {
    const { data, error } = await serviceSupabase
      .from('grade_entries')
      .select('*')
      .eq('school_id', schoolId)
      .eq('student_id', studentId)
      .order('academic_year', { ascending: false })
      .order('semester', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      if (isMissingTableError(error)) {
        return {
          ok: false,
          gate: { available: false, code: 'missing_table', message: 'جدول grade_entries غير جاهز بعد.' },
          items: [],
        }
      }
      throw error
    }

    const rows = (data ?? []) as unknown as LookupRecord[]
    const items = await enrichGradeEntryRows(serviceSupabase, rows)

    return { ok: true, gate: AVAILABLE_GATE, items }
  } catch (err) {
    return {
      ok: false,
      gate: featureGateFromError(err, 'grade_entries'),
      items: [],
    }
  }
}

export interface GradeEntryMutationResult {
  ok: boolean
  gate: GradeFeatureGate
  entry?: GradeEntry
  message: string | null
}

/**
 * Create a new individual grade entry.
 * Each call creates a new row — multiple entries per student/subject are allowed
 * (e.g., multiple quizzes, homework assignments, etc.).
 * Computes percentage and grade_label automatically.
 * Writes an audit log row for the new entry.
 */
export async function createGradeEntry(
  serviceSupabase: SupabaseClient,
  schoolId: string,
  input: GradeEntryInput,
  authUserId: string,
): Promise<GradeEntryMutationResult> {
  try {
    const percentage = computePercentage(input.score, input.max_score)
    const gradeLabel = resolveGradeLabel(input.score, input.max_score)
    const now = new Date().toISOString()

    // Strip synthetic IDs that aren't valid UUIDs (fallback when grade_types table was missing)
    const safeGradeTypeId = input.grade_type_id?.startsWith('synthetic_') ? null : (input.grade_type_id ?? null)

    const payload: Record<string, unknown> = {
      school_id: schoolId,
      student_id: input.student_id,
      subject_id: input.subject_id,
      class_id: input.class_id ?? null,
      section_id: input.section_id ?? null,
      teacher_id: input.teacher_id ?? null,
      grade_type_id: safeGradeTypeId,
      grade_type_name: input.grade_type_name ?? '',
      academic_year: input.academic_year,
      semester: input.semester,
      score: input.score,
      max_score: input.max_score,
      percentage,
      grade_label: gradeLabel,
      note: typeof input.note === 'string' ? input.note.trim() || null : null,
      notification_sent: false,
      status: input.status ?? 'draft',
      exam_photos: Array.isArray(input.exam_photos) ? input.exam_photos : [],
      created_by: authUserId,
      updated_by: authUserId,
      created_at: now,
      updated_at: now,
    }

    const { data, error } = await serviceSupabase
      .from('grade_entries')
      .insert(payload)
      .select('*')
      .maybeSingle()

    if (error) {
      if (isMissingTableError(error)) {
        return {
          ok: false,
          gate: { available: false, code: 'missing_table', message: 'جدول grade_entries غير جاهز بعد.' },
          message: 'جدول grade_entries غير جاهز بعد.',
        }
      }
      throw error
    }

    const savedEntry = data as LookupRecord | null
    const entryId = nullableText(savedEntry?.id)

    if (entryId) {
      const newEntryChanges = [
        { field: 'score', oldValue: null, newValue: input.score },
        { field: 'max_score', oldValue: null, newValue: input.max_score },
        { field: 'grade_type_id', oldValue: null, newValue: input.grade_type_id },
      ]
      void writeGradeAuditLog(serviceSupabase, schoolId, entryId, authUserId, newEntryChanges)
    }

    // Handle send_notification flag
    if (input.send_notification && entryId) {
      void sendGradeNotification(serviceSupabase, schoolId, entryId, {
        student_id: input.student_id,
        score: input.score,
        max_score: input.max_score,
        grade_type_name: input.grade_type_name ?? undefined,
      }, authUserId)
    }

    const enriched = savedEntry
      ? (await enrichGradeEntryRows(serviceSupabase, [savedEntry]))[0]
      : undefined

    return {
      ok: true,
      gate: AVAILABLE_GATE,
      entry: enriched,
      message: 'تم حفظ الدرجة بنجاح.',
    }
  } catch (err) {
    console.error('[createGradeEntry] failed:', err)
    return {
      ok: false,
      gate: featureGateFromError(err, 'grade_entries'),
      message: readErrorMessage(err, 'تعذر حفظ الدرجة.'),
    }
  }
}

/**
 * @deprecated Use createGradeEntry for new entries.
 * Kept for backward compatibility during migration.
 */
export const upsertGradeEntry = createGradeEntry

export interface GradeMutationResult {
  ok: boolean
  gate: GradeFeatureGate
  message: string | null
}

/**
 * Update an existing grade entry by ID.
 * Locked entries are rejected. Writes diff to audit log.
 */
export async function updateGradeEntry(
  serviceSupabase: SupabaseClient,
  schoolId: string,
  entryId: string,
  updates: GradeEntryUpdate,
  authUserId: string,
  reason?: string,
): Promise<GradeMutationResult> {
  try {
    // Fetch current entry
    const { data: currentData, error: fetchError } = await serviceSupabase
      .from('grade_entries')
      .select('*')
      .eq('id', entryId)
      .eq('school_id', schoolId)
      .maybeSingle()

    if (fetchError) throw fetchError

    const current = currentData as LookupRecord | null
    if (!current) {
      return { ok: false, gate: AVAILABLE_GATE, message: 'سجل الدرجة غير موجود.' }
    }

    if (current.status === 'locked') {
      return { ok: false, gate: AVAILABLE_GATE, message: 'لا يمكن تعديل درجة مقفلة.' }
    }

    // Merge updates with current values
    const newScore = 'score' in updates ? updates.score! : (current.score as number)
    const newMaxScore = 'max_score' in updates ? updates.max_score! : (current.max_score as number)
    const newPercentage = computePercentage(newScore, newMaxScore)
    const newLabel = resolveGradeLabel(newScore, newMaxScore)

    const patch: Record<string, unknown> = {
      score: newScore,
      max_score: newMaxScore,
      percentage: newPercentage,
      grade_label: newLabel,
      updated_by: authUserId,
      updated_at: new Date().toISOString(),
    }

    if ('grade_type_id' in updates) {
      patch.grade_type_id = updates.grade_type_id
    }
    if ('grade_type_name' in updates) {
      patch.grade_type_name = updates.grade_type_name
    }
    if ('note' in updates) {
      patch.note = typeof updates.note === 'string' ? updates.note.trim() || null : null
    }
    if (updates.status) {
      patch.status = updates.status
    }

    const { error: updateError } = await serviceSupabase
      .from('grade_entries')
      .update(patch)
      .eq('id', entryId)
      .eq('school_id', schoolId)

    if (updateError) {
      if (isMissingTableError(updateError)) {
        return {
          ok: false,
          gate: { available: false, code: 'missing_table', message: 'جدول grade_entries غير جاهز بعد.' },
          message: 'جدول grade_entries غير جاهز بعد.',
        }
      }
      throw updateError
    }

    // Audit log
    const changes = collectEntryChanges(current, updates)
    if (updates.status && updates.status !== current.status) {
      changes.push({ field: 'status', oldValue: current.status, newValue: updates.status })
    }
    void writeGradeAuditLog(serviceSupabase, schoolId, entryId, authUserId, changes, reason)

    // Handle send_notification flag
    if (updates.send_notification) {
      void sendGradeNotification(serviceSupabase, schoolId, entryId, {
        student_id: current.student_id as string,
        score: newScore,
        max_score: newMaxScore,
        grade_type_name: updates.grade_type_name ?? undefined,
      }, authUserId)
    }

    return { ok: true, gate: AVAILABLE_GATE, message: 'تم تحديث الدرجة بنجاح.' }
  } catch (err) {
    return {
      ok: false,
      gate: featureGateFromError(err, 'grade_entries'),
      message: readErrorMessage(err, 'تعذر تحديث الدرجة.'),
    }
  }
}

/**
 * Delete a grade entry by ID.
 * Only draft entries can be deleted. Confirmed/locked entries must be unlocked first.
 */
export async function deleteGradeEntry(
  serviceSupabase: SupabaseClient,
  schoolId: string,
  entryId: string,
  authUserId: string,
): Promise<GradeMutationResult> {
  try {
    // Fetch entry to check status
    const { data: entryData, error: fetchError } = await serviceSupabase
      .from('grade_entries')
      .select('id, status')
      .eq('id', entryId)
      .eq('school_id', schoolId)
      .maybeSingle()

    if (fetchError) throw fetchError

    const entry = entryData as LookupRecord | null
    if (!entry) {
      return { ok: false, gate: AVAILABLE_GATE, message: 'سجل الدرجة غير موجود.' }
    }

    if (entry.status === 'locked') {
      return { ok: false, gate: AVAILABLE_GATE, message: 'لا يمكن حذف درجة مقفلة.' }
    }

    if (entry.status === 'confirmed') {
      return { ok: false, gate: AVAILABLE_GATE, message: 'لا يمكن حذف درجة مؤكدة. يرجى إلغاء التأكيد أولاً.' }
    }

    const { error: deleteError } = await serviceSupabase
      .from('grade_entries')
      .delete()
      .eq('id', entryId)
      .eq('school_id', schoolId)

    if (deleteError) {
      if (isMissingTableError(deleteError)) {
        return {
          ok: false,
          gate: { available: false, code: 'missing_table', message: 'جدول grade_entries غير جاهز بعد.' },
          message: 'جدول grade_entries غير جاهز بعد.',
        }
      }
      throw deleteError
    }

    void writeGradeAuditLog(
      serviceSupabase,
      schoolId,
      entryId,
      authUserId,
      [{ field: 'deleted', oldValue: 'exists', newValue: 'deleted' }],
    )

    return { ok: true, gate: AVAILABLE_GATE, message: 'تم حذف الدرجة بنجاح.' }
  } catch (err) {
    return {
      ok: false,
      gate: featureGateFromError(err, 'grade_entries'),
      message: readErrorMessage(err, 'تعذر حذف الدرجة.'),
    }
  }
}

// ---------------------------------------------------------------------------
// Confirm / Lock
// ---------------------------------------------------------------------------

export interface GradeConfirmResult {
  ok: boolean
  gate: GradeFeatureGate
  count: number
  message: string | null
}

/**
 * Promote a list of draft entries to 'confirmed'.
 */
export async function confirmGradeEntries(
  serviceSupabase: SupabaseClient,
  schoolId: string,
  entryIds: string[],
  authUserId: string,
  allowedStudentIds?: string[],
): Promise<GradeConfirmResult> {
  if (entryIds.length === 0) {
    return { ok: true, gate: AVAILABLE_GATE, count: 0, message: 'لا توجد درجات لتأكيدها.' }
  }

  try {
    let query = serviceSupabase
      .from('grade_entries')
      .update({
        status: 'confirmed',
        updated_by: authUserId,
        updated_at: new Date().toISOString(),
      })
      .eq('school_id', schoolId)
      .eq('status', 'draft')
      .in('id', entryIds)

    if (allowedStudentIds && allowedStudentIds.length > 0) {
      query = query.in('student_id', allowedStudentIds)
    }

    const { data, error } = await query.select('id')

    if (error) {
      if (isMissingTableError(error)) {
        return {
          ok: false,
          gate: { available: false, code: 'missing_table', message: 'جدول grade_entries غير جاهز بعد.' },
          count: 0,
          message: 'جدول grade_entries غير جاهز بعد.',
        }
      }
      throw error
    }

    const count = (data ?? []).length

    const auditChanges = [{ field: 'status', oldValue: 'draft', newValue: 'confirmed' }]
    for (const row of (data ?? []) as Array<{ id: string }>) {
      void writeGradeAuditLog(serviceSupabase, schoolId, row.id, authUserId, auditChanges)
    }

    return {
      ok: true,
      gate: AVAILABLE_GATE,
      count,
      message: `تم تأكيد ${count} درجة بنجاح.`,
    }
  } catch (err) {
    return {
      ok: false,
      gate: featureGateFromError(err, 'grade_entries'),
      count: 0,
      message: readErrorMessage(err, 'تعذر تأكيد الدرجات.'),
    }
  }
}

export interface GradeLockFilter {
  classId?: string
  sectionId?: string
  subjectId?: string
  academicYear: string
  semester?: 1 | 2
}

export interface GradeLockResult {
  ok: boolean
  gate: GradeFeatureGate
  count: number
  message: string | null
}

/**
 * Lock all confirmed entries matching the given scope filters.
 * Only entries with status='confirmed' are affected.
 */
export async function lockGradeSection(
  serviceSupabase: SupabaseClient,
  schoolId: string,
  filters: GradeLockFilter,
  authUserId: string,
  reason: string,
  allowedStudentIds?: string[],
): Promise<GradeLockResult> {
  try {
    const now = new Date().toISOString()

    let query = serviceSupabase
      .from('grade_entries')
      .update({
        status: 'locked',
        locked_by: authUserId,
        locked_at: now,
        lock_reason: reason,
        updated_by: authUserId,
        updated_at: now,
      })
      .eq('school_id', schoolId)
      .eq('status', 'confirmed')
      .eq('academic_year', filters.academicYear)

    if (filters.classId) query = query.eq('class_id', filters.classId)
    if (filters.sectionId) query = query.eq('section_id', filters.sectionId)
    if (filters.subjectId) query = query.eq('subject_id', filters.subjectId)
    if (filters.semester) query = query.eq('semester', filters.semester)
    if (allowedStudentIds && allowedStudentIds.length > 0) {
      query = query.in('student_id', allowedStudentIds)
    }

    const { data, error } = await query.select('id')

    if (error) {
      if (isMissingTableError(error)) {
        return {
          ok: false,
          gate: { available: false, code: 'missing_table', message: 'جدول grade_entries غير جاهز بعد.' },
          count: 0,
          message: 'جدول grade_entries غير جاهز بعد.',
        }
      }
      throw error
    }

    const count = (data ?? []).length

    const auditChanges = [{ field: 'status', oldValue: 'confirmed', newValue: 'locked' }]
    for (const row of (data ?? []) as Array<{ id: string }>) {
      void writeGradeAuditLog(serviceSupabase, schoolId, row.id, authUserId, auditChanges, reason)
    }

    return {
      ok: true,
      gate: AVAILABLE_GATE,
      count,
      message: `تم قفل ${count} درجة بنجاح.`,
    }
  } catch (err) {
    return {
      ok: false,
      gate: featureGateFromError(err, 'grade_entries'),
      count: 0,
      message: readErrorMessage(err, 'تعذر قفل الدرجات.'),
    }
  }
}

// ---------------------------------------------------------------------------
// Notification helper (fire-and-forget)
// ---------------------------------------------------------------------------

async function sendGradeNotification(
  client: SupabaseClient,
  schoolId: string,
  entryId: string,
  input: Pick<GradeEntryInput, 'student_id' | 'score' | 'max_score'> & { grade_type_name?: string },
  _authUserId: string,
): Promise<void> {
  try {
    // Mark the entry as notification-sent
    await client
      .from('grade_entries')
      .update({
        notification_sent: true,
        notification_sent_at: new Date().toISOString(),
      })
      .eq('id', entryId)
      .eq('school_id', schoolId)

    // Insert notification record for the student's app
    await client.from('notifications').insert({
      school_id: schoolId,
      user_id: input.student_id,
      type: 'grade',
      title: 'درجة جديدة',
      body: `حصلت على ${input.score} من ${input.max_score} في ${input.grade_type_name ?? 'درجة'}`,
      data: { grade_entry_id: entryId },
      is_read: false,
      created_at: new Date().toISOString(),
    })
  } catch {
    // fire-and-forget: notification failures must never propagate
  }
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export interface GradeAnalyticsFilter {
  classId?: string
  academicYear: string
  semester?: 1 | 2
}

export interface SubjectAnalytics {
  subjectId: string
  subjectName: string
  avgPercentage: number
  totalEntries: number
  totalStudents: number
  passingCount: number
  failingCount: number
  passRate: number
  /** Breakdown by grade type */
  byGradeType: Array<{
    gradeTypeId: string
    gradeTypeName: string
    avgScore: number
    avgMaxScore: number
    avgPercentage: number
    count: number
  }>
}

export interface GradeAnalyticsResult {
  ok: boolean
  gate: GradeFeatureGate
  data: SubjectAnalytics[]
}

/**
 * Return aggregated per-subject statistics for a given class and academic year.
 * Aggregates individual entries using score/max_score percentages.
 * Also provides breakdown by grade type within each subject.
 */
export async function fetchGradeAnalytics(
  serviceSupabase: SupabaseClient,
  schoolId: string,
  filters: GradeAnalyticsFilter,
  allowedStudentIds?: string[],
): Promise<GradeAnalyticsResult> {
  try {
    let query = serviceSupabase
      .from('grade_entries')
      .select('subject_id, student_id, score, max_score, percentage, grade_type_id, grade_type_name, status')
      .eq('school_id', schoolId)
      .eq('academic_year', filters.academicYear)

    if (filters.classId) query = query.eq('class_id', filters.classId)
    if (filters.semester) query = query.eq('semester', filters.semester)
    if (allowedStudentIds && allowedStudentIds.length > 0) {
      query = query.in('student_id', allowedStudentIds)
    }

    const { data, error } = await query

    if (error) {
      if (isMissingTableError(error)) {
        return {
          ok: false,
          gate: { available: false, code: 'missing_table', message: 'جدول grade_entries غير جاهز بعد.' },
          data: [],
        }
      }
      throw error
    }

    const rows = (data ?? []) as unknown as LookupRecord[]

    // Collect subject IDs for name lookup
    const subjectIds = Array.from(
      new Set(rows.map((r) => nullableText(r.subject_id)).filter((v): v is string => Boolean(v))),
    )
    const subjectsById = await fetchLookupMap(
      serviceSupabase,
      'subjects',
      subjectIds,
      'id, name',
      'id',
    )

    // Group by subject_id, then compute per-student aggregate percentage
    type SubjectBucket = {
      entries: Array<{
        studentId: string
        score: number
        maxScore: number
        percentage: number
        gradeTypeId: string
        gradeTypeName: string
      }>
    }

    const grouped = new Map<string, SubjectBucket>()

    for (const row of rows) {
      const subjectId = nullableText(row.subject_id)
      if (!subjectId) continue

      const score = typeof row.score === 'number' ? (row.score as number) : 0
      const maxScore = typeof row.max_score === 'number' ? (row.max_score as number) : 0
      const pct = typeof row.percentage === 'number' ? (row.percentage as number) : computePercentage(score, maxScore)

      if (!grouped.has(subjectId)) {
        grouped.set(subjectId, { entries: [] })
      }

      grouped.get(subjectId)!.entries.push({
        studentId: asString(row.student_id),
        score,
        maxScore,
        percentage: pct,
        gradeTypeId: asString(row.grade_type_id),
        gradeTypeName: asString(row.grade_type_name),
      })
    }

    const PASS_PERCENTAGE = 50

    const analyticsData: SubjectAnalytics[] = Array.from(grouped.entries()).map(
      ([subjectId, bucket]) => {
        const totalEntries = bucket.entries.length
        const uniqueStudents = new Set(bucket.entries.map((e) => e.studentId))
        const totalStudents = uniqueStudents.size

        // Compute per-student average percentage
        const studentPercentages = new Map<string, number[]>()
        for (const e of bucket.entries) {
          if (!studentPercentages.has(e.studentId)) {
            studentPercentages.set(e.studentId, [])
          }
          studentPercentages.get(e.studentId)!.push(e.percentage)
        }

        const studentAvgs = Array.from(studentPercentages.values()).map(
          (pcts) => pcts.reduce((s, p) => s + p, 0) / pcts.length,
        )

        const avgPercentage =
          studentAvgs.length > 0
            ? Math.round((studentAvgs.reduce((s, a) => s + a, 0) / studentAvgs.length) * 10) / 10
            : 0

        const passingCount = studentAvgs.filter((avg) => avg >= PASS_PERCENTAGE).length
        const failingCount = totalStudents - passingCount
        const passRate = totalStudents > 0 ? Math.round((passingCount / totalStudents) * 100) : 0

        // Grade type breakdown
        const byType = new Map<string, { name: string; scores: number[]; maxScores: number[]; pcts: number[] }>()
        for (const e of bucket.entries) {
          const key = e.gradeTypeId || '__unknown__'
          if (!byType.has(key)) {
            byType.set(key, { name: e.gradeTypeName || 'غير محدد', scores: [], maxScores: [], pcts: [] })
          }
          const tb = byType.get(key)!
          tb.scores.push(e.score)
          tb.maxScores.push(e.maxScore)
          tb.pcts.push(e.percentage)
        }

        const byGradeType = Array.from(byType.entries()).map(([gtId, tb]) => ({
          gradeTypeId: gtId,
          gradeTypeName: tb.name,
          avgScore: Math.round((tb.scores.reduce((s, v) => s + v, 0) / tb.scores.length) * 10) / 10,
          avgMaxScore: Math.round((tb.maxScores.reduce((s, v) => s + v, 0) / tb.maxScores.length) * 10) / 10,
          avgPercentage: Math.round((tb.pcts.reduce((s, v) => s + v, 0) / tb.pcts.length) * 10) / 10,
          count: tb.scores.length,
        }))

        const subjectRow = subjectsById.get(subjectId)
        const subjectName = nullableText(subjectRow?.name) ?? subjectId

        return {
          subjectId,
          subjectName,
          avgPercentage,
          totalEntries,
          totalStudents,
          passingCount,
          failingCount,
          passRate,
          byGradeType,
        }
      },
    )

    analyticsData.sort((a, b) => a.subjectName.localeCompare(b.subjectName, 'ar'))

    return { ok: true, gate: AVAILABLE_GATE, data: analyticsData }
  } catch (err) {
    return {
      ok: false,
      gate: featureGateFromError(err, 'grade_entries'),
      data: [],
    }
  }
}
