import { NextRequest, NextResponse } from 'next/server'
import { resolveSchoolScopedActorContext } from '@/lib/managed-users-server'
import { enforceRateLimit } from '@/lib/rate-limit'
import { routeUserHasPermission } from '@/lib/route-permissions'
import { applyBranchScopeToQuery, resolveBranchScope } from '@/lib/branch-scope'
import type { StudentGoal, GoalStatus } from '@/lib/grades/types'

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status })
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeScore(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number' && isFinite(value) && value >= 0) return value
  if (typeof value === 'string') {
    const n = parseFloat(value)
    if (isFinite(n) && n >= 0) return n
  }
  return null
}

/**
 * GET /api/web/grades/goals
 *
 * جلب قائمة الأهداف الدراسية لطالب محدد.
 *
 * Query params:
 *   - studentId: string (مطلوب)
 *   - schoolId: string (اختياري)
 *
 * الصلاحية المطلوبة: enter_grades
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
      roleDeniedMessage: 'عرض الأهداف متاح ضمن نطاق المدرسة الحالية فقط.',
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
    namespace: 'grades-goals-read',
    windowMs: 60_000,
    maxHits: 60,
    identifier: actorUserId,
  })
  if (rateLimited) return rateLimited

  const canEnter = await routeUserHasPermission(actorSupabase, actorUserId, 'enter_grades')
  if (!canEnter) {
    return jsonError('ليس لديك صلاحية الوصول إلى الأهداف الدراسية.', 403)
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

  const { data, error } = await actorSupabase
    .from('student_goals')
    .select('*')
    .eq('school_id', targetSchoolId)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  if (error) {
    if (error.message?.includes('could not find the table')) {
      return NextResponse.json({
        ok: true,
        gate: { available: false, code: 'missing_table', message: 'جدول student_goals غير جاهز بعد.' },
        items: [],
        count: 0,
      })
    }
    return jsonError(`تعذر جلب الأهداف: ${error.message}`, 500)
  }

  const goals = (data ?? []) as StudentGoal[]

  // إثراء بأسماء المواد
  const subjectIds = Array.from(
    new Set(goals.map((g) => g.subject_id).filter((id): id is string => !!id)),
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
      // لا تفشل بسبب المواد
    }
  }

  const enrichedGoals = goals.map((goal) => ({
    ...goal,
    subject_name: goal.subject_id ? (subjectNames.get(goal.subject_id) ?? null) : null,
  }))

  return NextResponse.json({
    ok: true,
    gate: { available: true },
    items: enrichedGoals,
    count: enrichedGoals.length,
  })
}

/**
 * POST /api/web/grades/goals
 *
 * إنشاء هدف دراسي جديد لطالب.
 *
 * Body:
 * {
 *   schoolId: string,
 *   studentId: string,
 *   subjectId?: string,
 *   targetScore: number,
 *   deadline?: string (ISO date),
 * }
 *
 * الصلاحية المطلوبة: enter_grades
 * Rate limit: 20 طلب/دقيقة
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as unknown

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonError('جسم الطلب غير صالح.', 400)
  }

  const raw = body as Record<string, unknown>

  const schoolId = normalizeString(raw.schoolId ?? raw.school_id)
  const studentId = normalizeString(raw.studentId ?? raw.student_id)
  const subjectId = normalizeString(raw.subjectId ?? raw.subject_id)
  const targetScore = normalizeScore(raw.targetScore ?? raw.target_score)
  const deadline = normalizeString(raw.deadline)

  if (!schoolId) return jsonError('schoolId مطلوب.', 400)
  if (!studentId) return jsonError('studentId مطلوب.', 400)
  if (targetScore === null) return jsonError('targetScore مطلوب ويجب أن يكون رقماً موجباً.', 400)

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ['super_admin', 'admin', 'employee'],
      roleDeniedMessage: 'إنشاء الأهداف متاح ضمن نطاق المدرسة الحالية فقط.',
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

  const branchScopePost = resolveBranchScope(context.value)
  if (!branchScopePost.ok) {
    return jsonError(branchScopePost.message, branchScopePost.status)
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace: 'grades-goals-write',
    windowMs: 60_000,
    maxHits: 20,
    identifier: actorUserId,
  })
  if (rateLimited) return rateLimited

  const canEnter = await routeUserHasPermission(actorSupabase, actorUserId, 'enter_grades')
  if (!canEnter) {
    return jsonError('ليس لديك صلاحية إنشاء الأهداف الدراسية.', 403)
  }

  // التحقق أن الطالب ينتمي لهذا الفرع
  const { data: studentCheckPost } = await applyBranchScopeToQuery(
    actorSupabase
      .from('students')
      .select('id')
      .eq('id', studentId!)
      .eq('school_id', targetSchoolId),
    branchScopePost.value,
  ).limit(1)

  if (!studentCheckPost || studentCheckPost.length === 0) {
    return jsonError('الطالب غير موجود أو لا ينتمي إلى هذا الفرع.', 404)
  }

  const now = new Date().toISOString()

  const { data: newGoal, error: insertError } = await actorSupabase
    .from('student_goals')
    .insert({
      school_id: targetSchoolId,
      student_id: studentId,
      subject_id: subjectId ?? null,
      target_score: targetScore,
      deadline: deadline ?? null,
      status: 'active' as GoalStatus,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .maybeSingle()

  if (insertError) {
    if (insertError.message?.includes('could not find the table')) {
      return jsonError('جدول student_goals غير جاهز بعد.', 503)
    }
    return jsonError(`تعذر إنشاء الهدف: ${insertError.message}`, 500)
  }

  return NextResponse.json(
    {
      ok: true,
      goal: newGoal as StudentGoal,
      message: 'تم إنشاء الهدف الدراسي بنجاح.',
    },
    { status: 201 },
  )
}
