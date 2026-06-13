'use client'
import type { GradeType } from '@/lib/grades/types'

interface Props {
  gradeType: GradeType
  locale?: string
  onEdit?: () => void
}

export function GradeSchemesBanner({ gradeType, locale = 'ar', onEdit }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900 text-sm">
      <span className="text-blue-700 dark:text-blue-300 font-medium">
        {locale === 'ar' ? 'نوع الدرجة:' : 'Grade Type:'}
      </span>
      <span className="bg-white dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-full px-3 py-0.5 text-blue-800 dark:text-blue-200 font-medium">
        {locale === 'ar' ? gradeType.name_ar || gradeType.name : gradeType.name_en || gradeType.name}
      </span>
      <span className="text-blue-600 dark:text-blue-400 text-xs">
        {locale === 'ar'
          ? `الدرجة الكاملة: ${gradeType.default_max_score}`
          : `Max Score: ${gradeType.default_max_score}`}
      </span>
      {onEdit && (
        <button
          onClick={onEdit}
          title={locale === 'ar' ? 'تعديل نوع الدرجة' : 'Edit grade type'}
          className="ms-auto flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-blue-900/60 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-800/60 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          {locale === 'ar' ? 'تعديل' : 'Edit'}
        </button>
      )}
    </div>
  )
}
