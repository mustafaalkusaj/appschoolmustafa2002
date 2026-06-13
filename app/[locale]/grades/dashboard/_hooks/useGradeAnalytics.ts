'use client'
import { useState, useCallback } from 'react'
import { fetchJsonWithAuthorizedSession } from '@/lib/authorized-api'

export interface SubjectAnalytics {
  subjectId: string
  subjectName: string
  avgScore: number
  totalStudents: number
  passingCount: number
  failingCount: number
  passRate: number
}

export interface AnalyticsState {
  data: SubjectAnalytics[]
  loading: boolean
  error: string | null
}

interface RawSubjectAnalytics {
  subjectId: string
  subjectName: string
  avgScore: number
  totalStudents: number
  passingCount: number
  failingCount: number
}

export function useGradeAnalytics() {
  const [state, setState] = useState<AnalyticsState>({ data: [], loading: false, error: null })

  const load = useCallback(async (params: {
    academicYear: string
    semester?: 1 | 2
    classId?: string
  }) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const p = new URLSearchParams({ academicYear: params.academicYear })
      if (params.semester) p.set('semester', String(params.semester))
      if (params.classId) p.set('classId', params.classId)

      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean
        data: RawSubjectAnalytics[]
      }>(`/api/web/grades/analytics?${p}`)

      if (!response.ok || !payload?.ok) throw new Error('فشل تحميل التحليلات')

      // Compute passRate (not returned by server — derived from passingCount / totalStudents)
      const data: SubjectAnalytics[] = (payload.data ?? []).map(item => ({
        ...item,
        passRate:
          item.totalStudents > 0
            ? Math.round((item.passingCount / item.totalStudents) * 100)
            : 0,
      }))

      setState({ data, loading: false, error: null })
    } catch {
      setState(prev => ({ ...prev, loading: false, error: 'تعذر تحميل تحليلات الدرجات' }))
    }
  }, [])

  return { ...state, load }
}
