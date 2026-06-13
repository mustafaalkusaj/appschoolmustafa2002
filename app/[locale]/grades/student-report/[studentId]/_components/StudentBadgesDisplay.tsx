'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchJsonWithAuthorizedSession } from '@/lib/authorized-api'
import type { BadgeType } from '@/lib/grades/types'

// ── أنواع ───────────────────────────────────────────────────────────────────

interface Badge {
  id: string
  badge_type: BadgeType
  subject_id: string | null
  subject_name: string | null
  earned_at: string
  metadata?: Record<string, unknown>
}

interface BadgesResponse {
  ok: boolean
  gate: { available: boolean; code?: string; message?: string }
  items: Badge[]
  count: number
}

interface Props {
  studentId: string
  schoolId: string
  locale?: 'ar' | 'en'
}

// ── بيانات الشارات ──────────────────────────────────────────────────────────

interface BadgeInfo {
  icon: string
  labelAr: string
  labelEn: string
  colorClass: string
  bgClass: string
  borderClass: string
}

const BADGE_DISPLAY: Record<BadgeType, BadgeInfo> = {
  diamond: {
    icon: '💎',
    labelAr: 'الماسية',
    labelEn: 'Diamond',
    colorClass: 'text-cyan-600',
    bgClass: 'bg-cyan-50 dark:bg-cyan-950/30',
    borderClass: 'border-cyan-200 dark:border-cyan-800',
  },
  gold: {
    icon: '🥇',
    labelAr: 'الذهبية',
    labelEn: 'Gold',
    colorClass: 'text-yellow-600',
    bgClass: 'bg-yellow-50 dark:bg-yellow-950/30',
    borderClass: 'border-yellow-200 dark:border-yellow-800',
  },
  silver: {
    icon: '🥈',
    labelAr: 'الفضية',
    labelEn: 'Silver',
    colorClass: 'text-slate-500',
    bgClass: 'bg-slate-50 dark:bg-slate-950/30',
    borderClass: 'border-slate-200 dark:border-slate-700',
  },
  bronze: {
    icon: '🥉',
    labelAr: 'البرونزية',
    labelEn: 'Bronze',
    colorClass: 'text-amber-600',
    bgClass: 'bg-amber-50 dark:bg-amber-950/30',
    borderClass: 'border-amber-200 dark:border-amber-800',
  },
  top_student: {
    icon: '⭐',
    labelAr: 'الطالب المتميز',
    labelEn: 'Top Student',
    colorClass: 'text-yellow-500',
    bgClass: 'bg-yellow-50 dark:bg-yellow-950/30',
    borderClass: 'border-yellow-200 dark:border-yellow-800',
  },
  most_improved: {
    icon: '📈',
    labelAr: 'الأكثر تقدماً',
    labelEn: 'Most Improved',
    colorClass: 'text-green-600',
    bgClass: 'bg-green-50 dark:bg-green-950/30',
    borderClass: 'border-green-200 dark:border-green-800',
  },
  perfect_score: {
    icon: '🏆',
    labelAr: 'العلامة الكاملة',
    labelEn: 'Perfect Score',
    colorClass: 'text-purple-600',
    bgClass: 'bg-purple-50 dark:bg-purple-950/30',
    borderClass: 'border-purple-200 dark:border-purple-800',
  },
  streak: {
    icon: '🔥',
    labelAr: 'الانتظام',
    labelEn: 'Streak',
    colorClass: 'text-orange-600',
    bgClass: 'bg-orange-50 dark:bg-orange-950/30',
    borderClass: 'border-orange-200 dark:border-orange-800',
  },
  on_time: {
    icon: '⏰',
    labelAr: 'الالتزام',
    labelEn: 'On Time',
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-50 dark:bg-blue-950/30',
    borderClass: 'border-blue-200 dark:border-blue-800',
  },
}

function formatDate(dateStr: string, locale: 'ar' | 'en'): string {
  try {
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr))
  } catch {
    return dateStr
  }
}

// ── المكوّن ──────────────────────────────────────────────────────────────────

export function StudentBadgesDisplay({ studentId, schoolId, locale = 'ar' }: Props) {
  const isAr = locale !== 'en'

  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gateUnavailable, setGateUnavailable] = useState(false)

  const fetchBadges = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { payload } = await fetchJsonWithAuthorizedSession<BadgesResponse>(
        `/api/web/grades/badges/student?studentId=${encodeURIComponent(studentId)}&schoolId=${encodeURIComponent(schoolId)}`,
      )
      if (payload?.ok) {
        setBadges(payload.items ?? [])
        if (!payload.gate.available) {
          setGateUnavailable(true)
        }
      } else {
        setError(isAr ? 'تعذر تحميل الشارات.' : 'Failed to load badges.')
      }
    } catch {
      setError(isAr ? 'حدث خطأ أثناء التحميل.' : 'An error occurred.')
    } finally {
      setLoading(false)
    }
  }, [studentId, schoolId, isAr])

  useEffect(() => {
    void fetchBadges()
  }, [fetchBadges])

  // ── جدول الشارات (للطباعة يُخفى) ────────────────────────────────────────
  return (
    <div
      className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] p-5 print:hidden"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* العنوان */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-[var(--text-primary)] text-base">
          {isAr ? '🏅 الشارات والإنجازات' : '🏅 Badges & Achievements'}
        </h3>
        {!loading && badges.length > 0 && (
          <span className="text-xs font-bold text-[var(--text-muted)] bg-[var(--surface-muted)] px-2 py-0.5 rounded-full">
            {badges.length}
          </span>
        )}
      </div>

      {/* حالة التحميل */}
      {loading && (
        <div className="flex gap-3 flex-wrap">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-20 w-36 rounded-xl bg-[var(--surface-muted)] animate-pulse"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      )}

      {/* خطأ */}
      {!loading && error && (
        <p className="text-sm text-[var(--text-muted)] text-center py-4">{error}</p>
      )}

      {/* جدول غير جاهز */}
      {!loading && !error && gateUnavailable && (
        <p className="text-sm text-[var(--text-muted)] text-center py-4">
          {isAr ? 'ميزة الشارات غير مفعّلة بعد.' : 'Badge feature not yet enabled.'}
        </p>
      )}

      {/* لا شارات */}
      {!loading && !error && !gateUnavailable && badges.length === 0 && (
        <div className="text-center py-6">
          <p className="text-2xl mb-2">🎖️</p>
          <p className="text-sm text-[var(--text-muted)] font-medium">
            {isAr ? 'لا توجد شارات بعد' : 'No badges yet'}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {isAr
              ? 'ستظهر الشارات هنا عند حصول الطالب على إنجازات.'
              : 'Badges will appear here when the student earns achievements.'}
          </p>
        </div>
      )}

      {/* بطاقات الشارات */}
      {!loading && !error && badges.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {badges.map((badge) => {
            const info = BADGE_DISPLAY[badge.badge_type] ?? {
              icon: '🏅',
              labelAr: badge.badge_type,
              labelEn: badge.badge_type,
              colorClass: 'text-gray-600',
              bgClass: 'bg-gray-50',
              borderClass: 'border-gray-200',
            }

            return (
              <div
                key={badge.id}
                className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border ${info.bgClass} ${info.borderClass} min-w-[120px] text-center`}
              >
                <span className="text-3xl">{info.icon}</span>
                <span className={`text-xs font-black ${info.colorClass}`}>
                  {isAr ? info.labelAr : info.labelEn}
                </span>
                {badge.subject_name && (
                  <span className="text-xs text-[var(--text-muted)] font-medium">
                    {badge.subject_name}
                  </span>
                )}
                <span className="text-[10px] text-[var(--text-muted)]">
                  {formatDate(badge.earned_at, locale)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
