'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchJsonWithAuthorizedSession } from '@/lib/authorized-api'
import { useRole } from '@/hooks/useRole'
import type { GradeFilters, ClassOption, SectionOption, SubjectOption } from '../_types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCurrentAcademicYear(): string {
  const now = new Date()
  const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1
  return `${year}-${year + 1}`
}

function buildAcademicYearOptions(): string[] {
  const current = getCurrentAcademicYear()
  const baseYear = parseInt(current.split('-')[0], 10)
  return [
    `${baseYear}-${baseYear + 1}`,
    `${baseYear - 1}-${baseYear}`,
    `${baseYear - 2}-${baseYear - 1}`,
  ]
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  onFiltersChange: (filters: GradeFilters | null) => void
  locale?: string
}

interface StructureResponse {
  ok: boolean
  classes: Array<{ id: string; name: string; branch_id: string | null }>
  sections: Array<{ id: string; class_id: string; name: string }>
}

interface SubjectsResponse {
  ok: boolean
  subjects: Array<{ id: string; name: string }>
}

// ── Selector Component ────────────────────────────────────────────────────────

export function GradesSectionSelector({ onFiltersChange, locale = 'ar' }: Props) {
  const isRtl = locale === 'ar'
  const { profile } = useRole()
  const schoolId = profile?.school_id ?? null

  const [academicYear, setAcademicYear] = useState<string>(getCurrentAcademicYear)
  const [semester, setSemester] = useState<1 | 2>(1)
  const [classId, setClassId] = useState<string>('')
  const [sectionId, setSectionId] = useState<string | null>(null)
  const [subjectId, setSubjectId] = useState<string>('')

  const [classes, setClasses] = useState<ClassOption[]>([])
  const [allSections, setAllSections] = useState<SectionOption[]>([])
  const [subjects, setSubjects] = useState<SubjectOption[]>([])

  const [loadingStructure, setLoadingStructure] = useState(false)
  const [loadingSubjects, setLoadingSubjects] = useState(false)

  const yearOptions = buildAcademicYearOptions()

  // Track mounted state to avoid state updates after unmount
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // ── Fetch structure (classes + sections) when schoolId is ready ──────────
  useEffect(() => {
    if (!schoolId) return
    async function fetchStructure() {
      setLoadingStructure(true)
      try {
        const { payload } = await fetchJsonWithAuthorizedSession<StructureResponse>(
          `/api/web/dashboard/structure?schoolId=${schoolId}`
        )
        if (!mountedRef.current) return
        if (payload?.ok) {
          setClasses(
            (payload.classes ?? []).map((c) => ({
              id: c.id,
              name: c.name,
              branch_id: c.branch_id,
            }))
          )
          setAllSections(
            (payload.sections ?? []).map((s) => ({
              id: s.id,
              name: s.name,
              class_id: s.class_id,
            }))
          )
        }
      } catch {
        // silently fail — UI will show empty select
      } finally {
        if (mountedRef.current) setLoadingStructure(false)
      }
    }
    void fetchStructure()
  }, [schoolId])

  // ── Fetch subjects when schoolId is ready ────────────────────────────────
  useEffect(() => {
    if (!schoolId) return
    async function fetchSubjects() {
      setLoadingSubjects(true)
      try {
        const { payload } = await fetchJsonWithAuthorizedSession<SubjectsResponse>(
          `/api/web/grades/subjects?schoolId=${schoolId}`
        )
        if (!mountedRef.current) return
        if (payload?.ok && Array.isArray(payload.subjects)) {
          setSubjects(payload.subjects.map((s) => ({ id: s.id, name: s.name })))
        }
      } catch {
        // silently fail
      } finally {
        if (mountedRef.current) setLoadingSubjects(false)
      }
    }
    void fetchSubjects()
  }, [schoolId])

  // ── Derived sections for selected class ──────────────────────────────────
  const sectionsForClass = allSections.filter((s) => s.class_id === classId)

  // ── Notify parent when filters are complete ───────────────────────────────
  const buildAndNotify = useCallback(
    (
      ay: string,
      sem: 1 | 2,
      cId: string,
      secId: string | null,
      subId: string,
    ) => {
      if (!ay || !cId || !subId) {
        onFiltersChange(null)
        return
      }
      const cls = classes.find((c) => c.id === cId)
      const sec = allSections.find((s) => s.id === secId)
      const sub = subjects.find((s) => s.id === subId)

      onFiltersChange({
        academicYear: ay,
        semester: sem,
        classId: cId,
        className: cls?.name ?? cId,
        sectionId: secId ?? '',
        sectionName: sec?.name ?? null,
        subjectId: subId,
        subjectName: sub?.name ?? subId,
        gradeTypeId: '',
        status: '',
        search: '',
      })
    },
    [classes, allSections, subjects, onFiltersChange]
  )

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleYearChange(y: string) {
    setAcademicYear(y)
    buildAndNotify(y, semester, classId, sectionId, subjectId)
  }

  function handleSemesterChange(s: string) {
    const sem = parseInt(s, 10) as 1 | 2
    setSemester(sem)
    buildAndNotify(academicYear, sem, classId, sectionId, subjectId)
  }

  function handleClassChange(cId: string) {
    setClassId(cId)
    setSectionId(null)
    // Keep subject if already selected — triggers auto-load
    buildAndNotify(academicYear, semester, cId, null, subjectId)
  }

  function handleSectionChange(secId: string) {
    const resolved = secId === '__none__' ? null : secId
    setSectionId(resolved)
    buildAndNotify(academicYear, semester, classId, resolved, subjectId)
  }

  function handleSubjectChange(subId: string) {
    setSubjectId(subId)
    buildAndNotify(academicYear, semester, classId, sectionId, subId)
  }

  // ── Shared select style ───────────────────────────────────────────────────
  const selectCls =
    'h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-sm ' +
    'text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed transition-colors ' +
    'appearance-none cursor-pointer min-w-[140px]'

  const labelCls = 'text-xs font-medium text-[var(--text-muted)] mb-1 block'

  const isLoading = loadingStructure || loadingSubjects

  // ── Copy ─────────────────────────────────────────────────────────────────
  const c = {
    title: isRtl ? 'تصفية الدرجات' : 'Filter Grades',
    year: isRtl ? 'السنة الدراسية' : 'Academic Year',
    semester: isRtl ? 'الفصل الدراسي' : 'Semester',
    sem1: isRtl ? 'الفصل الأول' : 'Semester 1',
    sem2: isRtl ? 'الفصل الثاني' : 'Semester 2',
    class: isRtl ? 'الصف' : 'Class',
    chooseClass: isRtl ? 'اختر الصف...' : 'Choose class...',
    section: isRtl ? 'الشعبة' : 'Section',
    noSection: isRtl ? 'بدون شعبة' : 'No section',
    subject: isRtl ? 'المادة' : 'Subject',
    chooseSubject: isRtl ? 'اختر المادة...' : 'Choose subject...',
    loading: isRtl ? 'جارٍ التحميل...' : 'Loading...',
  }

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] p-5"
    >
      <p className="text-xs font-bold text-[var(--text-muted)] mb-4 uppercase tracking-widest">
        {c.title}
      </p>

      <div className="flex flex-wrap gap-4 items-end">

        {/* Academic year */}
        <div className="flex flex-col">
          <label className={labelCls}>{c.year}</label>
          <div className="relative">
            <select
              value={academicYear}
              onChange={(e) => handleYearChange(e.target.value)}
              className={selectCls}
              disabled={isLoading}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 end-2 flex items-center text-[var(--text-muted)]">
              ▾
            </span>
          </div>
        </div>

        {/* Semester */}
        <div className="flex flex-col">
          <label className={labelCls}>{c.semester}</label>
          <div className="relative">
            <select
              value={semester}
              onChange={(e) => handleSemesterChange(e.target.value)}
              className={selectCls}
              disabled={isLoading}
            >
              <option value={1}>{c.sem1}</option>
              <option value={2}>{c.sem2}</option>
            </select>
            <span className="pointer-events-none absolute inset-y-0 end-2 flex items-center text-[var(--text-muted)]">
              ▾
            </span>
          </div>
        </div>

        {/* Class */}
        <div className="flex flex-col">
          <label className={labelCls}>{c.class}</label>
          <div className="relative">
            <select
              value={classId}
              onChange={(e) => handleClassChange(e.target.value)}
              className={selectCls}
              disabled={loadingStructure}
            >
              <option value="">{loadingStructure ? c.loading : c.chooseClass}</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 end-2 flex items-center text-[var(--text-muted)]">
              ▾
            </span>
          </div>
        </div>

        {/* Section */}
        <div className="flex flex-col">
          <label className={labelCls}>{c.section}</label>
          <div className="relative">
            <select
              value={sectionId ?? '__none__'}
              onChange={(e) => handleSectionChange(e.target.value)}
              className={selectCls}
              disabled={loadingStructure || !classId}
            >
              <option value="__none__">{c.noSection}</option>
              {sectionsForClass.map((sec) => (
                <option key={sec.id} value={sec.id}>{sec.name}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 end-2 flex items-center text-[var(--text-muted)]">
              ▾
            </span>
          </div>
        </div>

        {/* Subject */}
        <div className="flex flex-col">
          <label className={labelCls}>{c.subject}</label>
          <div className="relative">
            <select
              value={subjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className={selectCls}
              disabled={loadingSubjects || !classId}
            >
              <option value="">{loadingSubjects ? c.loading : c.chooseSubject}</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 end-2 flex items-center text-[var(--text-muted)]">
              ▾
            </span>
          </div>
        </div>

      </div>

      {/* Completion indicator */}
      {classId && subjectId && (
        <div className="mt-3 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-green-600 dark:text-green-400 font-medium">
            {isRtl ? 'جاهز لعرض الدرجات' : 'Ready to load grades'}
          </span>
        </div>
      )}
    </div>
  )
}
