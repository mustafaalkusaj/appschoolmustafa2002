'use client'
import { useCallback } from 'react'
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from '@/lib/authorized-api'
import type { GradeEntryInput, GradeEntryUpdate } from '@/lib/grades/types'

export function useGradeEntry() {
  /** Create a new grade entry (POST). school_id is embedded in the input. */
  const create = useCallback(async (input: GradeEntryInput & { school_id: string }) => {
    const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; message?: string }>(
      '/api/web/grades',
      { method: 'POST', headers: withJsonHeaders(), body: JSON.stringify(input) }
    )
    return { ok: response.ok && !!payload?.ok, message: payload?.message ?? null }
  }, [])

  /** Update an existing grade entry (PATCH). school_id required. */
  const update = useCallback(async (id: string, schoolId: string, updates: GradeEntryUpdate, reason?: string) => {
    const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; message?: string }>(
      `/api/web/grades/${id}`,
      { method: 'PATCH', headers: withJsonHeaders(), body: JSON.stringify({ ...updates, school_id: schoolId, reason }) }
    )
    return { ok: response.ok && !!payload?.ok, message: payload?.message ?? null }
  }, [])

  /** Delete a grade entry (DELETE). Only draft entries. */
  const deleteEntry = useCallback(async (id: string, schoolId: string) => {
    const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; message?: string }>(
      `/api/web/grades/${id}?schoolId=${encodeURIComponent(schoolId)}`,
      { method: 'DELETE' }
    )
    return { ok: response.ok && !!payload?.ok, message: payload?.message ?? null }
  }, [])

  /** Confirm multiple draft entries. */
  const confirm = useCallback(async (entryIds: string[]) => {
    const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; count: number }>(
      '/api/web/grades/confirm',
      { method: 'POST', headers: withJsonHeaders(), body: JSON.stringify({ entryIds }) }
    )
    return { ok: response.ok && !!payload?.ok, count: payload?.count ?? 0 }
  }, [])

  /** Lock all entries for a section. */
  const lock = useCallback(async (params: {
    classId?: string
    sectionId?: string | null
    subjectId: string
    academicYear: string
    semester: 1 | 2
    reason: string
  }) => {
    const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; count: number }>(
      '/api/web/grades/lock',
      { method: 'POST', headers: withJsonHeaders(), body: JSON.stringify(params) }
    )
    return { ok: response.ok && !!payload?.ok, count: payload?.count ?? 0 }
  }, [])

  return { create, update, deleteEntry, confirm, lock }
}
