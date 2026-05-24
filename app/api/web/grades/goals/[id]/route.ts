import { NextRequest, NextResponse } from 'next/server'
import { resolveSchoolScopedActorContext } from '@/lib/managed-users-server'
import { enforceRateLimit } from '@/lib/rate-limit'
import { routeUserHasPermission } from '@/lib/route-permissions'
import { applyBranchScopeToQuery, resolveBranchScope } from '@/lib/branch-scope'
import type { GoalStatus } from '@/lib/grades/types'

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status })
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const VALID_GOAL_STATUSES: GoalStatus[] = ['active', 'achieved', 'missed']

/**
 * PATCH /api/web/grades/goals/[id]
 *
 * تحديث حالة هدف دراسي.
 *
 * Body:
 * {
 *   schoolId: string,
 *   status: 'active' | 'achieved' | 'missed',
 *   targetScore?: number,
 *   deadline?: string | null,
 * }
 *
 * الصلاحية المطلوبة: enter_grades
 * Rate limit: 30 طلب/دقيقة
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: goalId } = await params
  if (!goalId) return jsonError('id الهدف مطلوب.', 400)

  const body = (await req.json().catch(() => null)) as unknown

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonError('جسم الطلب غير صالح.', 400)
  }

  const raw = body as Record<string, unknown>
  const schoolId = normalizeString(raw.schoolId ?? raw.school_id)
  const status = normalizeString(raw.status) as GoalStatus | null
  const targetScore =
    raw.targetScore !== undefined
      ? typeof raw.targetScore === 'number' && isFinite(raw.targetScore)
        ? raw.targetScore
        : null
      : undefined
  const deadline =
    raw.deadline !== undefined ? normalizeString(raw.deadline) : undefined

  if (!schoolId) return jsonError('schoolId مطلوب.', 400)
  if (status !== null && status !== undefined && !VALID_GOAL_STATUSES.includes(status)) {
    return jsonError(
      `status غير صالح. القيم المسموح بها: ${VALID_GOAL_STATUSES.join(', ')}.`,
      400,
    )
  }

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ['super_admin', 'admin', 'employee'],
      roleDeniedMessage: 'تحديث الأهداف متاح ضمن نطاق المدرسة الحالية فقط.',
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
    namespace: 'grades-goals-patch',
    windowMs: 60_000,
    maxHits: 30,
    identifier: actorUserId,
  })
  if (rateLimited) return rateLimited

  const canEnter = await routeUserHasPermission(actorSupabase, actorUserId, 'enter_grades')
  if (!canEnter) {
    return jsonError('ليس لديك صلاحية تحديث الأهداف الدراسية.', 403)
  }

  // بناء كائن التحديث
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (status) patch.status = status
  if (targetScore !== undefined && targetScore !== null) patch.target_score = targetScore
  if (deadline !== undefined) patch.deadline = deadline

  if (Object.keys(patch).length === 1) {
    return jsonError('لا توجد حقول للتحديث.', 400)
  }

  // Branch isolation: verify goal belongs to a student in this branch
  if (branchScope.value.branchIds.length > 0) {
    const { data: goalCheck } = await actorSupabase
      .from('student_goals')
      .select('student_id')
      .eq('id', goalId)
      .eq('school_id', targetSchoolId)
      .maybeSingle()
    const studentId = (goalCheck as Record<string, unknown> | null)?.student_id as string | null
    if (!studentId) return jsonError('الهدف غير موجود.', 404)
    const { data: studentCheck } = await applyBranchScopeToQuery(
      actorSupabase.from('students').select('id').eq('id', studentId),
      branchScope.value,
    ).limit(1)
    if (!studentCheck || (studentCheck as unknown[]).length === 0) {
      return jsonError('لا يمكنك تعديل أهداف طلاب من فرع آخر.', 403)
    }
  }

  const { data: updatedGoal, error: updateError } = await actorSupabase
    .from('student_goals')
    .update(patch)
    .eq('id', goalId)
    .eq('school_id', targetSchoolId)
    .select('*')
    .maybeSingle()

  if (updateError) {
    if (updateError.message?.includes('could not find the table')) {
      return jsonError('جدول student_goals غير جاهز بعد.', 503)
    }
    return jsonError(`تعذر تحديث الهدف: ${updateError.message}`, 500)
  }

  if (!updatedGoal) {
    return jsonError('الهدف غير موجود أو لا تملك صلاحية تعديله.', 404)
  }

  return NextResponse.json({
    ok: true,
    goal: updatedGoal,
    message: 'تم تحديث الهدف الدراسي بنجاح.',
  })
}

/**
 * DELETE /api/web/grades/goals/[id]
 *
 * حذف هدف دراسي.
 *
 * Query params:
 *   - schoolId: string (مطلوب)
 *
 * الصلاحية المطلوبة: enter_grades
 * Rate limit: 20 طلب/دقيقة
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: goalId } = await params
  if (!goalId) return jsonError('id الهدف مطلوب.', 400)

  const searchParams = req.nextUrl.searchParams
  const schoolId = searchParams.get('schoolId')

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ['super_admin', 'admin', 'employee'],
      roleDeniedMessage: 'حذف الأهداف متاح ضمن نطاق المدرسة الحالية فقط.',
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

  const branchScopeDelete = resolveBranchScope(context.value)
  if (!branchScopeDelete.ok) {
    return jsonError(branchScopeDelete.message, branchScopeDelete.status)
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace: 'grades-goals-delete',
    windowMs: 60_000,
    maxHits: 20,
    identifier: actorUserId,
  })
  if (rateLimited) return rateLimited

  const canEnter = await routeUserHasPermission(actorSupabase, actorUserId, 'enter_grades')
  if (!canEnter) {
    return jsonError('ليس لديك صلاحية حذف الأهداف الدراسية.', 403)
  }

  // Branch isolation: verify goal belongs to a student in this branch
  if (branchScopeDelete.value.branchIds.length > 0) {
    const { data: goalCheck } = await actorSupabase
      .from('student_goals')
      .select('student_id')
      .eq('id', goalId)
      .eq('school_id', targetSchoolId)
      .maybeSingle()
    const studentId = (goalCheck as Record<string, unknown> | null)?.student_id as string | null
    if (!studentId) return jsonError('الهدف غير موجود.', 404)
    const { data: studentCheck } = await applyBranchScopeToQuery(
      actorSupabase.from('students').select('id').eq('id', studentId),
      branchScopeDelete.value,
    ).limit(1)
    if (!studentCheck || (studentCheck as unknown[]).length === 0) {
      return jsonError('لا يمكنك حذف أهداف طلاب من فرع آخر.', 403)
    }
  }

  const { error: deleteError } = await actorSupabase
    .from('student_goals')
    .delete()
    .eq('id', goalId)
    .eq('school_id', targetSchoolId)

  if (deleteError) {
    if (deleteError.message?.includes('could not find the table')) {
      return jsonError('جدول student_goals غير جاهز بعد.', 503)
    }
    return jsonError(`تعذر حذف الهدف: ${deleteError.message}`, 500)
  }

  return NextResponse.json({
    ok: true,
    message: 'تم حذف الهدف الدراسي بنجاح.',
  })
}
