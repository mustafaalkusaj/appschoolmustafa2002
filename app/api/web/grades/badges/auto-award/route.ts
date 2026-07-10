import { NextRequest, NextResponse } from 'next/server'
import { resolveSchoolScopedActorContext } from '@/lib/managed-users-server'
import { enforceRateLimit } from '@/lib/rate-limit'
import { routeUserHasPermission } from '@/lib/route-permissions'
import { applyBranchScopeToQuery, resolveBranchScope } from '@/lib/branch-scope'
import { createInsiteNotification } from '@/lib/notifications/insite-service'
import type { BadgeType } from '@/lib/grades/types'

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status })
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

interface GradeRow {
  student_id: string
  subject_id: string
  total_score: number | null
  grade_scheme_id: string | null
}

interface SchemeRow {
  id: string
  total_max: number
}

/**
 * POST /api/web/grades/badges/auto-award
 *
 * منح شارات تلقائياً بعد قفل درجات قسم أو صف.
 * يفحص:
 *   - perfect_score: إجمالي الدرجة = total_max للمخطط
 *   - top_student: الأعلى درجة في الصف لكل مادة
 *
 * Body:
 * {
 *   schoolId: string,
 *   academicYear: string,
 *   semester: 1 | 2,
 *   classId?: string,
 *   sectionId?: string,
 * }
 *
 * الصلاحية المطلوبة: lock_grades
 * Rate limit: 10 طلبات/دقيقة
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as unknown

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonError('جسم الطلب غير صالح.', 400)
  }

  const raw = body as Record<string, unknown>

  const schoolId = normalizeString(raw.schoolId ?? raw.school_id)
  const academicYear = normalizeString(raw.academicYear ?? raw.academic_year)
  const semesterRaw =
    typeof raw.semester === 'number' ? raw.semester : parseInt(String(raw.semester ?? ''), 10)
  const classId = normalizeString(raw.classId ?? raw.class_id)
  const sectionId = normalizeString(raw.sectionId ?? raw.section_id)

  if (!schoolId) return jsonError('schoolId مطلوب.', 400)
  if (!academicYear) return jsonError('academicYear مطلوب.', 400)
  if (semesterRaw !== 1 && semesterRaw !== 2) return jsonError('semester يجب أن يكون 1 أو 2.', 400)

  const semester = semesterRaw as 1 | 2

  // التحقق من السياق والمصادقة
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ['super_admin', 'admin', 'employee'],
      roleDeniedMessage: 'منح الشارات التلقائية متاح ضمن نطاق المدرسة الحالية فقط.',
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

  // تطبيق rate limit
  const rateLimited = await enforceRateLimit(req, {
    namespace: 'grades-badges-auto-award',
    windowMs: 60_000,
    maxHits: 10,
    identifier: actorUserId,
  })
  if (rateLimited) return rateLimited

  // التحقق من الصلاحية
  const canLock = await routeUserHasPermission(actorSupabase, actorUserId, 'lock_grades')
  if (!canLock) {
    return jsonError('ليس لديك صلاحية منح الشارات التلقائية.', 403)
  }

  // Resolve branch student IDs for isolation
  let branchStudentIds: string[] | undefined
  if (branchScope.value.branchIds.length > 0) {
    const { data: bs } = await applyBranchScopeToQuery(
      actorSupabase.from('students').select('id').eq('school_id', targetSchoolId),
      branchScope.value,
    )
    branchStudentIds = ((bs ?? []) as Array<{ id: string }>).map((s) => s.id)
  }

  // جلب الدرجات المقفلة للنطاق المحدد
  let gradesQuery = actorSupabase
    .from('grade_entries')
    .select('student_id, subject_id, total_score, grade_scheme_id')
    .eq('school_id', targetSchoolId)
    .eq('academic_year', academicYear)
    .eq('semester', semester)
    .eq('status', 'locked')

  if (classId) gradesQuery = gradesQuery.eq('class_id', classId)
  if (sectionId) gradesQuery = gradesQuery.eq('section_id', sectionId)
  if (branchStudentIds && branchStudentIds.length > 0) {
    gradesQuery = gradesQuery.in('student_id', branchStudentIds)
  }

  const { data: gradesData, error: gradesError } = await gradesQuery

  if (gradesError) {
    if (gradesError.message?.includes('could not find the table')) {
      return jsonError('جدول grade_entries غير جاهز بعد.', 503)
    }
    return jsonError(`تعذر جلب الدرجات: ${gradesError.message}`, 500)
  }

  const grades = (gradesData ?? []) as GradeRow[]

  if (grades.length === 0) {
    return NextResponse.json({
      ok: true,
      awarded: 0,
      message: 'لا توجد درجات مقفلة في النطاق المحدد.',
    })
  }

  // جلب مخططات الدرجات لمعرفة total_max
  const schemeIds = Array.from(
    new Set(grades.map((g) => g.grade_scheme_id).filter((id): id is string => !!id)),
  )

  const schemesById = new Map<string, SchemeRow>()
  if (schemeIds.length > 0) {
    try {
      const { data: schemesData } = await actorSupabase
        .from('grade_schemes')
        .select('id, total_max')
        .in('id', schemeIds)
      ;(schemesData ?? []).forEach((s: SchemeRow) => {
        schemesById.set(s.id, s)
      })
    } catch {
      // نكمل بدون مخططات — سيُستخدم 100 كافتراضي
    }
  }

  // تحديد الشارات المستحقة
  const badgesToAward: Array<{
    student_id: string
    subject_id: string
    badge_type: BadgeType
    metadata: Record<string, unknown>
  }> = []

  // --- perfect_score: إجمالي = total_max ---
  for (const grade of grades) {
    if (grade.total_score === null) continue

    const scheme = grade.grade_scheme_id ? schemesById.get(grade.grade_scheme_id) : null
    const totalMax = scheme?.total_max ?? 100

    if (grade.total_score >= totalMax) {
      badgesToAward.push({
        student_id: grade.student_id,
        subject_id: grade.subject_id,
        badge_type: 'perfect_score',
        metadata: {
          academicYear,
          semester,
          totalScore: grade.total_score,
          totalMax,
        },
      })
    }
  }

  // --- top_student: الأعلى في كل مادة ---
  // تجميع حسب subject_id
  const bySubject = new Map<string, GradeRow[]>()
  for (const grade of grades) {
    if (!grade.subject_id || grade.total_score === null) continue
    const existing = bySubject.get(grade.subject_id) ?? []
    existing.push(grade)
    bySubject.set(grade.subject_id, existing)
  }

  for (const [subjectId, subjectGrades] of Array.from(bySubject.entries())) {
    const maxScore = Math.max(...subjectGrades.map((g: GradeRow) => g.total_score ?? 0))
    const topStudents = subjectGrades.filter((g: GradeRow) => g.total_score === maxScore)

    for (const student of topStudents) {
      // تجنب الازدواجية مع perfect_score لنفس الطالب في نفس المادة
      const alreadyPerfect = badgesToAward.some(
        (b) =>
          b.student_id === student.student_id &&
          b.subject_id === subjectId &&
          b.badge_type === 'perfect_score',
      )

      badgesToAward.push({
        student_id: student.student_id,
        subject_id: subjectId,
        badge_type: alreadyPerfect ? 'perfect_score' : 'top_student',
        metadata: {
          academicYear,
          semester,
          totalScore: maxScore,
          isTopInClass: true,
        },
      })
    }
  }

  if (badgesToAward.length === 0) {
    return NextResponse.json({
      ok: true,
      awarded: 0,
      message: 'لا توجد شارات مستحقة في هذا النطاق.',
    })
  }

  // كتابة الشارات مع ON CONFLICT DO NOTHING
  const now = new Date().toISOString()
  const insertRows = badgesToAward.map((b) => ({
    school_id: targetSchoolId,
    student_id: b.student_id,
    subject_id: b.subject_id,
    badge_type: b.badge_type,
    earned_at: now,
    metadata: b.metadata,
    created_at: now,
  }))

  let awarded = 0
  try {
    const { data: insertedData, error: insertError } = await actorSupabase
      .from('student_badges')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(insertRows as any, {
        onConflict: 'school_id,student_id,subject_id,badge_type,earned_at',
        ignoreDuplicates: true,
      })
      .select('id, student_id, badge_type')

    if (insertError && !insertError.message?.includes('could not find the table')) {
      // نحاول insert عادي إذا فشل upsert
      const { data: plainInsert } = await actorSupabase
        .from('student_badges')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(insertRows as any)
        .select('id, student_id, badge_type')
      awarded = (plainInsert ?? []).length
    } else {
      awarded = (insertedData ?? []).length
    }

    // إرسال إشعار لكل طالب حصل على شارة
    if (awarded > 0 && insertedData && insertedData.length > 0) {
      const badgeLabels: Partial<Record<BadgeType, string>> = {
        perfect_score: 'العلامة الكاملة',
        top_student: 'الطالب المتميز',
      }

      // نُرسل إشعاراً واحداً لكل طالب (لأول شارة حصل عليها)
      const notifiedStudents = new Set<string>()
      const insertedRows = insertedData as Array<{ id: string; student_id: string; badge_type: string }>
      for (const row of insertedRows) {
        if (notifiedStudents.has(row.student_id)) continue
        notifiedStudents.add(row.student_id)

        const badgeLabel = badgeLabels[row.badge_type as BadgeType] ?? row.badge_type

        void createInsiteNotification(actorSupabase, {
          schoolId: targetSchoolId,
          title: 'تهانينا! حصلت على شارة جديدة',
          body: `تهانينا على حصولك على شارة "${badgeLabel}" لتميزك الدراسي.`,
          target: {
            targetType: 'person',
            targetUserId: row.student_id,
          },
          category: 'general',
          priority: 'normal',
          template: 'celebration',
          sentByUserId: actorUserId,
        }).catch(() => {
          // الإشعارات اختيارية
        })
      }
    }
  } catch (err) {
    return jsonError(
      `تعذرت كتابة الشارات: ${err instanceof Error ? err.message : 'خطأ غير معروف'}`,
      500,
    )
  }

  return NextResponse.json({
    ok: true,
    awarded,
    total: badgesToAward.length,
    message:
      awarded > 0
        ? `تم منح ${awarded} شارة تلقائياً بنجاح.`
        : 'لم يتم منح شارات جديدة (قد تكون ممنوحة مسبقاً).',
  })
}
