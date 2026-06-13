'use client'

import { useState, useCallback } from 'react'
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from '@/lib/authorized-api'

interface Props {
  academicYear: string
  semester: 1 | 2
  classId?: string
  className?: string
  locale?: string
  disabled?: boolean
}

type PanelState = 'idle' | 'loading' | 'streaming' | 'done' | 'error'

export function AIInsightsPanel({
  academicYear,
  semester,
  classId,
  className,
  locale = 'ar',
  disabled = false,
}: Props) {
  const [state, setState] = useState<PanelState>('idle')
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const runAnalysis = useCallback(async () => {
    if (state === 'loading' || state === 'streaming') return
    setState('loading')
    setText('')
    setError(null)

    try {
      const response = await fetch('/api/web/grades/ai-insights', {
        method: 'POST',
        headers: withJsonHeaders(),
        body: JSON.stringify({ academicYear, semester, classId, className }),
        credentials: 'include',
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error?.message ?? 'تعذر تشغيل التحليل')
      }

      if (!response.body) throw new Error('لا يوجد بيانات من الخادم')

      setState('streaming')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setText((prev) => prev + chunk)
      }

      setState('done')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطأ غير معروف'
      setError(msg)
      setState('error')
    }
  }, [academicYear, semester, classId, className, state])

  const reset = useCallback(() => {
    setState('idle')
    setText('')
    setError(null)
  }, [])

  const isRunning = state === 'loading' || state === 'streaming'

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30 text-lg">
            🤖
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {locale === 'ar' ? 'التحليل الذكي' : 'AI Insights'}
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              {locale === 'ar' ? 'مدعوم بـ Claude Sonnet' : 'Powered by Claude Sonnet'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {state === 'done' && (
            <button
              onClick={reset}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              {locale === 'ar' ? 'إعادة' : 'Reset'}
            </button>
          )}
          {state === 'idle' || state === 'error' ? (
            <button
              onClick={runAnalysis}
              disabled={disabled}
              className="flex items-center gap-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-1.5 transition-colors"
            >
              <span>✨</span>
              <span>{locale === 'ar' ? 'تحليل ذكي' : 'Analyze'}</span>
            </button>
          ) : isRunning ? (
            <div className="flex items-center gap-1.5 text-purple-600 text-xs font-medium">
              <span className="inline-block h-3 w-3 rounded-full border-2 border-purple-600 border-t-transparent animate-spin" />
              <span>{state === 'loading' ? (locale === 'ar' ? 'جاري التحليل...' : 'Analyzing...') : (locale === 'ar' ? 'يكتب...' : 'Writing...')}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {state === 'idle' && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="text-4xl">🧠</span>
            <p className="text-sm text-[var(--text-secondary)] max-w-sm">
              {locale === 'ar'
                ? 'اضغط "تحليل ذكي" للحصول على تقرير فوري من Claude يشرح نقاط القوة والضعف ويقدم توصيات عملية'
                : 'Click "Analyze" to get an instant AI report identifying strengths, weaknesses, and actionable recommendations'}
            </p>
          </div>
        )}

        {state === 'loading' && (
          <div className="space-y-3">
            {[80, 60, 90, 50].map((w, i) => (
              <div key={i} className="h-3 animate-pulse bg-[var(--surface-soft)] rounded-full" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}

        {(state === 'streaming' || state === 'done') && text && (
          <div className="prose prose-sm dark:prose-invert max-w-none text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap text-sm">
            {text}
            {state === 'streaming' && (
              <span className="inline-block w-0.5 h-4 bg-purple-500 animate-pulse align-middle ml-0.5" />
            )}
          </div>
        )}

        {state === 'error' && (
          <div className="flex items-start gap-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-4">
            <span className="text-red-500 text-lg shrink-0">⚠️</span>
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                {locale === 'ar' ? 'تعذر التحليل' : 'Analysis failed'}
              </p>
              <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer note */}
      {state === 'done' && (
        <div className="px-5 pb-4">
          <p className="text-xs text-[var(--text-muted)] border-t border-[var(--border)] pt-3">
            {locale === 'ar'
              ? '⚠️ هذا تحليل اقتراحي. القرارات التربوية النهائية تعود للمعلمين والإدارة.'
              : '⚠️ This is a suggestive analysis. Final educational decisions rest with teachers and administration.'}
          </p>
        </div>
      )}
    </div>
  )
}
