import type { GradeEntry, GradeEntryInput, GradeLabel } from './types'
import { GRADE_LABELS } from './types'

/**
 * Compute percentage from score and max_score.
 * Returns a number with 1 decimal place precision.
 */
export function computePercentage(score: number, maxScore: number): number {
  if (maxScore <= 0) return 0
  return Math.round((score / maxScore) * 100 * 10) / 10
}

/**
 * Resolve grade label from a percentage value.
 * Falls back to the last label (Fail) if no match.
 */
export function computeGradeLabel(percentage: number): GradeLabel {
  return (
    GRADE_LABELS.find((g) => percentage >= g.minPercent && percentage <= g.maxPercent) ??
    GRADE_LABELS[GRADE_LABELS.length - 1]
  )
}

/**
 * Compute the grade label directly from a GradeEntry.
 */
export function computeGradeLabelFromEntry(entry: Pick<GradeEntry, 'score' | 'max_score'>): GradeLabel {
  const pct = computePercentage(entry.score, entry.max_score)
  return computeGradeLabel(pct)
}

/**
 * Validate that score is within valid range [0, maxScore].
 */
export interface ScoreValidationError {
  field: string
  messageAr: string
}

export function validateScore(input: GradeEntryInput): ScoreValidationError[] {
  const errors: ScoreValidationError[] = []

  if (input.score < 0) {
    errors.push({ field: 'score', messageAr: 'الدرجة لا يمكن أن تكون سالبة' })
  }
  if (input.max_score <= 0) {
    errors.push({ field: 'max_score', messageAr: 'الدرجة الكاملة يجب أن تكون أكبر من صفر' })
  }
  if (input.score > input.max_score) {
    errors.push({ field: 'score', messageAr: `الدرجة المحصلة (${input.score}) تتجاوز الدرجة الكاملة (${input.max_score})` })
  }

  return errors
}

/**
 * Compute aggregate stats for a set of entries belonging to one student + subject.
 * Returns total score, total max, overall percentage, and grade label.
 */
export function computeStudentSubjectSummary(entries: Pick<GradeEntry, 'score' | 'max_score'>[]) {
  const totalScore = entries.reduce((sum, e) => sum + e.score, 0)
  const totalMax = entries.reduce((sum, e) => sum + e.max_score, 0)
  const percentage = computePercentage(totalScore, totalMax)
  const label = computeGradeLabel(percentage)

  return { totalScore, totalMax, percentage, label }
}
