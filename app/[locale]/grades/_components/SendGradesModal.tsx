'use client'

import { useCallback, useRef, useState } from 'react'
import { fetchJsonWithAuthorizedSession } from '@/lib/authorized-api'
import type { GradeEntry } from '@/lib/grades/types'
import type { GradeFilters } from '../_types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  filters: GradeFilters
  entries: GradeEntry[]
  schoolId: string
  locale?: 'ar' | 'en'
}

interface UploadResult {
  ok: boolean
  url?: string
  mime?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatScore(score: number | null, max: number): string {
  if (score == null) return '—'
  return `${score}/${max}`
}

function gradeEmoji(pct: number | null): string {
  if (pct == null) return '📝'
  if (pct >= 96) return '🏆'
  if (pct >= 85) return '⭐'
  if (pct >= 70) return '✅'
  if (pct >= 50) return '📚'
  return '⚠️'
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SendGradesModal({ open, onClose, filters, entries, schoolId, locale = 'ar' }: Props) {
  const isRtl = locale === 'ar'

  const [step, setStep] = useState<'compose' | 'sending' | 'done' | 'error'>('compose')
  const [customMessage, setCustomMessage] = useState('')
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string | null>(null)
  const [uploadedMediaMime, setUploadedMediaMime] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sentCount, setSentCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const confirmedEntries = entries.filter((e) => e.status === 'confirmed' || e.status === 'locked')
  const totalStudents = confirmedEntries.length

  const c = {
    title: isRtl ? 'إرسال نتائج الدرجات للطلاب' : 'Send Grade Results to Students',
    subtitle: isRtl ? 'سيصل الإشعار لطلاب هذا الصف داخل التطبيق' : 'Students will receive an in-app notification',
    step1: isRtl ? 'الطلاب المشمولون' : 'Included Students',
    noConfirmed: isRtl ? 'لا توجد درجات مؤكدة للإرسال. تأكيد الدرجات أولاً.' : 'No confirmed grades to send. Confirm grades first.',
    customMsg: isRtl ? 'رسالة إضافية (اختياري)' : 'Additional message (optional)',
    customMsgPlaceholder: isRtl ? 'مثال: يُرجى مراجعة النتيجة والتواصل مع الإدارة عند وجود استفسار.' : 'e.g. Please review your result and contact administration for any queries.',
    attachCert: isRtl ? 'إرفاق شهادة أو صورة (اختياري)' : 'Attach certificate or image (optional)',
    attachHint: isRtl ? 'صور JPEG / PNG / WEBP — بحد أقصى 5 ميجا' : 'JPEG / PNG / WEBP images — max 5 MB',
    uploading: isRtl ? 'جاري الرفع...' : 'Uploading...',
    uploadDone: isRtl ? 'تم رفع الملف ✓' : 'File uploaded ✓',
    removeFile: isRtl ? 'إزالة الملف' : 'Remove file',
    send: isRtl ? `إرسال لـ ${totalStudents} طالب` : `Send to ${totalStudents} students`,
    sending: isRtl ? 'جاري الإرسال...' : 'Sending...',
    cancel: isRtl ? 'إلغاء' : 'Cancel',
    doneTitle: isRtl ? 'تم الإرسال بنجاح! 🎉' : 'Sent successfully! 🎉',
    doneBody: isRtl ? `وصل الإشعار إلى ${sentCount} طالب` : `Notification delivered to ${sentCount} students`,
    close: isRtl ? 'إغلاق' : 'Close',
    errorTitle: isRtl ? 'تعذر الإرسال' : 'Failed to send',
    retry: isRtl ? 'إعادة المحاولة' : 'Retry',
    subject: isRtl ? 'المادة' : 'Subject',
    class: isRtl ? 'الصف' : 'Class',
    semester: isRtl ? 'الفصل' : 'Semester',
    preview: isRtl ? 'معاينة الإشعار' : 'Notification preview',
  }

  // ── Build notification text ───────────────────────────────────────────────
  function buildNotifTitle(): string {
    if (isRtl) return `نتائج ${filters.subjectName} — ${filters.className}`
    return `${filters.subjectName} Results — ${filters.className}`
  }

  function buildNotifBody(): string {
    const sem = isRtl ? `الفصل ${filters.semester}` : `Semester ${filters.semester}`
    const year = filters.academicYear
    const base = isRtl
      ? `صدرت نتائج مادة ${filters.subjectName} للعام ${year} / ${sem}. يمكنك الاطلاع على نتيجتك الآن.`
      : `${filters.subjectName} results for ${year} / ${sem} are now available. View your result in the app.`
    return customMessage.trim() ? `${base}\n\n${customMessage.trim()}` : base
  }

  // ── File upload ───────────────────────────────────────────────────────────
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadProgress('uploading')
    setUploadError(null)

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('schoolId', schoolId)

      const res = await fetch('/api/web/notifications/upload', {
        method: 'POST',
        body: fd,
        credentials: 'include',
      })
      const data: UploadResult = await res.json()

      if (!data.ok || !data.url) {
        throw new Error((data as { error?: string }).error ?? 'Upload failed')
      }

      setUploadedMediaUrl(data.url)
      setUploadedMediaMime(data.mime ?? 'image/jpeg')
      setUploadProgress('done')
    } catch (err) {
      setUploadProgress('error')
      setUploadError(err instanceof Error ? err.message : 'Upload error')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [schoolId])

  const handleRemoveFile = useCallback(() => {
    setUploadedMediaUrl(null)
    setUploadedMediaMime(null)
    setUploadProgress('idle')
    setUploadError(null)
  }, [])

  // ── Send ─────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (totalStudents === 0) return
    setStep('sending')
    setSendError(null)

    try {
      const payload = {
        schoolId,
        title: buildNotifTitle(),
        body: buildNotifBody(),
        target: {
          targetType: 'class',
          targetClass: filters.classId,
        },
        category: 'exams',
        priority: 'normal',
        template: 'default',
        channels: ['insite'],
        ...(uploadedMediaUrl
          ? {
              mediaUrl: uploadedMediaUrl,
              mediaType: uploadedMediaMime?.startsWith('image') ? 'image' : 'link',
            }
          : {}),
      }

      const { payload: result } = await fetchJsonWithAuthorizedSession<{
        ok: boolean
        recipientCount?: number
        error?: string
      }>('/api/web/notifications/send-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!result?.ok) throw new Error(result?.error ?? 'Send failed')

      setSentCount(result.recipientCount ?? totalStudents)
      setStep('done')
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Unknown error')
      setStep('error')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, filters, totalStudents, customMessage, uploadedMediaUrl, uploadedMediaMime])

  const handleClose = useCallback(() => {
    setStep('compose')
    setCustomMessage('')
    setUploadedMediaUrl(null)
    setUploadedMediaMime(null)
    setUploadProgress('idle')
    setUploadError(null)
    setSendError(null)
    onClose()
  }, [onClose])

  if (!open) return null

  // ── Done / Error screens ──────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <Overlay onClose={handleClose}>
        <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
            <span className="text-4xl">✅</span>
          </div>
          <h2 className="text-xl font-black text-[var(--text-primary)] mb-2">{c.doneTitle}</h2>
          <p className="text-[var(--text-muted)] text-sm">{c.doneBody}</p>
          <button
            onClick={handleClose}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] text-white px-6 py-2.5 text-sm font-bold hover:opacity-90 active:scale-95 transition-all"
          >
            {c.close}
          </button>
        </div>
      </Overlay>
    )
  }

  if (step === 'error') {
    return (
      <Overlay onClose={handleClose}>
        <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
            <span className="text-4xl">❌</span>
          </div>
          <h2 className="text-xl font-black text-[var(--text-primary)] mb-2">{c.errorTitle}</h2>
          {sendError && <p className="text-red-500 text-sm mb-4">{sendError}</p>}
          <div className="flex gap-3">
            <button onClick={() => setStep('compose')} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] px-5 py-2.5 text-sm font-bold hover:bg-[var(--surface-muted)] transition-all">
              {c.retry}
            </button>
            <button onClick={handleClose} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] text-white px-5 py-2.5 text-sm font-bold hover:opacity-90 transition-all">
              {c.close}
            </button>
          </div>
        </div>
      </Overlay>
    )
  }

  // ── Compose screen ────────────────────────────────────────────────────────
  return (
    <Overlay onClose={step === 'sending' ? undefined : handleClose}>
      <div dir={isRtl ? 'rtl' : 'ltr'} className="flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[var(--border)] flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[var(--text-primary)]">{c.title}</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{c.subtitle}</p>
            </div>
            {step !== 'sending' && (
              <button onClick={handleClose} className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-muted)] transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Filter badges */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-bold px-2.5 py-1">
              📖 {filters.subjectName}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)] text-xs font-bold px-2.5 py-1">
              🏫 {filters.className}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)] text-xs font-bold px-2.5 py-1">
              {isRtl ? `الفصل ${filters.semester}` : `Sem ${filters.semester}`} · {filters.academicYear}
            </span>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-5">

          {/* No confirmed entries */}
          {totalStudents === 0 ? (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-center">
              <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">⚠️ {c.noConfirmed}</p>
            </div>
          ) : (
            <>
              {/* Student list */}
              <div>
                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">
                  {c.step1} ({totalStudents})
                </p>
                <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                  <div className="divide-y divide-[var(--border)] max-h-52 overflow-y-auto custom-scrollbar">
                    {confirmedEntries.map((entry) => {
                      return (
                        <div key={entry.id} className="flex items-center justify-between px-4 py-2.5 bg-[var(--card-bg)] hover:bg-[var(--surface-muted)] transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-black text-[var(--primary)]">
                                {(entry.student_name ?? '?')[0]?.toUpperCase()}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                              {entry.student_name ?? entry.student_id}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-sm font-black text-[var(--text-primary)] tabular-nums">
                              {entry.score}/{entry.max_score}
                            </span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              entry.status === 'locked'
                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            }`}>
                              {entry.status === 'locked' ? '🔒' : '✓'} {entry.grade_label ?? ''}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Notification preview */}
              <div>
                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">
                  {c.preview}
                </p>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                  <p className="text-sm font-black text-[var(--text-primary)] mb-1">{buildNotifTitle()}</p>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed whitespace-pre-line">{buildNotifBody()}</p>
                  {uploadedMediaUrl && (
                    <div className="mt-3 rounded-lg overflow-hidden border border-[var(--border)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={uploadedMediaUrl} alt="certificate" className="w-full h-32 object-cover" />
                    </div>
                  )}
                </div>
              </div>

              {/* Custom message */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">
                  {c.customMsg}
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder={c.customMsgPlaceholder}
                  rows={3}
                  maxLength={300}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 transition-all"
                />
                <p className="text-right text-[10px] text-[var(--text-muted)] mt-1">
                  {customMessage.length}/300
                </p>
              </div>

              {/* Certificate / image upload */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">
                  {c.attachCert}
                </label>

                {uploadedMediaUrl ? (
                  <div className="flex items-center gap-3 rounded-xl border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={uploadedMediaUrl} alt="preview" className="w-12 h-12 rounded-lg object-cover border border-[var(--border)] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-green-700 dark:text-green-400">{c.uploadDone}</p>
                    </div>
                    <button
                      onClick={handleRemoveFile}
                      className="flex-shrink-0 text-xs text-red-500 hover:text-red-700 font-bold transition-colors"
                    >
                      {c.removeFile}
                    </button>
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-6 cursor-pointer hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all"
                  >
                    {uploadProgress === 'uploading' ? (
                      <>
                        <svg className="w-6 h-6 animate-spin text-[var(--primary)]" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        <p className="text-xs text-[var(--primary)] font-bold">{c.uploading}</p>
                      </>
                    ) : (
                      <>
                        <svg className="w-8 h-8 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <p className="text-xs text-[var(--text-muted)]">{c.attachHint}</p>
                        {uploadProgress === 'error' && uploadError && (
                          <p className="text-xs text-red-500 font-medium">{uploadError}</p>
                        )}
                      </>
                    )}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {totalStudents > 0 && (
          <div className="px-6 py-4 border-t border-[var(--border)] flex-shrink-0">
            <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={handleClose}
                disabled={step === 'sending'}
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] h-11 text-sm font-bold hover:bg-[var(--surface-muted)] transition-all disabled:opacity-50"
              >
                {c.cancel}
              </button>
              <button
                onClick={handleSend}
                disabled={step === 'sending' || uploadProgress === 'uploading'}
                className="flex-[2] inline-flex items-center justify-center gap-2 rounded-xl h-11 text-sm font-bold transition-all active:scale-95 disabled:opacity-60 disabled:pointer-events-none"
                style={{ background: 'var(--primary)', color: 'white' }}
              >
                {step === 'sending' ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    {c.sending}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    {c.send}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Overlay>
  )
}

// ── Overlay ───────────────────────────────────────────────────────────────────

function Overlay({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="relative z-10 w-full sm:max-w-lg bg-[var(--card-bg)] rounded-t-2xl sm:rounded-2xl shadow-2xl border border-[var(--border)] overflow-hidden">
        {children}
      </div>
    </div>
  )
}
