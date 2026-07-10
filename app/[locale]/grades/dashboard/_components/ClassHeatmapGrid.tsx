import type { SubjectAnalytics } from '../_hooks/useGradeAnalytics'

interface Props {
  data: SubjectAnalytics[]
  passScore?: number
  locale?: string
}

function scoreToColor(score: number, passScore = 50): string {
  if (score >= 90) return 'bg-green-500 text-white'
  if (score >= 75) return 'bg-green-300 text-green-900'
  if (score >= passScore) return 'bg-yellow-200 text-yellow-900'
  if (score >= 40) return 'bg-orange-300 text-orange-900'
  return 'bg-red-400 text-white'
}

function PassRateBar({ passRate }: { passRate: number }) {
  return (
    <div className="flex items-center gap-2 justify-center">
      <div className="h-1.5 w-16 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(passRate, 100)}%` }}
        />
      </div>
      <span className="text-xs text-[var(--text-secondary)] tabular-nums">{passRate}%</span>
    </div>
  )
}

export function ClassHeatmapGrid({ data, passScore = 50, locale = 'ar' }: Props) {
  if (!data.length) return null

  const headers = [
    { key: 'subject', label: locale === 'ar' ? 'المادة' : 'Subject', align: 'start' },
    { key: 'avg', label: locale === 'ar' ? 'المتوسط' : 'Average', align: 'center' },
    { key: 'students', label: locale === 'ar' ? 'الطلاب' : 'Students', align: 'center' },
    { key: 'passing', label: locale === 'ar' ? 'ناجح' : 'Passing', align: 'center' },
    { key: 'failing', label: locale === 'ar' ? 'راسب' : 'Failing', align: 'center' },
    { key: 'passRate', label: locale === 'ar' ? 'نسبة النجاح' : 'Pass Rate', align: 'center' },
  ] as const

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            {headers.map(h => (
              <th
                key={h.key}
                className={`p-2.5 text-${h.align} text-[var(--text-muted)] font-medium border-b border-[var(--border)] whitespace-nowrap`}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.subjectId}
              className={`transition-colors hover:bg-[var(--surface-soft)] ${
                i % 2 === 0 ? 'bg-[var(--surface-soft)]/40' : ''
              }`}
            >
              {/* Subject name */}
              <td className="p-2.5 text-start font-medium text-[var(--text-primary)] whitespace-nowrap">
                {row.subjectName}
              </td>

              {/* Average score badge */}
              <td className="p-2.5 text-center">
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${scoreToColor(row.avgScore, passScore)}`}
                >
                  {Math.round(row.avgScore * 10) / 10}
                </span>
              </td>

              {/* Total students */}
              <td className="p-2.5 text-center text-[var(--text-secondary)] tabular-nums">
                {row.totalStudents}
              </td>

              {/* Passing count */}
              <td className="p-2.5 text-center">
                <span className="font-semibold text-green-600 tabular-nums">{row.passingCount}</span>
              </td>

              {/* Failing count */}
              <td className="p-2.5 text-center">
                <span className="font-semibold text-red-500 tabular-nums">{row.failingCount}</span>
              </td>

              {/* Pass rate progress bar */}
              <td className="p-2.5">
                <PassRateBar passRate={row.passRate} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
