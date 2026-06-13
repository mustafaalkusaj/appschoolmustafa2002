'use client'
import { useState, useEffect, useCallback } from 'react'
import { fetchJsonWithAuthorizedSession } from '@/lib/authorized-api'
import type { GradeEntry } from '@/lib/grades/types'
import { AlertTriangle } from '@/lib/icons'

interface Props {
  academicYear: string
  semester?: 1 | 2
  classId?: string
  passScore?: number
  locale?: string
}

function SkeletonRow() {
  return (
    <div className="h-14 animate-pulse rounded-lg bg-[var(--surface-soft)]" />
  )
}

export function FailingStudentsPanel({
  academicYear,
  semester,
  classId,
  passScore = 50,
  locale = 'ar',
}: Props) {
  const [entries, setEntries] = useState<GradeEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const p = new URLSearchParams({ academicYear, status: 'confirmed' })
      if (semester) p.set('semester', String(semester))
      if (classId) p.set('classId', classId)

      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean
        items: GradeEntry[]
      }>(`/api/web/grades?${p}`)

      if (!response.ok || !payload?.ok) throw new Error('فشل التحميل')

      // Filter students scoring below the pass threshold
      const failing = (payload.items ?? [])
        .filter(e => (e.percentage ?? 0) < passScore)
        .sort((a, b) => (a.percentage ?? 0) - (b.percentage ?? 0))
        .slice(0, 20)

      setEntries(failing)
    } catch {
      setError(locale === 'ar' ? 'تعذر تحميل قائمة الطلاب' : 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }, [academicYear, semester, classId, passScore, locale])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-[var(--text-muted)]">
        <AlertTriangle className="w-8 h-8 text-red-400" />
        <p className="text-sm">{error}</p>
        <button
          onClick={() => void load()}
          className="text-xs font-medium text-[var(--primary)] hover:underline"
        >
          {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
        </button>
      </div>
    )
  }

  if (!entries.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-[var(--text-muted)]">
        <span className="text-3xl" aria-hidden>&#x2705;</span>
        <p className="text-sm font-medium">
          {locale === 'ar' ? 'لا يوجد طلاب في خطر حالياً' : 'No at-risk students currently'}
        </p>
        <p className="text-xs text-center max-w-xs">
          {locale === 'ar'
            ? 'جميع الطلاب الذين لديهم درجات مؤكدة تجاوزوا حد النجاح'
            : 'All students with confirmed grades are passing'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pe-1">
      {entries.map(entry => {
        const score = entry.percentage ?? 0
        // Colour intensity: darker red = lower percentage
        const isVeryLow = score < 30
        return (
          <div
            key={entry.id}
            className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
              isVeryLow
                ? 'bg-red-100 dark:bg-red-950/30 border-red-200 dark:border-red-800/40'
                : 'bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-800/30'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertTriangle
                className={`w-4 h-4 shrink-0 ${isVeryLow ? 'text-red-600' : 'text-orange-500'}`}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                  {entry.student_name ?? (locale === 'ar' ? 'طالب' : 'Student')}
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  {[entry.subject_name, entry.class_name, entry.section_name]
                    .filter(Boolean)
                    .join(' — ')}
                </p>
              </div>
            </div>
            <span
              className={`text-sm font-bold shrink-0 ms-2 ${
                isVeryLow ? 'text-red-700 dark:text-red-400' : 'text-orange-700 dark:text-orange-400'
              }`}
            >
              {score.toFixed(0)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}
