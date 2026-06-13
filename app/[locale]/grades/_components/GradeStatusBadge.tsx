'use client'
import type { GradeStatus } from '@/lib/grades/types'

interface Props {
  status: GradeStatus
  locale?: string
}

const LABELS: Record<GradeStatus, { ar: string; en: string; className: string }> = {
  draft: { ar: 'مسودة', en: 'Draft', className: 'bg-gray-100 text-gray-600 border border-gray-200' },
  confirmed: { ar: 'مؤكد', en: 'Confirmed', className: 'bg-blue-100 text-blue-700 border border-blue-200' },
  locked: { ar: 'مقفل', en: 'Locked', className: 'bg-green-100 text-green-700 border border-green-200' },
}

export function GradeStatusBadge({ status, locale = 'ar' }: Props) {
  const config = LABELS[status]
  const label = locale === 'ar' ? config.ar : config.en
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {status === 'locked' && <span>🔒</span>}
      {status === 'confirmed' && <span>✓</span>}
      {label}
    </span>
  )
}
