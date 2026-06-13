'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchJsonWithAuthorizedSession } from '@/lib/authorized-api'
import { computePercentage, computeGradeLabel } from '@/lib/grades/grade-calculator'
import type { GradeEntry, GradeType, GradeEntryInput } from '@/lib/grades/types'
import type { GradeFilters, GradeEntryDraft, StudentOption } from '../_types'
import { GradeStatusBadge } from './GradeStatusBadge'
import { GradeLabelBadge } from './GradeLabelBadge'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  entries: GradeEntry[]
  gradeTypes: GradeType[]
  filters: GradeFilters
  locale?: string
  canEnter: boolean
  canConfirm: boolean
  schoolId?: string
  onSave?: (input: GradeEntryInput & { school_id: string }) => Promise<{ ok: boolean; message?: string | null }>
  onDelete?: (id: string, schoolId: string) => Promise<{ ok: boolean; message?: string | null }>
  onEntryChanged?: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function emptyDraft(): GradeEntryDraft {
  return {
    studentId: '',
    studentName: '',
    subjectId: '',
    subjectName: '',
    gradeTypeId: null,
    gradeTypeName: '',
    score: '',
    maxScore: '',
    note: '',
    sendNotification: false,
    isSaving: false,
    saveError: null,
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GradesEntryGrid({
  entries,
  gradeTypes,
  filters,
  locale = 'ar',
  canEnter,
  schoolId,
  onSave,
  onDelete,
  onEntryChanged,
}: Props) {
  const isRtl = locale === 'ar'

  // ── Students search ───────────────────────────────────────────────────────
  const [students, setStudents] = useState<StudentOption[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')
  const [showStudentDropdown, setShowStudentDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch students for the selected class
  useEffect(() => {
    if (!filters.classId) return
    setStudentsLoading(true)
    const params = new URLSearchParams({
      classId: filters.classId,
      pageSize: '200',
      status: 'active',
    })
    fetchJsonWithAuthorizedSession<{
      ok: boolean
      data: Array<{ id: string; full_name: string; class_id?: string | null; section_id?: string | null }>
    }>(`/api/web/students/list?${params}`)
      .then(({ payload }) => {
        if (payload?.ok && payload.data) {
          setStudents(
            payload.data.map((s) => ({
              id: s.id,
              name: s.full_name,
              class_id: s.class_id ?? null,
              section_id: s.section_id ?? null,
            }))
          )
        }
      })
      .catch(() => {})
      .finally(() => setStudentsLoading(false))
  }, [filters.classId, filters.className])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowStudentDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students
    const q = studentSearch.toLowerCase()
    return students.filter((s) => s.name.toLowerCase().includes(q))
  }, [students, studentSearch])

  // ── Draft state ───────────────────────────────────────────────────────────
  const [draft, setDraft] = useState<GradeEntryDraft>(emptyDraft)

  // When a grade type is selected, auto-fill max_score from the grade type
  const handleGradeTypeChange = useCallback(
    (typeId: string) => {
      const gt = gradeTypes.find((t) => t.id === typeId)
      if (gt) {
        setDraft((prev) => ({
          ...prev,
          gradeTypeId: gt.id,
          gradeTypeName: isRtl ? gt.name_ar || gt.name : gt.name_en || gt.name,
          maxScore: String(gt.default_max_score),
        }))
      }
    },
    [gradeTypes, isRtl]
  )

  const handleSelectStudent = useCallback(
    (student: StudentOption) => {
      setDraft((prev) => ({
        ...prev,
        studentId: student.id,
        studentName: student.name,
      }))
      setStudentSearch(student.name)
      setShowStudentDropdown(false)
    },
    []
  )

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!schoolId || !onSave) return
    if (!draft.studentId) {
      setDraft((p) => ({ ...p, saveError: isRtl ? 'يرجى اختيار الطالب' : 'Select a student' }))
      return
    }
    const score = parseFloat(draft.score)
    const maxScore = parseFloat(draft.maxScore)
    if (isNaN(score) || score < 0) {
      setDraft((p) => ({ ...p, saveError: isRtl ? 'أدخل درجة صالحة' : 'Enter a valid score' }))
      return
    }
    if (isNaN(maxScore) || maxScore <= 0) {
      setDraft((p) => ({ ...p, saveError: isRtl ? 'أدخل الدرجة الكاملة' : 'Enter max score' }))
      return
    }
    if (score > maxScore) {
      setDraft((p) => ({
        ...p,
        saveError: isRtl ? 'الدرجة المحصلة لا يمكن أن تتجاوز الكاملة' : 'Score exceeds max',
      }))
      return
    }

    setDraft((p) => ({ ...p, isSaving: true, saveError: null }))

    const input: GradeEntryInput & { school_id: string } = {
      school_id: schoolId,
      student_id: draft.studentId,
      subject_id: filters.subjectId,
      class_id: filters.classId,
      section_id: filters.sectionId ?? null,
      grade_type_id: draft.gradeTypeId,
      grade_type_name: draft.gradeTypeName || null,
      academic_year: filters.academicYear,
      semester: filters.semester,
      score,
      max_score: maxScore,
      note: draft.note.trim() || null,
      send_notification: draft.sendNotification,
    }

    const result = await onSave(input)

    if (result.ok) {
      setDraft(emptyDraft())
      setStudentSearch('')
      onEntryChanged?.()
    } else {
      setDraft((p) => ({
        ...p,
        isSaving: false,
        saveError: result.message ?? (isRtl ? 'تعذر حفظ الدرجة' : 'Failed to save'),
      }))
    }
  }, [draft, schoolId, filters, onSave, onEntryChanged, isRtl])

  // ── Delete ────────────────────────────────────────────────────────────────
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = useCallback(
    async (entryId: string) => {
      if (!schoolId || !onDelete) return
      setDeletingId(entryId)
      const result = await onDelete(entryId, schoolId)
      setDeletingId(null)
      if (result.ok) onEntryChanged?.()
    },
    [schoolId, onDelete, onEntryChanged]
  )

  // ── Entry detail expand ───────────────────────────────────────────────────
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── New Entry Form ─────────────────────────────────────────────── */}
      {canEnter && (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[var(--border)]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">➕</span>
              <h3 className="text-base font-black text-[var(--text-primary)]">
                {isRtl ? 'إدخال درجة جديدة' : 'Add New Grade'}
              </h3>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              {isRtl
                ? `${filters.className} — ${filters.subjectName}`
                : `${filters.className} — ${filters.subjectName}`}
            </p>
          </div>

          <div className="p-5 space-y-4">
            {/* Row 1: Student + Grade Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Student Selector */}
              <div className="relative" ref={dropdownRef}>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">
                  {isRtl ? 'اسم الطالب' : 'Student'}
                </label>
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value)
                    setShowStudentDropdown(true)
                    if (!e.target.value.trim()) {
                      setDraft((p) => ({ ...p, studentId: '', studentName: '' }))
                    }
                  }}
                  onFocus={() => setShowStudentDropdown(true)}
                  placeholder={
                    studentsLoading
                      ? isRtl ? 'جار التحميل...' : 'Loading...'
                      : isRtl ? 'ابحث عن الطالب...' : 'Search student...'
                  }
                  className="w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 placeholder:text-[var(--text-muted)]"
                  disabled={studentsLoading}
                />
                {draft.studentId && (
                  <span className="absolute top-[34px] end-3 text-green-500 text-sm">✓</span>
                )}

                <AnimatePresence>
                  {showStudentDropdown && filteredStudents.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.12 }}
                      className="absolute z-30 top-full mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl custom-scrollbar"
                    >
                      {filteredStudents.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => handleSelectStudent(s)}
                          className={`w-full text-start px-4 py-2.5 text-sm hover:bg-[var(--primary)]/8 transition-colors ${
                            draft.studentId === s.id
                              ? 'bg-[var(--primary)]/10 font-bold text-[var(--primary)]'
                              : 'text-[var(--text-primary)]'
                          }`}
                        >
                          {s.name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Grade Type Selector */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">
                  {isRtl ? 'نوع الدرجة' : 'Grade Type'}
                </label>
                <select
                  value={draft.gradeTypeId ?? ''}
                  onChange={(e) => {
                    if (e.target.value) handleGradeTypeChange(e.target.value)
                    else setDraft((p) => ({ ...p, gradeTypeId: null, gradeTypeName: '', maxScore: '' }))
                  }}
                  className="w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 appearance-none cursor-pointer"
                >
                  <option value="">{isRtl ? 'اختر نوع الدرجة...' : 'Select grade type...'}</option>
                  {gradeTypes.map((gt) => (
                    <option key={gt.id} value={gt.id}>
                      {isRtl ? gt.name_ar || gt.name : gt.name_en || gt.name}
                      {' '}({gt.default_max_score})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Score + Max Score + Note */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">
                  {isRtl ? 'الدرجة المحصلة' : 'Score'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={draft.score}
                  onChange={(e) => setDraft((p) => ({ ...p, score: e.target.value, saveError: null }))}
                  placeholder="0"
                  className="w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 text-sm font-bold text-center text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">
                  {isRtl ? 'الدرجة الكاملة' : 'Max Score'}
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={draft.maxScore}
                  onChange={(e) => setDraft((p) => ({ ...p, maxScore: e.target.value, saveError: null }))}
                  placeholder="10"
                  className="w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 text-sm font-bold text-center text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">
                  {isRtl ? 'ملاحظات (اختياري)' : 'Note (optional)'}
                </label>
                <input
                  type="text"
                  value={draft.note}
                  onChange={(e) => setDraft((p) => ({ ...p, note: e.target.value }))}
                  placeholder={isRtl ? 'ملاحظات إضافية...' : 'Additional notes...'}
                  className="w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 placeholder:text-[var(--text-muted)]"
                />
              </div>
            </div>

            {/* Row 3: Notification toggle + Preview + Submit */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={draft.sendNotification}
                  onChange={(e) => setDraft((p) => ({ ...p, sendNotification: e.target.checked }))}
                  className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]/40"
                />
                <span className="text-sm text-[var(--text-primary)]">
                  {isRtl ? 'إرسال إشعار للطالب' : 'Send notification to student'}
                </span>
              </label>

              {/* Live preview */}
              {draft.score && draft.maxScore && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-[var(--text-muted)]">
                    {draft.score}/{draft.maxScore}
                  </span>
                  <span className="font-bold text-[var(--text-primary)]">
                    {computePercentage(parseFloat(draft.score), parseFloat(draft.maxScore)).toFixed(0)}%
                  </span>
                  {(() => {
                    const pct = computePercentage(parseFloat(draft.score), parseFloat(draft.maxScore))
                    const info = computeGradeLabel(pct)
                    return (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ background: info.color + '22', color: info.color }}
                      >
                        {info.badge} {isRtl ? info.labelAr : info.label}
                      </span>
                    )
                  })()}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={draft.isSaving || !draft.studentId}
                className="flex items-center gap-2 px-6 h-11 rounded-xl bg-[var(--primary)] text-white text-sm font-bold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {draft.isSaving ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>💾</span>
                )}
                {isRtl ? 'حفظ الدرجة' : 'Save Grade'}
              </button>
            </div>

            {/* Error */}
            {draft.saveError && (
              <p className="text-sm text-red-500 font-medium">{draft.saveError}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Entries List ─────────────────────────────────────────────── */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <h3 className="text-base font-black text-[var(--text-primary)]">
              {isRtl ? 'سجل الدرجات' : 'Grade Records'}
            </h3>
            <span className="text-xs text-[var(--text-muted)] bg-[var(--surface-muted)] px-2 py-0.5 rounded-full font-bold">
              {entries.length}
            </span>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-3xl mb-2">📝</p>
            <p className="text-sm text-[var(--text-muted)]">
              {isRtl ? 'لا توجد درجات مسجلة بعد' : 'No grades recorded yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {entries.map((entry) => {
              const pct = entry.percentage ?? computePercentage(entry.score, entry.max_score)
              const info = computeGradeLabel(pct)
              const isExpanded = expandedId === entry.id
              const isDraft = entry.status === 'draft'

              return (
                <div key={entry.id} className="group">
                  {/* Main row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    className="w-full text-start p-4 hover:bg-[var(--surface-muted)]/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {/* Student name */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                          {entry.student_name ?? entry.student_id}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          {entry.grade_type_name
                            ? entry.grade_type_name
                            : isRtl ? 'بدون تصنيف' : 'Uncategorized'}
                        </p>
                      </div>

                      {/* Score */}
                      <div className="text-center px-3">
                        <p className="text-lg font-black text-[var(--text-primary)] leading-none">
                          {entry.score}<span className="text-xs text-[var(--text-muted)] font-normal">/{entry.max_score}</span>
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{pct.toFixed(0)}%</p>
                      </div>

                      {/* Label */}
                      <span
                        className="hidden sm:inline-flex px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap"
                        style={{ background: info.color + '18', color: info.color }}
                      >
                        {info.badge} {isRtl ? info.labelAr : info.label}
                      </span>

                      {/* Status */}
                      <GradeStatusBadge status={entry.status} locale={locale} />

                      {/* Notification */}
                      {entry.notification_sent && (
                        <span title={isRtl ? 'تم الإرسال' : 'Sent'} className="text-sm">📨</span>
                      )}

                      {/* Expand chevron */}
                      <span
                        className={`text-xs text-[var(--text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      >
                        ▾
                      </span>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-3">
                          <div className="rounded-xl bg-[var(--surface-muted)] p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div>
                              <span className="text-[var(--text-muted)] block mb-0.5">
                                {isRtl ? 'الصف' : 'Class'}
                              </span>
                              <span className="font-bold text-[var(--text-primary)]">
                                {entry.class_name ?? '—'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[var(--text-muted)] block mb-0.5">
                                {isRtl ? 'المادة' : 'Subject'}
                              </span>
                              <span className="font-bold text-[var(--text-primary)]">
                                {entry.subject_name ?? '—'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[var(--text-muted)] block mb-0.5">
                                {isRtl ? 'المعلم' : 'Teacher'}
                              </span>
                              <span className="font-bold text-[var(--text-primary)]">
                                {entry.teacher_name ?? '—'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[var(--text-muted)] block mb-0.5">
                                {isRtl ? 'التاريخ' : 'Date'}
                              </span>
                              <span className="font-bold text-[var(--text-primary)]">
                                {new Date(entry.created_at).toLocaleDateString(locale === 'ar' ? 'ar-IQ' : 'en-US')}
                              </span>
                            </div>
                          </div>

                          {entry.note && (
                            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 p-3 text-xs text-amber-700 dark:text-amber-300">
                              <span className="font-bold">{isRtl ? 'ملاحظة: ' : 'Note: '}</span>
                              {entry.note}
                            </div>
                          )}

                          {/* Actions */}
                          {isDraft && canEnter && onDelete && (
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleDelete(entry.id)}
                                disabled={deletingId === entry.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-40"
                              >
                                {deletingId === entry.id ? (
                                  <span className="w-3 h-3 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                                ) : (
                                  <span>🗑️</span>
                                )}
                                {isRtl ? 'حذف' : 'Delete'}
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
