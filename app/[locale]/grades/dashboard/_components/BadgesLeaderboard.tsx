'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchJsonWithAuthorizedSession } from '@/lib/authorized-api'
import type { BadgeType } from '@/lib/grades/types'

// ── أنواع ───────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  studentId: string
  studentName: string | null
  badgeCount: number
  lastBadgeAt: string | null
  badges: BadgeType[]
}

interface LeaderboardResponse {
  ok: boolean
  gate: { available: boolean; code?: string; message?: string }
  items: LeaderboardEntry[]
  count: number
}

interface Props {
  schoolId: string
  academicYear?: string
  locale?: 'ar' | 'en'
}

// ── مساعدات ─────────────────────────────────────────────────────────────────

const BADGE_ICONS: Partial<Record<BadgeType, string>> = {
  diamond: '💎',
  gold: '🥇',
  silver: '🥈',
  bronze: '🥉',
  top_student: '⭐',
  most_improved: '📈',
  perfect_score: '🏆',
  streak: '🔥',
  on_time: '⏰',
}

const RANK_STYLES = [
  { bg: 'bg-yellow-50 dark:bg-yellow-950/30', text: 'text-yellow-600', border: 'border-yellow-200 dark:border-yellow-800', icon: '🥇' },
  { bg: 'bg-slate-50 dark:bg-slate-950/30', text: 'text-slate-500', border: 'border-slate-200 dark:border-slate-700', icon: '🥈' },
  { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-600', border: 'border-amber-200 dark:border-amber-800', icon: '🥉' },
]

function formatRelativeDate(dateStr: string | null, locale: 'ar' | 'en'): string {
  if (!dateStr) return locale === 'ar' ? 'غير محدد' : 'N/A'
  try {
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return locale === 'ar' ? 'اليوم' : 'Today'
    if (days === 1) return locale === 'ar' ? 'أمس' : 'Yesterday'
    if (days < 7) return locale === 'ar' ? `منذ ${days} أيام` : `${days} days ago`
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      day: 'numeric',
      month: 'short',
    }).format(new Date(dateStr))
  } catch {
    return dateStr
  }
}

// ── المكوّن ──────────────────────────────────────────────────────────────────

export function BadgesLeaderboard({ schoolId, academicYear, locale = 'ar' }: Props) {
  const isAr = locale !== 'en'

  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gateUnavailable, setGateUnavailable] = useState(false)

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let url = `/api/web/grades/badges/leaderboard?schoolId=${encodeURIComponent(schoolId)}`
      if (academicYear) url += `&academicYear=${encodeURIComponent(academicYear)}`

      const { payload } = await fetchJsonWithAuthorizedSession<LeaderboardResponse>(url)

      if (payload?.ok) {
        setEntries(payload.items ?? [])
        if (!payload.gate.available) setGateUnavailable(true)
      } else {
        setError(isAr ? 'تعذر تحميل قائمة الشرف.' : 'Failed to load leaderboard.')
      }
    } catch {
      setError(isAr ? 'حدث خطأ أثناء التحميل.' : 'An error occurred.')
    } finally {
      setLoading(false)
    }
  }, [schoolId, academicYear, isAr])

  useEffect(() => {
    void fetchLeaderboard()
  }, [fetchLeaderboard])

  return (
    <div
      className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] overflow-hidden"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* الرأس */}
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
        <div>
          <h3 className="font-black text-[var(--text-primary)] text-base">
            {isAr ? '🏅 قائمة الشرف' : '🏅 Honor Roll'}
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {isAr ? 'أعلى 20 طالب من حيث الشارات' : 'Top 20 students by badges'}
            {academicYear && ` · ${academicYear}`}
          </p>
        </div>
        {!loading && entries.length > 0 && (
          <span className="text-xs font-bold text-[var(--text-muted)] bg-[var(--surface-muted)] px-2 py-0.5 rounded-full">
            {entries.length}
          </span>
        )}
      </div>

      {/* حالة التحميل */}
      {loading && (
        <div className="p-4 space-y-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-12 rounded-xl bg-[var(--surface-muted)] animate-pulse"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      )}

      {/* خطأ */}
      {!loading && error && (
        <div className="p-6 text-center">
          <p className="text-sm text-[var(--text-muted)]">{error}</p>
        </div>
      )}

      {/* الجدول غير جاهز */}
      {!loading && !error && gateUnavailable && (
        <div className="p-6 text-center">
          <p className="text-2xl mb-2">🏅</p>
          <p className="text-sm text-[var(--text-muted)]">
            {isAr ? 'ميزة الشارات غير مفعّلة بعد.' : 'Badge feature not yet enabled.'}
          </p>
        </div>
      )}

      {/* لا بيانات */}
      {!loading && !error && !gateUnavailable && entries.length === 0 && (
        <div className="p-8 text-center">
          <p className="text-3xl mb-3">🏆</p>
          <p className="text-sm font-bold text-[var(--text-primary)] mb-1">
            {isAr ? 'لا توجد شارات بعد' : 'No badges yet'}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {isAr
              ? 'ستظهر قائمة الشرف بعد منح الشارات للطلاب.'
              : 'Honor roll will appear after awarding badges.'}
          </p>
        </div>
      )}

      {/* الجدول */}
      {!loading && !error && entries.length > 0 && (
        <div>
          {/* أول 3 مراكز بتصميم خاص */}
          {entries.slice(0, 3).length > 0 && (
            <div className="p-4 grid grid-cols-3 gap-3">
              {entries.slice(0, 3).map((entry, idx) => {
                const rank = RANK_STYLES[idx] ?? RANK_STYLES[2]
                return (
                  <div
                    key={entry.studentId}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center ${rank.bg} ${rank.border}`}
                  >
                    <span className="text-2xl">{rank.icon}</span>
                    <p className={`text-xs font-black ${rank.text} line-clamp-2`}>
                      {entry.studentName ?? (isAr ? 'طالب' : 'Student')}
                    </p>
                    <p className="text-xs font-bold text-[var(--text-primary)]">
                      {entry.badgeCount} {isAr ? 'شارة' : 'badges'}
                    </p>
                    <div className="flex flex-wrap justify-center gap-0.5">
                      {entry.badges.slice(0, 4).map((b) => (
                        <span key={b} className="text-sm" title={b}>
                          {BADGE_ICONS[b] ?? '🏅'}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* باقي القائمة كجدول */}
          {entries.length > 3 && (
            <div className="border-t border-[var(--border)] overflow-x-auto">
              <table className="w-full text-sm" dir={isAr ? 'rtl' : 'ltr'}>
                <thead>
                  <tr className="bg-[var(--surface-muted)] border-b border-[var(--border)]">
                    {[
                      isAr ? 'الترتيب' : 'Rank',
                      isAr ? 'الطالب' : 'Student',
                      isAr ? 'عدد الشارات' : 'Badges',
                      isAr ? 'آخر شارة' : 'Last Badge',
                      isAr ? 'الشارات' : 'Types',
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2.5 text-center text-xs font-bold text-[var(--text-muted)] whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {entries.slice(3).map((entry, idx) => (
                    <tr
                      key={entry.studentId}
                      className="hover:bg-[var(--surface-muted)] transition-colors"
                    >
                      <td className="px-3 py-2.5 text-center font-black text-[var(--text-muted)]">
                        {idx + 4}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-[var(--text-primary)] text-center">
                        {entry.studentName ?? (isAr ? 'طالب' : 'Student')}
                      </td>
                      <td className="px-3 py-2.5 text-center font-black text-[var(--text-primary)]">
                        {entry.badgeCount}
                      </td>
                      <td className="px-3 py-2.5 text-center text-xs text-[var(--text-muted)]">
                        {formatRelativeDate(entry.lastBadgeAt, locale)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex justify-center gap-0.5">
                          {entry.badges.slice(0, 5).map((b) => (
                            <span key={b} className="text-base" title={b}>
                              {BADGE_ICONS[b] ?? '🏅'}
                            </span>
                          ))}
                          {entry.badges.length > 5 && (
                            <span className="text-xs text-[var(--text-muted)] font-bold self-end">
                              +{entry.badges.length - 5}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
