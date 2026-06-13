import { NextRequest, NextResponse } from 'next/server'
import { resolveSchoolScopedActorContext } from '@/lib/managed-users-server'
import { enforceRateLimit } from '@/lib/rate-limit'
import { routeUserHasPermission } from '@/lib/route-permissions'
import { applyBranchScopeToQuery, resolveBranchScope } from '@/lib/branch-scope'

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status })
}

interface LeaderboardEntry {
  studentId: string
  studentName: string | null
  badgeCount: number
  lastBadgeAt: string | null
  badges: string[]
}

/**
 * GET /api/web/grades/badges/leaderboard
 *
 * قائمة الشرف — أعلى 20 طالب من حيث عدد الشارات.
 *
 * Query params:
 *   - schoolId: string (اختياري)
 *   - academicYear: string (اختياري — للتصفية)
 *
 * الصلاحية المطلوبة: view_grade_analytics
 * Rate limit: 30 طلب/دقيقة
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const schoolId = params.get('schoolId')
  const academicYear = params.get('academicYear')

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ['super_admin', 'admin', 'employee'],
      roleDeniedMessage: 'عرض قائمة الشرف متاح ضمن نطاق المدرسة الحالية فقط.',
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
    namespace: 'grades-badges-leaderboard',
    windowMs: 60_000,
    maxHits: 30,
    identifier: actorUserId,
  })
  if (rateLimited) return rateLimited

  const canView = await routeUserHasPermission(
    actorSupabase,
    actorUserId,
    'view_grade_analytics',
  )
  if (!canView) {
    return jsonError('ليس لديك صلاحية عرض تحليلات الدرجات.', 403)
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

  // Branch isolation: if scoped to a branch with no students, return empty
  if (branchStudentIds !== undefined && branchStudentIds.length === 0) {
    return NextResponse.json({ ok: true, gate: { available: true }, items: [], count: 0 })
  }

  // جلب جميع الشارات للمدرسة (مع التصفية بالسنة إذا وُجدت)
  let query = actorSupabase
    .from('student_badges')
    .select('student_id, badge_type, earned_at')
    .eq('school_id', targetSchoolId)
    .order('earned_at', { ascending: false })

  if (branchStudentIds && branchStudentIds.length > 0) {
    query = query.in('student_id', branchStudentIds)
  }

  // التصفية بالسنة الدراسية إن وُجدت (عبر metadata->academicYear أو earned_at)
  // نُفضّل تصفية بالسنة عبر metadata لكنها ليست عمود مباشر، لذا نُجلب الكل ونُصفّي في JS
  const { data, error } = await query

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

  const allBadges = (data ?? []) as Array<{
    student_id: string
    badge_type: string
    earned_at: string
    metadata?: Record<string, unknown>
  }>

  // تصفية بالسنة الدراسية إذا وُجدت (نتحقق من metadata.academicYear)
  const filteredBadges = academicYear
    ? allBadges.filter((b) => {
        const meta = b as Record<string, unknown> & { metadata?: Record<string, unknown> }
        if (meta.metadata && typeof meta.metadata === 'object') {
          return (meta.metadata as Record<string, unknown>).academicYear === academicYear
        }
        return true // نشمل الشارات التي لا تحتوي على سنة
      })
    : allBadges

  // تجميع حسب student_id
  const grouped = new Map<
    string,
    { count: number; lastBadgeAt: string | null; badges: string[] }
  >()

  for (const badge of filteredBadges) {
    const entry = grouped.get(badge.student_id) ?? {
      count: 0,
      lastBadgeAt: null,
      badges: [],
    }
    entry.count++
    if (!entry.lastBadgeAt || badge.earned_at > entry.lastBadgeAt) {
      entry.lastBadgeAt = badge.earned_at
    }
    if (!entry.badges.includes(badge.badge_type)) {
      entry.badges.push(badge.badge_type)
    }
    grouped.set(badge.student_id, entry)
  }

  // ترتيب تنازلي وأخذ أعلى 20
  const sortedStudents = Array.from(grouped.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)

  // جلب أسماء الطلاب
  const studentIds = sortedStudents.map(([id]) => id)
  const studentNames = new Map<string, string>()

  if (studentIds.length > 0) {
    try {
      const { data: studentsData } = await actorSupabase
        .from('students')
        .select('id, full_name')
        .in('id', studentIds)
        .eq('school_id', targetSchoolId)
      ;(studentsData ?? []).forEach((s: { id: string; full_name: string }) => {
        studentNames.set(s.id, s.full_name)
      })
    } catch {
      // لا تفشل إذا تعذّر جلب الأسماء
    }
  }

  const leaderboard: LeaderboardEntry[] = sortedStudents.map(([studentId, entry]) => ({
    studentId,
    studentName: studentNames.get(studentId) ?? null,
    badgeCount: entry.count,
    lastBadgeAt: entry.lastBadgeAt,
    badges: entry.badges,
  }))

  return NextResponse.json({
    ok: true,
    gate: { available: true },
    items: leaderboard,
    count: leaderboard.length,
  })
}
