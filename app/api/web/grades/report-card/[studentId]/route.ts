import { NextRequest, NextResponse } from 'next/server'
import { resolveSchoolScopedActorContext } from '@/lib/managed-users-server'
import { enforceRateLimit } from '@/lib/rate-limit'
import { routeUserHasPermission } from '@/lib/route-permissions'
import { fetchStudentGradeHistory } from '@/lib/grades/grade-entries-server'
import { applyBranchScopeToQuery, resolveBranchScope } from '@/lib/branch-scope'
import { buildReportCardHTML } from '@/lib/grades/report-card-pdf'

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status })
}

/**
 * GET /api/web/grades/report-card/[studentId]
 *
 * يُعيد HTML كشف درجات طالب قابل للطباعة.
 *
 * Query params:
 *   - schoolId       (اختياري — يُستقى من السياق إذا لم يُرسَل)
 *   - academicYear   (اختياري — إذا لم يُرسَل يعرض جميع السنوات)
 *   - semester       (اختياري: 1 أو 2)
 *
 * الصلاحية المطلوبة: view_grades
 * Rate limit: 20 طلب/دقيقة
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params
  if (!studentId) {
    return jsonError('studentId مطلوب.', 400)
  }

  const searchParams = req.nextUrl.searchParams
  const schoolIdParam = searchParams.get('schoolId')
  const academicYear = searchParams.get('academicYear') ?? undefined
  const semesterRaw = searchParams.get('semester')
  const semester = semesterRaw === '1' ? 1 : semesterRaw === '2' ? 2 : undefined

  // التحقق من السياق والمصادقة
  const context = await resolveSchoolScopedActorContext(
    schoolIdParam,
    {
      allowedRoles: ['super_admin', 'admin', 'employee'],
      roleDeniedMessage: 'كشف الدرجات متاح ضمن نطاق المدرسة الحالية فقط.',
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

  // Branch scope
  const branchScope = resolveBranchScope(context.value)
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status)
  }

  // تطبيق rate limit: 20 طلب/دقيقة
  const rateLimited = await enforceRateLimit(req, {
    namespace: 'grades-report-card',
    windowMs: 60_000,
    maxHits: 20,
    identifier: actorUserId,
  })
  if (rateLimited) return rateLimited

  // التحقق من الصلاحية
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

  // جلب درجات الطالب
  const result = await fetchStudentGradeHistory(actorSupabase, targetSchoolId, studentId)

  if (!result.ok) {
    if (result.gate.code === 'missing_table') {
      return jsonError(result.gate.message ?? 'جدول الدرجات غير جاهز بعد.', 503)
    }
    return jsonError('تعذر تحميل سجلات الدرجات.', 500)
  }

  // تصفية حسب academicYear و semester إذا وُجدا
  let filteredEntries = result.items
  if (academicYear) {
    filteredEntries = filteredEntries.filter((e) => e.academic_year === academicYear)
  }
  if (semester) {
    filteredEntries = filteredEntries.filter((e) => e.semester === semester)
  }

  // جلب اسم المدرسة وشعارها من جدول schools
  let schoolName: string | null = null
  let schoolLogoUrl: string | null = null
  try {
    const { data: schoolData } = await actorSupabase
      .from('schools')
      .select('name, logo_url')
      .eq('id', targetSchoolId)
      .maybeSingle()
    if (schoolData) {
      schoolName = typeof schoolData.name === 'string' ? schoolData.name : null
      schoolLogoUrl = typeof schoolData.logo_url === 'string' ? schoolData.logo_url : null
    }
  } catch {
    // لا تفشل الطلب بسبب عدم توفر بيانات المدرسة
  }

  // استخراج معلومات الطالب من أول سجل
  const firstEntry = filteredEntries[0] ?? result.items[0]
  const studentName = firstEntry?.student_name ?? 'طالب'
  const className = firstEntry?.class_name ?? ''
  const sectionName = firstEntry?.section_name ?? null
  const resolvedYear = academicYear ?? firstEntry?.academic_year ?? ''
  const resolvedSemester: 1 | 2 = semester ?? (firstEntry?.semester as 1 | 2) ?? 1

  // بناء HTML الكشف
  const html = buildReportCardHTML({
    studentId,
    studentName,
    className,
    sectionName,
    academicYear: resolvedYear,
    semester: resolvedSemester,
    entries: filteredEntries,
    schoolName,
    schoolLogoUrl,
  })

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
