import { NextRequest, NextResponse } from 'next/server'
import { resolveSchoolScopedActorContext } from '@/lib/managed-users-server'
import { enforceRateLimit } from '@/lib/rate-limit'
import { routeUserHasPermission } from '@/lib/route-permissions'
import { applyBranchScopeToQuery, resolveBranchScope } from '@/lib/branch-scope'
import { upsertGradeEntry } from '@/lib/grades/grade-entries-server'
import type { GradeEntryInput } from '@/lib/grades/types'

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status })
}

function normalizeScore(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number' && isFinite(value) && value >= 0) return value
  if (typeof value === 'string') {
    const n = parseFloat(value)
    if (isFinite(n) && n >= 0) return n
  }
  return null
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * POST /api/web/grades/import
 *
 * استيراد درجات جماعية من JSON (المحلَّل مسبقاً من Excel أو مُعبَّأ يدوياً).
 *
 * Body:
 * {
 *   schoolId: string,
 *   academicYear: string,
 *   semester: 1 | 2,
 *   classId?: string,
 *   sectionId?: string,
 *   subjectId: string,
 *   rows: Array<{
 *     studentId: string,
 *     oral?: number | null,
 *     homework?: number | null,
 *     monthly?: number | null,
 *     midterm?: number | null,
 *     final?: number | null,
 *   }>
 * }
 *
 * الصلاحية المطلوبة: enter_grades
 * Rate limit: 5 طلبات/دقيقة
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as unknown

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonError('جسم الطلب غير صالح.', 400)
  }

  const raw = body as Record<string, unknown>

  // استخراج الحقول الأساسية
  const schoolId = normalizeString(raw.schoolId ?? raw.school_id)
  const academicYear = normalizeString(raw.academicYear ?? raw.academic_year)
  const semesterRaw =
    typeof raw.semester === 'number' ? raw.semester : parseInt(String(raw.semester ?? ''), 10)
  const classId = normalizeString(raw.classId ?? raw.class_id)
  const sectionId = normalizeString(raw.sectionId ?? raw.section_id)
  const subjectId = normalizeString(raw.subjectId ?? raw.subject_id)
  const rows = Array.isArray(raw.rows) ? raw.rows : null

  // التحقق من الحقول المطلوبة
  if (!schoolId) return jsonError('schoolId مطلوب.', 400)
  if (!academicYear) return jsonError('academicYear مطلوب.', 400)
  if (semesterRaw !== 1 && semesterRaw !== 2) return jsonError('semester يجب أن يكون 1 أو 2.', 400)
  if (!subjectId) return jsonError('subjectId مطلوب.', 400)
  if (!rows || rows.length === 0) return jsonError('rows مطلوبة ولا يمكن أن تكون فارغة.', 400)

  const semester = semesterRaw as 1 | 2

  // التحقق من السياق والمصادقة
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ['super_admin', 'admin', 'employee'],
      roleDeniedMessage: 'استيراد الدرجات متاح ضمن نطاق المدرسة الحالية فقط.',
    },
    req.headers.get('authorization'),
  )

  if (!context.ok) {
    return jsonError(
      'message' in context ? context.message : 'تعذر التحقق من صلاحيات المستخدم.',
      'status' in context ? context.status : 500,
    )
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value

  const branchScope = resolveBranchScope(context.value)
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status)
  }

  // تطبيق rate limit: 5 طلبات/دقيقة (عملية ثقيلة)
  const rateLimited = await enforceRateLimit(req, {
    namespace: 'grades-import',
    windowMs: 60_000,
    maxHits: 5,
    identifier: actorUserId,
  })
  if (rateLimited) return rateLimited

  // التحقق من الصلاحية
  const canEnter = await routeUserHasPermission(actorSupabase, actorUserId, 'enter_grades')
  if (!canEnter) {
    return jsonError('ليس لديك صلاحية إدخال الدرجات.', 403)
  }

  // Resolve branch student IDs for isolation
  let branchStudentIds: Set<string> | null = null
  if (branchScope.value.branchIds.length > 0) {
    const { data: bs } = await applyBranchScopeToQuery(
      actorSupabase.from('students').select('id').eq('school_id', targetSchoolId),
      branchScope.value,
    )
    branchStudentIds = new Set(((bs ?? []) as Array<{ id: string }>).map((s) => s.id))
  }

  // معالجة الصفوف
  const validInputs: GradeEntryInput[] = []
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      errors.push(`الصف ${i + 1}: بيانات غير صالحة.`)
      continue
    }

    const rowObj = row as Record<string, unknown>
    const studentId = normalizeString(rowObj.studentId ?? rowObj.student_id)

    if (!studentId) {
      errors.push(`الصف ${i + 1}: studentId مفقود أو غير صالح.`)
      continue
    }

    if (branchStudentIds && !branchStudentIds.has(studentId)) {
      errors.push(`الصف ${i + 1}: الطالب لا ينتمي إلى هذا الفرع.`)
      continue
    }

    // Import uses score/max_score per entry. Each row maps to one or more entries.
    // For backward-compat, treat score as the sum of provided columns, max_score as 100.
    const oral = normalizeScore(rowObj.oral ?? rowObj.oral_score) ?? 0
    const homework = normalizeScore(rowObj.homework ?? rowObj.homework_score) ?? 0
    const monthly = normalizeScore(rowObj.monthly ?? rowObj.monthly_score) ?? 0
    const midterm = normalizeScore(rowObj.midterm ?? rowObj.midterm_score) ?? 0
    const finalScore = normalizeScore(rowObj.final ?? rowObj.final_score) ?? 0
    const totalScore = normalizeScore(rowObj.score ?? rowObj.total_score) ?? (oral + homework + monthly + midterm + finalScore)
    const maxScore = normalizeScore(rowObj.max_score ?? rowObj.total_max) ?? 100

    if (totalScore <= 0 && maxScore <= 0) {
      errors.push(`الصف ${i + 1}: لا توجد درجة صالحة.`)
      continue
    }

    const input: GradeEntryInput = {
      student_id: studentId,
      subject_id: subjectId,
      class_id: classId,
      section_id: sectionId,
      academic_year: academicYear,
      semester,
      score: totalScore,
      max_score: maxScore > 0 ? maxScore : 100,
    }

    validInputs.push(input)
  }

  if (validInputs.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        inserted: 0,
        errors,
        message: 'لا توجد صفوف صالحة للاستيراد.',
      },
      { status: 400 },
    )
  }

  // تنفيذ upsert لكل صف (على دفعات لتجنب إغراق قاعدة البيانات)
  const CHUNK_SIZE = 20
  const insertResults: Array<{ ok: boolean; message: string | null }> = []

  for (let i = 0; i < validInputs.length; i += CHUNK_SIZE) {
    const chunk = validInputs.slice(i, i + CHUNK_SIZE)
    const chunkResults = await Promise.all(
      chunk.map((input) => upsertGradeEntry(actorSupabase, targetSchoolId, input, actorUserId)),
    )
    insertResults.push(...chunkResults)
  }

  const inserted = insertResults.filter((r) => r.ok).length
  const failedResults = insertResults
    .map((r, idx) => (!r.ok ? `الصف ${idx + 1}: ${r.message ?? 'خطأ غير معروف'}` : null))
    .filter((e): e is string => e !== null)

  const allErrors = [...errors, ...failedResults]

  // إذا فشل الجميع: نُعيد 500
  if (inserted === 0 && allErrors.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        inserted: 0,
        errors: allErrors,
        message: 'فشل استيراد جميع الصفوف.',
      },
      { status: 500 },
    )
  }

  return NextResponse.json({
    ok: true,
    inserted,
    errors: allErrors,
    message:
      allErrors.length > 0
        ? `تم استيراد ${inserted} صف بنجاح مع ${allErrors.length} خطأ.`
        : `تم استيراد ${inserted} صف بنجاح.`,
  })
}
