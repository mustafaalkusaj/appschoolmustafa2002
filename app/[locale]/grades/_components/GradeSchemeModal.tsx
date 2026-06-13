'use client'

import { useCallback, useEffect, useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal'
import type { GradeType } from '@/lib/grades/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  gradeType?: GradeType | null
  onSave: (data: Partial<GradeType>) => Promise<void>
  onClose: () => void
  locale?: string
}

interface FormState {
  name: string
  name_ar: string
  name_en: string
  category: string
  default_max_score: string
  is_active: boolean
  sort_order: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toPositiveNum(s: string): number {
  const n = parseFloat(s)
  return isNaN(n) || n < 0 ? 0 : n
}

function buildDefaultForm(): FormState {
  return {
    name: '',
    name_ar: '',
    name_en: '',
    category: 'other',
    default_max_score: '10',
    is_active: true,
    sort_order: '1',
  }
}

function gradeTypeToForm(gt: GradeType): FormState {
  return {
    name: gt.name,
    name_ar: gt.name_ar ?? '',
    name_en: gt.name_en ?? '',
    category: gt.category ?? 'other',
    default_max_score: String(gt.default_max_score),
    is_active: gt.is_active,
    sort_order: String(gt.sort_order),
  }
}

// ── Modal component ───────────────────────────────────────────────────────────

export function GradeSchemeModal({ open, gradeType, onSave, onClose, locale = 'ar' }: Props) {
  const isRtl = locale === 'ar'
  const isEdit = !!gradeType

  const [form, setForm] = useState<FormState>(() =>
    gradeType ? gradeTypeToForm(gradeType) : buildDefaultForm()
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when gradeType changes or modal opens
  useEffect(() => {
    if (open) {
      setForm(gradeType ? gradeTypeToForm(gradeType) : buildDefaultForm())
      setError(null)
    }
  }, [open, gradeType])

  function set(field: keyof FormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      setError(isRtl ? 'اسم نوع الدرجة مطلوب.' : 'Grade type name is required.')
      return
    }

    const maxScore = toPositiveNum(form.default_max_score)
    if (maxScore <= 0) {
      setError(
        isRtl
          ? 'الدرجة الكاملة الافتراضية يجب أن تكون أكبر من صفر.'
          : 'Default max score must be greater than zero.'
      )
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onSave({
        id: gradeType?.id,
        name: form.name.trim(),
        name_ar: form.name_ar.trim(),
        name_en: form.name_en.trim(),
        category: form.category as GradeType['category'],
        default_max_score: maxScore,
        is_active: form.is_active,
        sort_order: toPositiveNum(form.sort_order),
      })
      onClose()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isRtl
          ? 'تعذر حفظ نوع الدرجة.'
          : 'Failed to save grade type.'
      )
    } finally {
      setSaving(false)
    }
  }

  // ── Shared input styles ─────────────────────────────────────────────────
  const inputCls =
    'w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm ' +
    'text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 ' +
    'transition-colors placeholder:text-[var(--text-muted)] disabled:opacity-50'

  const labelCls = 'block text-xs font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide'

  const numInputCls =
    'w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-center ' +
    'text-[var(--text-primary)] font-bold focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 ' +
    'transition-colors disabled:opacity-50'

  const c = {
    title: isEdit
      ? isRtl ? 'تعديل نوع الدرجة' : 'Edit Grade Type'
      : isRtl ? 'إضافة نوع درجة جديد' : 'New Grade Type',
    description: isRtl
      ? 'حدد اسم نوع الدرجة وخصائصه.'
      : 'Set grade type name and properties.',
    nameAr: isRtl ? 'الاسم بالعربية' : 'Name (Arabic)',
    nameEn: isRtl ? 'الاسم بالإنجليزية' : 'Name (English)',
    category: isRtl ? 'التصنيف' : 'Category',
    defaultMaxScore: isRtl ? 'الدرجة الكاملة الافتراضية' : 'Default Max Score',
    sortOrder: isRtl ? 'الترتيب' : 'Sort Order',
    isActive: isRtl ? 'نشط' : 'Active',
    cancel: isRtl ? 'إلغاء' : 'Cancel',
    save: saving
      ? (isRtl ? 'جارٍ الحفظ...' : 'Saving...')
      : isEdit
      ? (isRtl ? 'حفظ التعديلات' : 'Save Changes')
      : (isRtl ? 'إضافة نوع الدرجة' : 'Add Grade Type'),
  }

  const categoryOptions = [
    { value: 'quiz', labelAr: 'اختبار قصير', labelEn: 'Quiz' },
    { value: 'homework', labelAr: 'واجب', labelEn: 'Homework' },
    { value: 'monthly', labelAr: 'شهري', labelEn: 'Monthly' },
    { value: 'midterm', labelAr: 'نصفي', labelEn: 'Midterm' },
    { value: 'final', labelAr: 'نهائي', labelEn: 'Final' },
    { value: 'oral', labelAr: 'شفهي', labelEn: 'Oral' },
    { value: 'project', labelAr: 'مشروع', labelEn: 'Project' },
    { value: 'participation', labelAr: 'مشاركة', labelEn: 'Participation' },
    { value: 'other', labelAr: 'أخرى', labelEn: 'Other' },
  ]

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader title={c.title} description={c.description} onClose={onClose} />

      <ModalBody>
        <div dir={isRtl ? 'rtl' : 'ltr'} className="space-y-5">

          {/* Name (Arabic) */}
          <div>
            <label className={labelCls}>{c.nameAr}</label>
            <input
              type="text"
              value={form.name_ar}
              onChange={(e) => {
                set('name_ar', e.target.value)
                set('name', e.target.value)
              }}
              placeholder={isRtl ? 'مثال: اختبار شهري' : 'e.g. Monthly Exam'}
              className={inputCls}
              maxLength={100}
            />
          </div>

          {/* Name (English) */}
          <div>
            <label className={labelCls}>{c.nameEn}</label>
            <input
              type="text"
              value={form.name_en}
              onChange={(e) => set('name_en', e.target.value)}
              placeholder="e.g. Monthly Exam"
              className={inputCls}
              maxLength={100}
            />
          </div>

          {/* Category */}
          <div>
            <label className={labelCls}>{c.category}</label>
            <select
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              className={inputCls}
            >
              {categoryOptions.map(({ value, labelAr, labelEn }) => (
                <option key={value} value={value}>
                  {isRtl ? labelAr : labelEn}
                </option>
              ))}
            </select>
          </div>

          {/* Default max score + sort order */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{c.defaultMaxScore}</label>
              <input
                type="number"
                min="1"
                max="1000"
                step="1"
                value={form.default_max_score}
                onChange={(e) => set('default_max_score', e.target.value)}
                className={numInputCls}
              />
            </div>
            <div>
              <label className={labelCls}>{c.sortOrder}</label>
              <input
                type="number"
                min="1"
                max="99"
                step="1"
                value={form.sort_order}
                onChange={(e) => set('sort_order', e.target.value)}
                className={numInputCls}
              />
            </div>
          </div>

          {/* Is active toggle */}
          <div className="flex items-center gap-3">
            <div
              onClick={() => set('is_active', !form.is_active)}
              className={[
                'w-11 h-6 rounded-full transition-colors relative flex-shrink-0 cursor-pointer',
                form.is_active
                  ? 'bg-[var(--primary)]'
                  : 'bg-gray-300 dark:bg-gray-600',
              ].join(' ')}
            >
              <div
                className={[
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                  form.is_active ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0.5',
                ].join(' ')}
              />
            </div>
            <span className="text-sm font-medium text-[var(--text-primary)]">{c.isActive}</span>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300 font-medium">
              {error}
            </div>
          )}

        </div>
      </ModalBody>

      <ModalFooter>
        <button
          onClick={onClose}
          disabled={saving}
          className="px-4 py-2.5 rounded-xl text-sm font-bold border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)] transition-colors disabled:opacity-50"
        >
          {c.cancel}
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving || !form.name_ar.trim()}
          className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[var(--primary)] text-white hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving && (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          )}
          {c.save}
        </button>
      </ModalFooter>
    </Modal>
  )
}
