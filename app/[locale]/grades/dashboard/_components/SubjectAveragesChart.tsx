'use client'
import dynamic from 'next/dynamic'
import type { SubjectAnalytics } from '../_hooks/useGradeAnalytics'

const Chart = dynamic(
  () => import('./SubjectAveragesChartInner').then(m => m.SubjectAveragesChartInner),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 animate-pulse bg-[var(--surface-soft)] rounded-xl" />
    ),
  },
)

interface Props {
  data: SubjectAnalytics[]
  passScore?: number
  locale?: string
}

export function SubjectAveragesChart({ data, passScore = 50, locale = 'ar' }: Props) {
  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-[var(--text-muted)] text-sm">
        {locale === 'ar' ? 'لا توجد بيانات كافية للرسم البياني' : 'No data available'}
      </div>
    )
  }
  return <Chart data={data} passScore={passScore} locale={locale} />
}
