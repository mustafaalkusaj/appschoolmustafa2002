'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AppSidebar } from '@/components/AppSidebar'
import { AppShellTopbar } from '@/components/AppShellTopbar'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { SchoolScopeBanner } from '@/components/SchoolScopeBanner'
import { useSchoolScope } from '@/hooks/useSchoolScope'
import { useRole } from '@/hooks/useRole'
import { getLocaleFromPath } from '@/lib/locale-routing'
import { fetchJsonWithAuthorizedSession } from '@/lib/authorized-api'
import { useGradeAnalytics } from './_hooks/useGradeAnalytics'
import { SubjectAveragesChart } from './_components/SubjectAveragesChart'
import { ClassHeatmapGrid } from './_components/ClassHeatmapGrid'
import { FailingStudentsPanel } from './_components/FailingStudentsPanel'
import { GradesNavTabs } from '../_components/GradesNavTabs'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClassOption {
  id: string
  name: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function currentAcademicYear(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  // Academic year typically starts in September
  return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`
}

function buildYearOptions(): string[] {
  const thisYear = new Date().getFullYear()
  return [
    `${thisYear - 1}/${thisYear}`,
    `${thisYear}/${thisYear + 1}`,
    `${thisYear + 1}/${thisYear + 2}`,
  ]
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  description,
  valueClass,
}: {
  title: string
  value: string | number
  description?: string
  valueClass?: string
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] p-5">
      <p className="text-sm text-[var(--text-muted)]">{title}</p>
      <p className={`text-3xl font-black mt-1 ${valueClass ?? 'text-[var(--text-primary)]'}`}>
        {value}
      </p>
      {description && (
        <p className="text-xs text-[var(--text-muted)] mt-1">{description}</p>
      )}
    </div>
  )
}

function SectionCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border)]">
        <h2 className="font-bold text-[var(--text-primary)] text-sm">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  children,
  disabled,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <label htmlFor={id} className="text-xs font-medium text-[var(--text-muted)]">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        className="h-10 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-primary)] text-sm px-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {children}
      </select>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function GradesDashboardPage() {
  const pathname = usePathname()
  const locale = getLocaleFromPath(pathname) === 'en' ? 'en' : 'ar'

  const { profile, can } = useRole()
  const schoolScope = useSchoolScope(profile)

  // Filters
  const [academicYear, setAcademicYear] = useState(currentAcademicYear())
  const [semester, setSemester] = useState<'' | '1' | '2'>('')
  const [classId, setClassId] = useState('')
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [classesLoading, setClassesLoading] = useState(false)

  // Analytics
  const { data, loading, error, load } = useGradeAnalytics()

  const canView = can('view_grade_analytics')

  // ── Fetch class list from structure endpoint ──────────────────────────────
  useEffect(() => {
    if (!canView) return
    setClassesLoading(true)
    void fetchJsonWithAuthorizedSession<{ classes?: ClassOption[] }>(
      '/api/web/dashboard/structure',
    ).then(({ payload }) => {
      setClasses(payload?.classes ?? [])
    }).catch(() => {
      setClasses([])
    }).finally(() => {
      setClassesLoading(false)
    })
  }, [canView])

  // ── Load analytics whenever filters change ────────────────────────────────
  useEffect(() => {
    if (!canView || !academicYear) return
    void load({
      academicYear,
      semester: semester === '1' ? 1 : semester === '2' ? 2 : undefined,
      classId: classId || undefined,
    })
  }, [canView, academicYear, semester, classId, load])

  // ── Derived stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!data.length) return { totalStudents: 0, avgScore: 0, avgPassRate: 0, totalFailing: 0 }
    const totalStudents = data.reduce((s, d) => s + d.totalStudents, 0)
    const totalFailing = data.reduce((s, d) => s + d.failingCount, 0)
    const weightedScoreSum = data.reduce((s, d) => s + d.avgScore * d.totalStudents, 0)
    const avgScore =
      totalStudents > 0 ? Math.round((weightedScoreSum / totalStudents) * 10) / 10 : 0
    const avgPassRate =
      data.length > 0
        ? Math.round(data.reduce((s, d) => s + d.passRate, 0) / data.length)
        : 0
    return { totalStudents, avgScore, avgPassRate, totalFailing }
  }, [data])

  // ── Copy ──────────────────────────────────────────────────────────────────
  const copy = {
    topbarTitle: locale === 'ar' ? 'تحليلات الدرجات' : 'Grade Analytics',
    topbarSubtitle:
      locale === 'ar'
        ? 'نظرة شاملة على أداء الطلاب ومعدلات النجاح'
        : 'Comprehensive overview of student performance and pass rates',
    heroLabel: locale === 'ar' ? 'لوحة الإدارة · الدرجات' : 'Administration · Grades',
    heroTitle: locale === 'ar' ? 'لوحة تحليلات الدرجات' : 'Grade Analytics Dashboard',
    heroDescription:
      locale === 'ar'
        ? 'راقب أداء الطلاب عبر المواد الدراسية، وحدد الطلاب في خطر، وتابع معدلات النجاح.'
        : 'Monitor student performance across subjects, identify at-risk students, and track pass rates.',
    filterYear: locale === 'ar' ? 'السنة الدراسية' : 'Academic Year',
    filterSemester: locale === 'ar' ? 'الفصل الدراسي' : 'Semester',
    filterClass: locale === 'ar' ? 'الصف' : 'Class',
    allSemesters: locale === 'ar' ? 'كل الفصول' : 'All Semesters',
    allClasses: locale === 'ar' ? 'كل الصفوف' : 'All Classes',
    sem1: locale === 'ar' ? 'الفصل الأول' : 'Semester 1',
    sem2: locale === 'ar' ? 'الفصل الثاني' : 'Semester 2',
    statTotalStudents: locale === 'ar' ? 'إجمالي الطلاب (تقييمات)' : 'Total Student Evaluations',
    statAvgScore: locale === 'ar' ? 'متوسط الدرجة الكلي' : 'Overall Avg Score',
    statPassRate: locale === 'ar' ? 'متوسط نسبة النجاح' : 'Avg Pass Rate',
    statFailing: locale === 'ar' ? 'إجمالي الراسبين' : 'Total Failing',
    chartTitle: locale === 'ar' ? 'متوسط الدرجات حسب المادة' : 'Average Score by Subject',
    failingTitle: locale === 'ar' ? 'الطلاب في خطر الرسوب' : 'At-Risk Students',
    heatmapTitle: locale === 'ar' ? 'ملخص تفصيلي حسب المادة' : 'Detailed Subject Breakdown',
    accessDeniedTitle: locale === 'ar' ? 'غير مصرح بالوصول' : 'Access Denied',
    accessDeniedDescription:
      locale === 'ar'
        ? 'ليس لديك صلاحية عرض تحليلات الدرجات.'
        : 'You do not have permission to view grade analytics.',
    noData: locale === 'ar' ? 'لا توجد بيانات للفلاتر المحددة' : 'No data for the selected filters',
    noDataDesc:
      locale === 'ar'
        ? 'جرب تغيير السنة الدراسية أو الفصل أو الصف.'
        : 'Try adjusting the academic year, semester, or class.',
  }

  return (
    <ProtectedRoute roles={['super_admin', 'admin', 'employee']}>
      <div className="flex min-h-screen bg-[var(--surface-muted)]">
        <AppSidebar currentPath="/grades" />

        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar
            title={copy.topbarTitle}
            subtitle={copy.topbarSubtitle}
            scope={schoolScope}
            fixed
          />

          <main className="app-shell-frame--with-fixed-topbar flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-4 sm:p-6 space-y-6">

              {/* ── Hero Banner ─────────────────────────────────────────── */}
              <div
                className="relative rounded-2xl overflow-hidden p-6 md:p-8"
                style={{
                  background:
                    'linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 55%, #7c3aed) 100%)',
                }}
              >
                {/* Decorative circles */}
                <div
                  className="absolute top-0 end-0 w-72 h-72 rounded-full pointer-events-none opacity-[0.08]"
                  style={{ background: 'white', transform: 'translate(35%,-40%)' }}
                />
                <div
                  className="absolute bottom-0 start-12 w-48 h-48 rounded-full pointer-events-none opacity-[0.06]"
                  style={{ background: 'white', transform: 'translateY(60%)' }}
                />
                <div className="relative flex items-center justify-between gap-4">
                  <div>
                    <p className="text-white/60 text-xs font-medium mb-2 tracking-widest uppercase">
                      {copy.heroLabel}
                    </p>
                    <h1 className="text-2xl md:text-3xl font-black text-white mb-1.5 leading-tight">
                      {copy.heroTitle}
                    </h1>
                    <p className="text-white/70 text-sm">{copy.heroDescription}</p>
                  </div>
                  <div
                    className="hidden md:flex items-center justify-center w-20 h-20 rounded-2xl flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
                  >
                    <span className="text-4xl" aria-hidden>&#x1F4CA;</span>
                  </div>
                </div>
              </div>

              {/* ── School scope banner (super_admin) ────────────────────── */}
              <SchoolScopeBanner scope={schoolScope} />

              {/* ── Nav tabs ─────────────────────────────────────────────── */}
              <GradesNavTabs
                active="dashboard"
                locale={locale}
                canViewAnalytics={canView}
                showMyClasses={can('enter_grades')}
              />

              {/* ── Permission guard ─────────────────────────────────────── */}
              {!canView ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] p-8 text-center">
                  <p className="text-2xl mb-3" aria-hidden>&#x1F512;</p>
                  <p className="font-bold text-[var(--text-primary)] mb-1">{copy.accessDeniedTitle}</p>
                  <p className="text-sm text-[var(--text-muted)]">{copy.accessDeniedDescription}</p>
                </div>
              ) : (
                <>
                  {/* ── Filter bar ──────────────────────────────────────── */}
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <FilterSelect
                        id="year-select"
                        label={copy.filterYear}
                        value={academicYear}
                        onChange={setAcademicYear}
                      >
                        {buildYearOptions().map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </FilterSelect>

                      <FilterSelect
                        id="semester-select"
                        label={copy.filterSemester}
                        value={semester}
                        onChange={v => setSemester(v as '' | '1' | '2')}
                      >
                        <option value="">{copy.allSemesters}</option>
                        <option value="1">{copy.sem1}</option>
                        <option value="2">{copy.sem2}</option>
                      </FilterSelect>

                      <FilterSelect
                        id="class-select"
                        label={copy.filterClass}
                        value={classId}
                        onChange={setClassId}
                        disabled={classesLoading}
                      >
                        <option value="">{copy.allClasses}</option>
                        {classes.map(cls => (
                          <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                      </FilterSelect>
                    </div>
                  </div>

                  {/* ── Error message ──────────────────────────────────── */}
                  {error && (
                    <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300 font-medium">
                      {error}
                    </div>
                  )}

                  {/* ── Stats cards ─────────────────────────────────────── */}
                  {loading ? (
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] p-5 h-24 animate-pulse"
                          style={{ animationDelay: `${i * 60}ms` }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                      <StatCard
                        title={copy.statTotalStudents}
                        value={stats.totalStudents.toLocaleString('ar-SA')}
                        description={
                          locale === 'ar'
                            ? `${data.length} مادة دراسية`
                            : `${data.length} subjects`
                        }
                      />
                      <StatCard
                        title={copy.statAvgScore}
                        value={`${stats.avgScore}/100`}
                        description={
                          locale === 'ar' ? 'متوسط مرجح بعدد الطلاب' : 'Student-weighted average'
                        }
                        valueClass={
                          stats.avgScore >= 75
                            ? 'text-green-600'
                            : stats.avgScore >= 50
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }
                      />
                      <StatCard
                        title={copy.statPassRate}
                        value={`${stats.avgPassRate}%`}
                        description={
                          locale === 'ar' ? 'متوسط نسب النجاح للمواد' : 'Average across subjects'
                        }
                        valueClass={
                          stats.avgPassRate >= 75
                            ? 'text-green-600'
                            : stats.avgPassRate >= 50
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }
                      />
                      <StatCard
                        title={copy.statFailing}
                        value={stats.totalFailing.toLocaleString('ar-SA')}
                        description={
                          locale === 'ar' ? 'عبر جميع المواد' : 'Across all subjects'
                        }
                        valueClass={
                          stats.totalFailing === 0
                            ? 'text-green-600'
                            : stats.totalFailing > 10
                            ? 'text-red-600'
                            : 'text-orange-500'
                        }
                      />
                    </div>
                  )}

                  {/* ── Empty state ─────────────────────────────────────── */}
                  {!loading && !error && !data.length && (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] p-10 text-center">
                      <p className="text-4xl mb-4" aria-hidden>&#x1F4CB;</p>
                      <p className="font-bold text-[var(--text-primary)] text-lg mb-2">{copy.noData}</p>
                      <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto">{copy.noDataDesc}</p>
                    </div>
                  )}

                  {/* ── Chart + Failing panel (2 columns) ──────────────── */}
                  {!loading && data.length > 0 && (
                    <>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Bar chart — takes 2/3 width on large screens */}
                        <div className="lg:col-span-2">
                          <SectionCard title={copy.chartTitle}>
                            <SubjectAveragesChart
                              data={data}
                              passScore={50}
                              locale={locale}
                            />
                          </SectionCard>
                        </div>

                        {/* Failing students — takes 1/3 width on large screens */}
                        <div className="lg:col-span-1">
                          <SectionCard title={copy.failingTitle}>
                            <FailingStudentsPanel
                              academicYear={academicYear}
                              semester={semester === '1' ? 1 : semester === '2' ? 2 : undefined}
                              classId={classId || undefined}
                              passScore={50}
                              locale={locale}
                            />
                          </SectionCard>
                        </div>
                      </div>

                      {/* ── Heatmap grid — full width ───────────────────── */}
                      <SectionCard title={copy.heatmapTitle}>
                        <ClassHeatmapGrid
                          data={data}
                          passScore={50}
                          locale={locale}
                        />
                      </SectionCard>
                    </>
                  )}
                </>
              )}

            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
