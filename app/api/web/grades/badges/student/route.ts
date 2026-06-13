import { NextRequest, NextResponse } from 'next/server'
import { resolveSchoolScopedActorContext } from '@/lib/managed-users-server'
import { enforceRateLimit } from '@/lib/rate-limit'
import { routeUserHasPermission } from '@/lib/route-permissions'
import { applyBranchScopeToQuery, resolveBranchScope } from '@/lib/branch-scope'
import type { StudentBadge } from '@/lib/grades/types'

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status })
}

/**
 * GET /api/web/grades/badges/student
 *
 * جلب شارات طالب محدد.
 *
 * Query params:
 *   - studentId: string (مطلوب)
 *   - schoolId: string (اختياري)
 *
 * الصلاحية المطلوبة: view_grades
 * Rate limit: 60 طلب/دقيقة
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const schoolId = params.get('schoolId')
  const studentId = params.get('studentId')

  if (!studentId) {
    return jsonError('studentId مطلوب.', 400)
  }

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ['super_admin', 'admin', 'employee'],
      roleDeniedMessage: 'عرض الشارات متاح ضمن نطاق المدرسة الحالية فقط.',
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

  const rateLimited = await enforceRateLimit(req, {
    namespace: 'grades-badges-student',
    windowMs: 60_000,
    maxHits: 60,
    identifier: actorUserId,
  })
  if (rateLimited) return rateLimited

  const canView = await routeUserHasPermission(actorSupabase, actorUserId, 'view_grades')
  if (!canView) {
    return jsonError('ليس لديك صلاحية عرض الدرجات.', 403)
  }

  // التحقق أن الطالب ينتمي لهذا الفرع
  const { data: studentCheck } = await applyBranchScopeToQuery(
    actorSupabase
      .from('students')
      .select('id')
      .eq('id', studentId)
      .eq('school_id', targetSchoolId),
    branchScope.value,
  ).limit(1)

  if (!studentCheck || studentCheck.length === 0) {
    return jsonError('الطالب غير موجود أو لا ينتمي إلى هذا الفرع.', 404)
  }

  // جلب شارات الطالب
  const { data, error } = await actorSupabase
    .from('student_badges')
    .select('*')
    .eq('school_id', targetSchoolId)
    .eq('student_id', studentId)
    .order('earned_at', { ascending: false })

  if (error) {
    if (error.message?.includes('could not find the table')) {
      return NextResponse.json({
        ok: true,
        gate: { available: false, code: 'missing_table', message: 'جدول student_badges غير جاهز بعد.' },
        items: [],
        count: 0,
      })
    }
    return jsonError(`تعذر جلب الشارات: ${error.message}`, 500)
  }

  const badges = (data ?? []) as StudentBadge[]

  // إثراء بأسماء المواد
  const subjectIds = Array.from(
    new Set(badges.map((b) => b.subject_id).filter((id): id is string => !!id)),
  )

  const subjectNames = new Map<string, string>()
  if (subjectIds.length > 0) {
    try {
      const { data: subjectsData } = await actorSupabase
        .from('subjects')
        .select('id, name')
        .in('id', subjectIds)
      ;(subjectsData ?? []).forEach((s: { id: string; name: string }) => {
        subjectNames.set(s.id, s.name)
      })
    } catch {
      // لا تفشل إذا تعذّر جلب أسماء المواد
    }
  }

  const enrichedBadges = badges.map((badge) => ({
    ...badge,
    subject_name: badge.subject_id ? (subjectNames.get(badge.subject_id) ?? null) : null,
  }))

  return NextResponse.json({
    ok: true,
    gate: { available: true },
    items: enrichedBadges,
    count: enrichedBadges.length,
  })
}
