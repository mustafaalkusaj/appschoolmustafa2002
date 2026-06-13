'use client'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import type { SubjectAnalytics } from '../_hooks/useGradeAnalytics'

interface Props {
  data: SubjectAnalytics[]
  passScore: number
  locale: string
}

interface ChartDatum {
  name: string
  fullName: string
  avg: number
  passRate: number
  failing: number
}

interface TooltipPayloadEntry {
  payload?: ChartDatum
}

function CustomTooltip({
  active,
  payload,
  locale,
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  locale: string
}) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div
      className="rounded-xl border border-[var(--border)] p-3 text-sm shadow-lg"
      style={{ background: 'var(--card-bg)' }}
    >
      <p className="font-semibold text-[var(--text-primary)] mb-2">{d.fullName}</p>
      <div className="space-y-1">
        <p className="text-[var(--text-secondary)]">
          {locale === 'ar' ? 'متوسط الدرجة' : 'Avg Score'}:{' '}
          <span className="font-bold text-[var(--text-primary)]">{d.avg}/100</span>
        </p>
        <p className="text-[var(--text-secondary)]">
          {locale === 'ar' ? 'نسبة النجاح' : 'Pass Rate'}:{' '}
          <span className="font-bold text-green-600">{d.passRate}%</span>
        </p>
        <p className="text-[var(--text-secondary)]">
          {locale === 'ar' ? 'عدد الراسبين' : 'Failing'}:{' '}
          <span className="font-bold text-red-500">{d.failing}</span>
        </p>
      </div>
    </div>
  )
}

export function SubjectAveragesChartInner({ data, passScore, locale }: Props) {
  const chartData: ChartDatum[] = data.map(d => ({
    name: d.subjectName.length > 8 ? d.subjectName.slice(0, 8) + '\u2026' : d.subjectName,
    fullName: d.subjectName,
    avg: Math.round(d.avgScore * 10) / 10,
    passRate: d.passRate,
    failing: d.failingCount,
  }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
          axisLine={false}
          tickLine={false}
          width={30}
        />
        <ReferenceLine
          y={passScore}
          stroke="#f59e0b"
          strokeDasharray="4 4"
          strokeWidth={2}
          label={{
            value: locale === 'ar' ? 'حد النجاح' : 'Pass',
            fill: '#f59e0b',
            fontSize: 11,
            position: 'insideTopRight',
          }}
        />
        <Tooltip
          content={<CustomTooltip locale={locale} />}
          cursor={{ fill: 'var(--surface-soft)', opacity: 0.5 }}
        />
        <Bar dataKey="avg" radius={[6, 6, 0, 0]} maxBarSize={48}>
          {chartData.map(entry => (
            <Cell
              key={entry.name}
              fill={entry.avg >= passScore ? '#22c55e' : '#ef4444'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
