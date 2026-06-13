'use client'
import { computeGradeLabel } from '@/lib/grades/grade-calculator'

interface Props {
  percentage: number
  showBadge?: boolean
  size?: 'sm' | 'md'
}

export function GradeLabelBadge({ percentage, showBadge = true, size = 'sm' }: Props) {
  const grade = computeGradeLabel(percentage)
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClass} ${grade.color}`}>
      {showBadge && <span>{grade.badge}</span>}
      <span>{grade.labelAr}</span>
    </span>
  )
}
