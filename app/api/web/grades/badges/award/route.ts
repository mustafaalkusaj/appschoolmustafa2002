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

const VALID_BADGE_TYPES: BadgeType[] = [
  'diamond',
  'gold',
  'silver',
  'bronze',
  'top_student',
  'most_improved',
  'perfect_score',
  'streak',
  'on_time',
]

/**
 * POST /api/web/grades/badges/award
 *
 * منح شارة يدوياً لطالب محدد.
 *
 * Body:
 * {
 *   schoolId: string,
 *   studentId: string,
 *   badgeType: BadgeType,
 *   subjectId?: string,
 *   metadata?: Record<string, unknown>,
 * }
 *
 * الصلاحية المطلوبة: confirm_grades
 * Rate limit: 30 طلب/دقيقة
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as unknown

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonError('جسم الطلب غير صالح.', 400)
  }

  const raw = body as Record<string, unknown>

  const schoolId = normalizeString(raw.schoolId ?? raw.school_id)
  const studentId = normalizeString(raw.studentId ?? raw.student_id)
  const badgeType = normalizeString(raw.badgeType ?? raw.badge_type) as BadgeType | null
  const subjectId = normalizeString(raw.subjectId ?? raw.subject_id)
  const metadata = raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : {}

  if (!schoolId) return jsonError('schoolId مطلوب.', 400)
  if (!studentId) return jsonError('studentId مطلوب.', 400)
  if (!badgeType || !VALID_BADGE_TYPES.includes(badgeType)) {
    return jsonError(
      `badgeType غير صالح. القيم المسموح بها: ${VALID_BADGE_TYPES.join(', ')}.`,
      400,
    )
  }

  // التحقق من السياق والمصادقة
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ['super_admin', 'admin', 'employee'],
      roleDeniedMessage: 'منح الشارات متاح ضمن نطاق المدرسة الحالية فقط.',
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
    namespace: 'grades-badges-award',
    windowMs: 60_000,
    maxHits: 30,
    identifier: actorUserId,
  })
  if (rateLimited) return rateLimited

  // التحقق من الصلاحية: confirm_grades أو full_access
  const canConfirm = await routeUserHasPermission(actorSupabase, actorUserId, 'confirm_grades')
  if (!canConfirm) {
    return jsonError('ليس لديك صلاحية منح الشارات.', 403)
  }

  // التحقق أن الطالب ينتمي لهذا الفرع
  const { data: studentCheck } = await applyBranchScopeToQuery(
    actorSupabase
      .from('students')
      .select('id, full_name')
      .eq('id', studentId!)
      .eq('school_id', targetSchoolId),
    branchScope.value,
  ).limit(1)

  if (!studentCheck || studentCheck.length === 0) {
    return jsonError('الطالب غير موجود أو لا ينتمي إلى هذا الفرع.', 404)
  }

  // كتابة الشارة في جدول student_badges
  const { data: badge, error: insertError } = await actorSupabase
    .from('student_badges')
    .insert({
      school_id: targetSchoolId,
      student_id: studentId,
      subject_id: subjectId ?? null,
      badge_type: badgeType,
      earned_at: new Date().toISOString(),
      metadata: metadata ?? {},
      created_at: new Date().toISOString(),
    })
    .select('id')
    .maybeSingle()

  if (insertError) {
    if (insertError.message?.includes('could not find the table')) {
      return jsonError('جدول student_badges غير جاهز بعد.', 503)
    }
    return jsonError(`تعذر منح الشارة: ${insertError.message}`, 500)
  }

  // اسم الطالب من الاستعلام السابق
  const studentRow = studentCheck[0] as Record<string, unknown>
  const studentName =
    typeof studentRow.full_name === 'string' && studentRow.full_name.trim().length > 0
      ? studentRow.full_name
      : 'الطالب'

  // ملصقات الشارات بالعربية
  const badgeLabels: Record<BadgeType, string> = {
    diamond: 'الماسية',
    gold: 'الذهبية',
    silver: 'الفضية',
    bronze: 'البرونزية',
    top_student: 'الطالب المتميز',
    most_improved: 'الأكثر تقدماً',
    perfect_score: 'العلامة الكاملة',
    streak: 'الانتظام',
    on_time: 'الالتزام بالمواعيد',
  }

  // إرسال إشعار داخلي للطالب
  try {
    await createInsiteNotification(actorSupabase, {
      schoolId: targetSchoolId,
      title: `تهانينا! حصلت على شارة ${badgeLabels[badgeType]}`,
      body: `عزيزي ${studentName}، تهانينا على حصولك على شارة "${badgeLabels[badgeType]}". استمر في التميز!`,
      target: {
        targetType: 'person',
        targetUserId: studentId,
      },
      category: 'general',
      priority: 'normal',
      template: 'celebration',
      sentByUserId: actorUserId,
    })
  } catch {
    // الإشعار اختياري — لا تُفشل الطلب بسببه
  }

  return NextResponse.json({
    ok: true,
    badgeId: badge?.id ?? null,
    message: `تم منح شارة "${badgeLabels[badgeType]}" للطالب بنجاح.`,
  })
}
