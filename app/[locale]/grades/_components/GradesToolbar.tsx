'use client'

import { useState } from 'react'
import type { GradeEntry } from '../_types'
import type { GradeFilters } from '../_types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  filters: GradeFilters
  entries: GradeEntry[]
  dirtyCount: number
  onConfirmAll: () => Promise<void>
  onLock: () => void
  onExport?: () => void
  onBulkSave?: () => Promise<void>
  onSendGrades?: () => void
  onImport?: () => void
  canConfirm: boolean
  canLock: boolean
  canExport?: boolean
  canEnter: boolean
  isLoading?: boolean
  locale?: string
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

export function GradesToolbar({
  filters,
  entries,
  dirtyCount,
  onConfirmAll,
  onLock,
  onExport,
  onBulkSave,
  onSendGrades,
  onImport,
  canConfirm,
  canLock,
  canExport = false,
  canEnter,
  isLoading = false,
  locale = 'ar',
}: Props) {
  const isRtl = locale === 'ar'

  const [confirmingAll, setConfirmingAll] = useState(false)
  const [savingAll, setSavingAll] = useState(false)

  const draftCount = entries.filter((e) => e.status === 'draft').length
  const confirmedCount = entries.filter((e) => e.status === 'confirmed').length
  const lockedCount = entries.filter((e) => e.status === 'locked').length
  const totalCount = entries.length

  const isBusy = isLoading || confirmingAll || savingAll

  async function handleConfirmAll() {
    if (isBusy || !draftCount) return
    setConfirmingAll(true)
    try {
      await onConfirmAll()
    } finally {
      setConfirmingAll(false)
    }
  }

  async function handleSaveAll() {
    if (isBusy || !dirtyCount || !onBulkSave) return
    setSavingAll(true)
    try {
      await onBulkSave()
    } finally {
      setSavingAll(false)
    }
  }

  const c = {
    students: isRtl ? `${totalCount} طالب` : `${totalCount} students`,
    saveAll: isRtl ? 'حفظ الكل' : 'Save All',
    confirmAll: isRtl ? 'تأكيد الكل' : 'Confirm All',
    lockSection: isRtl ? 'قفل القسم' : 'Lock Section',
    exportExcel: isRtl ? 'تصدير Excel' : 'Export Excel',
    draft: isRtl ? 'مسودة' : 'Draft',
    confirmed: isRtl ? 'مؤكد' : 'Confirmed',
    locked: isRtl ? 'مقفل' : 'Locked',
    unsaved: isRtl ? 'غير محفوظ' : 'unsaved',
    sendGrades: isRtl ? 'إرسال للطلاب' : 'Send to Students',
    importExcel: isRtl ? 'استيراد Excel' : 'Import Excel',
  }

  // ── Button base styles ────────────────────────────────────────────────────

  const btnBase =
    'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-all ' +
    'focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none'

  const btnPrimary = `${btnBase} bg-[var(--primary)] text-white hover:opacity-90 active:scale-95 shadow-sm`
  const btnOutline = `${btnBase} border border-[var(--border)] text-[var(--text-primary)] bg-[var(--card-bg)] hover:bg-[var(--surface-muted)]`
  const btnSuccess = `${btnBase} bg-green-600 text-white hover:bg-green-700 active:scale-95 shadow-sm`
  const btnWarning = `${btnBase} bg-amber-500 text-white hover:bg-amber-600 active:scale-95 shadow-sm`

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] px-4 py-3"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">

        {/* Left/Start: stats summary */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Student count */}
          <div className="flex items-center gap-1.5 text-sm">
            <svg className="w-4 h-4 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
            <span className="font-bold text-[var(--text-primary)]">{c.students}</span>
          </div>

          {/* Status pills */}
          {draftCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-400">
              ✏️ {draftCount} {c.draft}
            </span>
          )}
          {confirmedCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-900/30 px-2.5 py-1 text-xs font-bold text-green-700 dark:text-green-400">
              ✓ {confirmedCount} {c.confirmed}
            </span>
          )}
          {lockedCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-xs font-bold text-gray-600 dark:text-gray-400">
              🔒 {lockedCount} {c.locked}
            </span>
          )}

          {/* Subject + class info */}
          <span className="hidden md:flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text-primary)]">{filters.subjectName}</span>
            <span className="opacity-40">·</span>
            <span>{filters.className}{filters.sectionName ? ` / ${filters.sectionName}` : ''}</span>
            <span className="opacity-40">·</span>
            <span>{filters.academicYear}</span>
            <span className="opacity-40">—</span>
            <span>{isRtl ? `ف${filters.semester}` : `S${filters.semester}`}</span>
          </span>
        </div>

        {/* Right/End: action buttons */}
        <div className="flex items-center gap-2 flex-wrap">

          {/* Save all — only when there are dirty rows */}
          {canEnter && onBulkSave && dirtyCount > 0 && (
            <button
              onClick={handleSaveAll}
              disabled={isBusy}
              className={btnPrimary}
            >
              {savingAll ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
              )}
              {c.saveAll}
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-white inline-block animate-pulse" />
                {dirtyCount}
              </span>
            </button>
          )}

          {/* Confirm all — only when there are draft entries */}
          {canConfirm && draftCount > 0 && (
            <button
              onClick={handleConfirmAll}
              disabled={isBusy}
              className={btnSuccess}
            >
              {confirmingAll ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {c.confirmAll}
              <span className="inline-flex items-center rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
                {draftCount}
              </span>
            </button>
          )}

          {/* Lock section — only when there are confirmed entries */}
          {canLock && confirmedCount > 0 && (
            <button
              onClick={onLock}
              disabled={isBusy}
              className={btnWarning}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              {c.lockSection}
              <span className="inline-flex items-center rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
                {confirmedCount}
              </span>
            </button>
          )}

          {/* Import from Excel — only when canEnter */}
          {canEnter && onImport && (
            <button
              onClick={onImport}
              disabled={isBusy}
              className={btnOutline}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              {c.importExcel}
            </button>
          )}

          {/* Export */}
          {canExport && onExport && (
            <button
              onClick={onExport}
              disabled={isBusy}
              className={btnOutline}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {c.exportExcel}
            </button>
          )}

          {/* Send to students — visible when there are confirmed or locked entries */}
          {onSendGrades && (confirmedCount > 0 || lockedCount > 0) && (
            <button
              onClick={onSendGrades}
              disabled={isBusy}
              className={btnPrimary}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              {c.sendGrades}
              <span className="inline-flex items-center rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
                {confirmedCount + lockedCount}
              </span>
            </button>
          )}

        </div>
      </div>

      {/* Loading progress bar */}
      {isLoading && (
        <div className="mt-3 h-0.5 rounded-full bg-[var(--border)] overflow-hidden">
          <div className="h-full bg-[var(--primary)] animate-pulse rounded-full w-2/3" />
        </div>
      )}
    </div>
  )
}
