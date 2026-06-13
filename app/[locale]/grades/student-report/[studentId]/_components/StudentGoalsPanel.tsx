'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchJsonWithAuthorizedSession } from '@/lib/authorized-api'
import { DatePicker } from '@/components/ui/date-picker'
import type { GoalStatus } from '@/lib/grades/types'

// ── أنواع ───────────────────────────────────────────────────────────────────

interface Goal {
  id: string
  student_id: string
  subject_id: string | null
  subject_name?: string | null
  target_score: number
  deadline: string | null
  status: GoalStatus
  created_at: string
  updated_at: string
}

interface GoalsResponse {
  ok: boolean
  gate: { available: boolean; code?: string; message?: string }
  items: Goal[]
  count: number
}

interface NewGoalForm {
  subjectId: string
  targetScore: string
  deadline: string
}

interface Props {
  studentId: string
  schoolId: string
  locale?: 'ar' | 'en'
  canEdit?: boolean
}

// ── مساعدات ─────────────────────────────────────────────────────────────────

const STATUS_DISPLAY: Record<
  GoalStatus,
  { labelAr: string; labelEn: string; colorClass: string; bgClass: string; icon: string }
> = {
  active: {
    labelAr: 'نشط',
    labelEn: 'Active',
    colorClass: 'text-blue-700 dark:text-blue-300',
    bgClass: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
    icon: '🎯',
  },
  achieved: {
    labelAr: 'تحقق',
    labelEn: 'Achieved',
    colorClass: 'text-green-700 dark:text-green-300',
    bgClass: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
    icon: '✅',
  },
  missed: {
    labelAr: 'فات',
    labelEn: 'Missed',
    colorClass: 'text-red-700 dark:text-red-300',
    bgClass: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
    icon: '❌',
  },
}

function formatDeadline(deadline: string | null, locale: 'ar' | 'en'): string {
  if (!deadline) return locale === 'ar' ? 'غير محدد' : 'No deadline'
  try {
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(deadline))
  } catch {
    return deadline
  }
}

function isDeadlinePast(deadline: string | null): boolean {
  if (!deadline) return false
  return new Date(deadline) < new Date()
}

// ── المكوّن ──────────────────────────────────────────────────────────────────

export function StudentGoalsPanel({
  studentId,
  schoolId,
  locale = 'ar',
  canEdit = false,
}: Props) {
  const isAr = locale !== 'en'

  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gateUnavailable, setGateUnavailable] = useState(false)

  // نموذج إضافة هدف
  const [showAddForm, setShowAddForm] = useState(false)
  const [newGoal, setNewGoal] = useState<NewGoalForm>({
    subjectId: '',
    targetScore: '',
    deadline: '',
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // إجراء تحديث الحالة
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchGoals = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { payload } = await fetchJsonWithAuthorizedSession<GoalsResponse>(
        `/api/web/grades/goals?studentId=${encodeURIComponent(studentId)}&schoolId=${encodeURIComponent(schoolId)}`,
      )
      if (payload?.ok) {
        setGoals(payload.items ?? [])
        if (!payload.gate.available) setGateUnavailable(true)
      } else {
        setError(isAr ? 'تعذر تحميل الأهداف.' : 'Failed to load goals.')
      }
    } catch {
      setError(isAr ? 'حدث خطأ أثناء التحميل.' : 'An error occurred.')
    } finally {
      setLoading(false)
    }
  }, [studentId, schoolId, isAr])

  useEffect(() => {
    void fetchGoals()
  }, [fetchGoals])

  // إضافة هدف جديد
  const handleAddGoal = async () => {
    const targetScore = parseFloat(newGoal.targetScore)
    if (!isFinite(targetScore) || targetScore <= 0) {
      setSaveError(isAr ? 'الهدف يجب أن يكون رقماً موجباً.' : 'Target score must be a positive number.')
      return
    }

    setSaving(true)
    setSaveError(null)

    try {
      const { payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean
        goal: Goal
        message: string
      }>('/api/web/grades/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          studentId,
          subjectId: newGoal.subjectId.trim() || undefined,
          targetScore,
          deadline: newGoal.deadline || undefined,
        }),
      })

      if (payload?.ok && payload.goal) {
        setGoals((prev) => [payload.goal, ...prev])
        setNewGoal({ subjectId: '', targetScore: '', deadline: '' })
        setShowAddForm(false)
      } else {
        setSaveError(isAr ? 'تعذر إنشاء الهدف.' : 'Failed to create goal.')
      }
    } catch {
      setSaveError(isAr ? 'خطأ في الاتصال.' : 'Connection error.')
    } finally {
      setSaving(false)
    }
  }

  // تحديث حالة هدف
  const handleUpdateStatus = async (goalId: string, newStatus: GoalStatus) => {
    setUpdatingId(goalId)
    try {
      const { payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean
        goal: Goal
        message: string
      }>(`/api/web/grades/goals/${goalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, status: newStatus }),
      })

      if (payload?.ok && payload.goal) {
        setGoals((prev) => prev.map((g) => (g.id === goalId ? payload.goal : g)))
      }
    } catch {
      // فشل صامت
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div
      className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] p-5 print:hidden"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* الرأس */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-[var(--text-primary)] text-base">
          {isAr ? '🎯 الأهداف الدراسية' : '🎯 Academic Goals'}
        </h3>
        {canEdit && !loading && !gateUnavailable && (
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="text-xs font-bold px-3 py-1.5 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)] transition-colors"
          >
            {showAddForm
              ? (isAr ? 'إلغاء' : 'Cancel')
              : (isAr ? '+ إضافة هدف' : '+ Add Goal')}
          </button>
        )}
      </div>

      {/* نموذج إضافة هدف */}
      {showAddForm && canEdit && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 mb-4 space-y-3">
          <p className="text-xs font-bold text-[var(--text-muted)]">
            {isAr ? 'هدف جديد:' : 'New Goal:'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">
                {isAr ? 'المادة (اختياري)' : 'Subject (optional)'}
              </label>
              <input
                type="text"
                value={newGoal.subjectId}
                onChange={(e) => setNewGoal((p) => ({ ...p, subjectId: e.target.value }))}
                placeholder={isAr ? 'معرّف المادة' : 'Subject ID'}
                className="w-full text-sm px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">
                {isAr ? 'الهدف (درجة)' : 'Target Score'}
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={newGoal.targetScore}
                onChange={(e) => setNewGoal((p) => ({ ...p, targetScore: e.target.value }))}
                placeholder={isAr ? 'مثال: 80' : 'e.g. 80'}
                className="w-full text-sm px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">
                {isAr ? 'الموعد النهائي' : 'Deadline'}
              </label>
              <DatePicker value={newGoal.deadline || undefined} onChange={(v) => setNewGoal((p) => ({ ...p, deadline: v ?? "" }))} />
            </div>
          </div>

          {saveError && (
            <p className="text-xs text-red-600 font-medium">{saveError}</p>
          )}

          <button
            onClick={handleAddGoal}
            disabled={saving}
            className="px-4 py-1.5 rounded-xl text-xs font-bold text-white transition-colors disabled:opacity-50"
            style={{ background: 'var(--primary)' }}
          >
            {saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ الهدف' : 'Save Goal')}
          </button>
        </div>
      )}

      {/* حالة التحميل */}
      {loading && (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-xl bg-[var(--surface-muted)] animate-pulse"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      )}

      {/* خطأ */}
      {!loading && error && (
        <p className="text-sm text-[var(--text-muted)] text-center py-4">{error}</p>
      )}

      {/* الجدول غير جاهز */}
      {!loading && !error && gateUnavailable && (
        <p className="text-sm text-[var(--text-muted)] text-center py-4">
          {isAr ? 'ميزة الأهداف غير مفعّلة بعد.' : 'Goals feature not yet enabled.'}
        </p>
      )}

      {/* لا أهداف */}
      {!loading && !error && !gateUnavailable && goals.length === 0 && (
        <div className="text-center py-6">
          <p className="text-2xl mb-2">🎯</p>
          <p className="text-sm text-[var(--text-muted)] font-medium">
            {isAr ? 'لا توجد أهداف مضافة' : 'No goals added yet'}
          </p>
          {canEdit && (
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {isAr ? 'انقر على "إضافة هدف" لبدء تتبع الأهداف.' : 'Click "Add Goal" to start tracking.'}
            </p>
          )}
        </div>
      )}

      {/* جدول الأهداف */}
      {!loading && !error && goals.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" dir={isAr ? 'rtl' : 'ltr'}>
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)]">
                {[
                  isAr ? 'المادة' : 'Subject',
                  isAr ? 'الهدف' : 'Target',
                  isAr ? 'الموعد' : 'Deadline',
                  isAr ? 'الحالة' : 'Status',
                  ...(canEdit ? [isAr ? 'إجراء' : 'Action'] : []),
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
              {goals.map((goal) => {
                const statusInfo = STATUS_DISPLAY[goal.status] ?? STATUS_DISPLAY.active
                const isPast = isDeadlinePast(goal.deadline)

                return (
                  <tr key={goal.id} className="hover:bg-[var(--surface-muted)] transition-colors">
                    <td className="px-3 py-2.5 text-center text-[var(--text-primary)] font-medium">
                      {goal.subject_name ?? (goal.subject_id ? goal.subject_id.slice(0, 8) + '...' : (isAr ? 'عام' : 'General'))}
                    </td>
                    <td className="px-3 py-2.5 text-center font-black text-[var(--text-primary)]">
                      {goal.target_score}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-center text-xs ${
                        isPast && goal.status === 'active'
                          ? 'text-red-500 font-bold'
                          : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {formatDeadline(goal.deadline, locale)}
                      {isPast && goal.status === 'active' && (
                        <span className="block text-[10px]">{isAr ? '(انتهى)' : '(past)'}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${statusInfo.bgClass} ${statusInfo.colorClass}`}
                      >
                        <span>{statusInfo.icon}</span>
                        <span>{isAr ? statusInfo.labelAr : statusInfo.labelEn}</span>
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-3 py-2.5 text-center">
                        {goal.status === 'active' && (
                          <button
                            onClick={() => handleUpdateStatus(goal.id, 'achieved')}
                            disabled={updatingId === goal.id}
                            className="text-xs font-bold px-2 py-1 rounded-lg bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 hover:bg-green-100 transition-colors disabled:opacity-50"
                          >
                            {updatingId === goal.id
                              ? '...'
                              : (isAr ? 'تحقق ✓' : 'Achieved ✓')}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
