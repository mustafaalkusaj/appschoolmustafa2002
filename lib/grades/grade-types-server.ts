import "server-only"
import type { SupabaseClient } from '@supabase/supabase-js'
import type { GradeType } from './types'
import { DEFAULT_GRADE_TYPES } from './types'

// ---------------------------------------------------------------------------
// Feature gate type
// ---------------------------------------------------------------------------

export type GradeFeatureGate = {
  available: boolean
  code?: 'missing_table' | 'forbidden' | 'unknown'
  message?: string
}

const AVAILABLE_GATE: GradeFeatureGate = { available: true }

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function featureGateFromError(error: unknown, tableName: string): GradeFeatureGate {
  const msg =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message).toLowerCase()
        : ''

  if (msg.includes('could not find the table') || msg.includes(`"${tableName}"`)) {
    return {
      available: false,
      code: 'missing_table',
      message: `جدول ${tableName} غير جاهز بعد في Supabase.`,
    }
  }

  if (msg.includes('permission') || msg.includes('unauthorized') || msg.includes('not allowed')) {
    return {
      available: false,
      code: 'forbidden',
      message: `لا توجد صلاحية كافية للوصول إلى ${tableName}.`,
    }
  }

  return {
    available: false,
    code: 'unknown',
    message:
      error instanceof Error && error.message.trim()
        ? error.message
        : `تعذر تحميل ${tableName}.`,
  }
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    const msg = ((error as { message: string }).message).trim()
    if (msg) return msg
  }
  return fallback
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface GradeTypesResult {
  ok: boolean
  gate: GradeFeatureGate
  gradeTypes: GradeType[]
}

/**
 * Fetch all grade types for the school ordered by sort_order.
 * If the table doesn't exist yet, returns synthetic defaults.
 */
export async function fetchGradeTypes(
  serviceSupabase: SupabaseClient,
  schoolId: string,
  activeOnly = false,
): Promise<GradeTypesResult> {
  try {
    let query = serviceSupabase
      .from('grade_types')
      .select('*')
      .eq('school_id', schoolId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      if (error.message?.includes('could not find the table')) {
        // Return synthetic defaults so UI works before migration
        return {
          ok: true,
          gate: { available: false, code: 'missing_table', message: 'جدول grade_types غير جاهز بعد.' },
          gradeTypes: buildSyntheticGradeTypes(schoolId),
        }
      }
      throw error
    }

    const raw = (data ?? []) as unknown as (GradeType & { max_score: number })[]
    // Map max_score → default_max_score for UI compat
    const types: GradeType[] = raw.map((t) => ({
      ...t,
      default_max_score: t.default_max_score ?? t.max_score,
    }))

    // If school has no grade types yet, seed defaults
    if (types.length === 0) {
      const seeded = await seedDefaultGradeTypes(serviceSupabase, schoolId)
      return { ok: true, gate: AVAILABLE_GATE, gradeTypes: seeded }
    }

    return { ok: true, gate: AVAILABLE_GATE, gradeTypes: types }
  } catch (err) {
    return {
      ok: false,
      gate: featureGateFromError(err, 'grade_types'),
      gradeTypes: buildSyntheticGradeTypes(schoolId),
    }
  }
}

/**
 * Seed the default grade types for a school on first use.
 */
async function seedDefaultGradeTypes(
  serviceSupabase: SupabaseClient,
  schoolId: string,
): Promise<GradeType[]> {
  const now = new Date().toISOString()
  const rows = DEFAULT_GRADE_TYPES.map((t) => ({
    school_id: schoolId,
    name: t.name,
    max_score: t.max_score,
    pass_score: t.pass_score ?? Math.round(t.max_score / 2),
    weight: t.weight ?? 1,
    is_active: t.is_active,
    sort_order: t.sort_order,
    created_at: now,
    updated_at: now,
  }))

  const { data, error } = await serviceSupabase
    .from('grade_types')
    .insert(rows)
    .select('*')

  if (error) {
    // If insert fails, return synthetics
    return buildSyntheticGradeTypes(schoolId)
  }

  return (data ?? []) as unknown as GradeType[]
}

/**
 * Build in-memory grade types when the DB table isn't ready yet.
 */
function buildSyntheticGradeTypes(schoolId: string): GradeType[] {
  const now = new Date().toISOString()
  return DEFAULT_GRADE_TYPES.map((t, i) => ({
    id: `synthetic_grade_type_${i}`,
    school_id: schoolId,
    name: t.name,
    max_score: t.max_score,
    default_max_score: t.default_max_score,
    pass_score: t.pass_score ?? Math.round(t.max_score / 2),
    weight: t.weight ?? 1,
    is_active: t.is_active,
    sort_order: t.sort_order,
    created_at: now,
    updated_at: now,
  }))
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export interface GradeTypeMutationResult {
  ok: boolean
  gate: GradeFeatureGate
  gradeType?: GradeType
  message: string | null
}

/**
 * Create or update a grade type.
 */
export async function upsertGradeType(
  serviceSupabase: SupabaseClient,
  schoolId: string,
  input: Partial<GradeType> & { name: string },
): Promise<GradeTypeMutationResult> {
  try {
    const now = new Date().toISOString()

    const payload: Record<string, unknown> = {
      school_id: schoolId,
      name: input.name.trim(),
      name_ar: input.name_ar?.trim() ?? input.name.trim(),
      name_en: input.name_en?.trim() ?? '',
      category: input.category ?? 'other',
      default_max_score: input.default_max_score ?? 10,
      is_active: input.is_active ?? true,
      sort_order: input.sort_order ?? 99,
      updated_at: now,
    }

    if (input.id && !input.id.startsWith('synthetic_')) {
      payload.id = input.id
    } else {
      payload.created_at = now
    }

    const { data, error } = await serviceSupabase
      .from('grade_types')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .maybeSingle()

    if (error) {
      if (error.message?.includes('could not find the table')) {
        return {
          ok: false,
          gate: { available: false, code: 'missing_table', message: 'جدول grade_types غير جاهز بعد.' },
          message: 'جدول grade_types غير جاهز بعد.',
        }
      }
      throw error
    }

    return {
      ok: true,
      gate: AVAILABLE_GATE,
      gradeType: (data as unknown as GradeType) ?? undefined,
      message: 'تم حفظ نوع الدرجة بنجاح.',
    }
  } catch (err) {
    return {
      ok: false,
      gate: featureGateFromError(err, 'grade_types'),
      message: readErrorMessage(err, 'تعذر حفظ نوع الدرجة.'),
    }
  }
}

export interface GradeTypeDeleteResult {
  ok: boolean
  gate: GradeFeatureGate
  message: string | null
}

/**
 * Delete a grade type by ID.
 * Refuses deletion if grade entries still reference it.
 */
export async function deleteGradeType(
  serviceSupabase: SupabaseClient,
  schoolId: string,
  gradeTypeId: string,
): Promise<GradeTypeDeleteResult> {
  try {
    // Check if any grade entries use this type
    const { data: usageData, error: usageError } = await serviceSupabase
      .from('grade_entries')
      .select('id')
      .eq('school_id', schoolId)
      .eq('grade_type_id', gradeTypeId)
      .limit(1)

    if (usageError) {
      if (!usageError.message?.includes('could not find the table')) {
        throw usageError
      }
    } else if ((usageData ?? []).length > 0) {
      return {
        ok: false,
        gate: AVAILABLE_GATE,
        message: 'لا يمكن حذف نوع الدرجة لأنه مرتبط بدرجات موجودة.',
      }
    }

    const { error: deleteError } = await serviceSupabase
      .from('grade_types')
      .delete()
      .eq('id', gradeTypeId)
      .eq('school_id', schoolId)

    if (deleteError) {
      if (deleteError.message?.includes('could not find the table')) {
        return {
          ok: false,
          gate: { available: false, code: 'missing_table', message: 'جدول grade_types غير جاهز بعد.' },
          message: 'جدول grade_types غير جاهز بعد.',
        }
      }
      throw deleteError
    }

    return { ok: true, gate: AVAILABLE_GATE, message: 'تم حذف نوع الدرجة بنجاح.' }
  } catch (err) {
    return {
      ok: false,
      gate: featureGateFromError(err, 'grade_types'),
      message: readErrorMessage(err, 'تعذر حذف نوع الدرجة.'),
    }
  }
}
