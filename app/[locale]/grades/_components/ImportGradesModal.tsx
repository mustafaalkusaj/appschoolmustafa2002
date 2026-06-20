'use client'

import { useCallback, useRef, useState } from 'react'
import { loadXLSX } from '@/lib/xlsx-loader'
import { fetchJsonWithAuthorizedSession } from '@/lib/authorized-api'

// ── أنواع ───────────────────────────────────────────────────────────────────

interface StudentRef {
  id: string
  name: string
}

interface ImportFilters {
  academicYear: string
  semester: 1 | 2
  classId?: string | null
  sectionId?: string | null
  subjectId: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  filters: ImportFilters
  students: StudentRef[]
  schoolId: string
  locale?: 'ar' | 'en'
  onImported?: (inserted: number) => void
}

interface ParsedRow {
  studentId: string | null
  studentName: string
  oral: number | null
  homework: number | null
  monthly: number | null
  midterm: number | null
  final: number | null
  matchError?: string
}

// ── مساعدات ─────────────────────────────────────────────────────────────────

function normalizeNameForMatch(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/[أإآا]/g, 'ا')
    .replace(/[ةه]/g, 'ه')
    .replace(/[يى]/g, 'ي')
}

function matchStudentByName(name: string, students: StudentRef[]): StudentRef | null {
  const normalized = normalizeNameForMatch(name)
  return (
    students.find((s) => normalizeNameForMatch(s.name) === normalized) ??
    students.find((s) => normalizeNameForMatch(s.name).includes(normalized)) ??
    students.find((s) => normalized.includes(normalizeNameForMatch(s.name))) ??
    null
  )
}

function toScore(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : parseFloat(String(value))
  if (!isFinite(n) || n < 0) return null
  return n
}

// أسماء الأعمدة الممكنة (عربي وإنجليزي)
const COL_STUDENT_NAME = ['اسم الطالب', 'الطالب', 'student name', 'name', 'student']
const COL_ORAL = ['شفهي', 'oral', 'oral_score']
const COL_HOMEWORK = ['واجبات', 'homework', 'homework_score']
const COL_MONTHLY = ['شهري', 'monthly', 'monthly_score']
const COL_MIDTERM = ['نصفي', 'midterm', 'midterm_score']
const COL_FINAL = ['نهائي', 'final', 'final_score']

function findColumn(headers: string[], candidates: string[]): string | null {
  const lower = headers.map((h) => h.toLowerCase().trim())
  for (const c of candidates) {
    const idx = lower.indexOf(c.toLowerCase())
    if (idx !== -1) return headers[idx]
  }
  return null
}

// ── المكوّن ──────────────────────────────────────────────────────────────────

export function ImportGradesModal({
  isOpen,
  onClose,
  filters,
  students,
  schoolId,
  locale = 'ar',
  onImported,
}: Props) {
  const isAr = locale !== 'en'

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    inserted: number
    errors: string[]
    message: string
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── خطوة 1: قراءة ملف Excel ──────────────────────────────────────────────

  const handleFile = useCallback(
    (file: File) => {
      setParseError(null)

      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const XLSX = await loadXLSX();
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const workbook = await XLSX.read(data as any, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          if (!sheetName) throw new Error(isAr ? 'الملف لا يحتوي على أوراق عمل.' : 'No worksheets found.')

          const sheet = workbook.Sheets[sheetName]
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
            defval: null,
            raw: false,
          } as any)

          if (jsonData.length === 0) {
            throw new Error(isAr ? 'الملف فارغ أو لا يحتوي على بيانات.' : 'File is empty.')
          }

          // تحديد الأعمدة
          const headers = Object.keys(jsonData[0])
          const colName = findColumn(headers, COL_STUDENT_NAME)
          const colOral = findColumn(headers, COL_ORAL)
          const colHomework = findColumn(headers, COL_HOMEWORK)
          const colMonthly = findColumn(headers, COL_MONTHLY)
          const colMidterm = findColumn(headers, COL_MIDTERM)
          const colFinal = findColumn(headers, COL_FINAL)

          if (!colName) {
            throw new Error(
              isAr
                ? 'لم يتم العثور على عمود "اسم الطالب". تأكد من وجود العمود بهذا الاسم.'
                : 'Column "student name" not found.',
            )
          }

          // تحليل الصفوف
          const rows: ParsedRow[] = jsonData.map((row) => {
            const rawName = String(row[colName] ?? '').trim()
            const matched = rawName ? matchStudentByName(rawName, students) : null

            return {
              studentId: matched?.id ?? null,
              studentName: rawName,
              oral: colOral ? toScore(row[colOral]) : null,
              homework: colHomework ? toScore(row[colHomework]) : null,
              monthly: colMonthly ? toScore(row[colMonthly]) : null,
              midterm: colMidterm ? toScore(row[colMidterm]) : null,
              final: colFinal ? toScore(row[colFinal]) : null,
              matchError: !matched && rawName
                ? (isAr ? `لم يُعثر على الطالب: "${rawName}"` : `Student not found: "${rawName}"`)
                : undefined,
            }
          })

          setParsedRows(rows)
          setStep(2)
        } catch (err) {
          setParseError(
            err instanceof Error
              ? err.message
              : (isAr ? 'تعذر قراءة الملف.' : 'Failed to read file.'),
          )
        }
      }

      reader.readAsArrayBuffer(file)
    },
    [students, isAr],
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  // ── خطوة 3: إرسال للـ API ─────────────────────────────────────────────────

  const handleImport = async () => {
    const validRows = parsedRows.filter((r) => r.studentId && !r.matchError)
    if (validRows.length === 0) {
      return
    }

    setImporting(true)
    try {
      const payload = {
        schoolId,
        academicYear: filters.academicYear,
        semester: filters.semester,
        classId: filters.classId ?? undefined,
        sectionId: filters.sectionId ?? undefined,
        subjectId: filters.subjectId,
        rows: validRows.map((r) => ({
          studentId: r.studentId,
          oral: r.oral,
          homework: r.homework,
          monthly: r.monthly,
          midterm: r.midterm,
          final: r.final,
        })),
      }

      const { payload: result } = await fetchJsonWithAuthorizedSession<{
        ok: boolean
        inserted: number
        errors: string[]
        message: string
      }>('/api/web/grades/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (result) {
        setImportResult(result)
        setStep(3)
        if (result.inserted > 0) {
          onImported?.(result.inserted)
        }
      }
    } catch (err) {
      setImportResult({
        inserted: 0,
        errors: [err instanceof Error ? err.message : (isAr ? 'خطأ غير معروف' : 'Unknown error')],
        message: isAr ? 'تعذر الاستيراد.' : 'Import failed.',
      })
      setStep(3)
    } finally {
      setImporting(false)
    }
  }

  const handleReset = () => {
    setStep(1)
    setParsedRows([])
    setParseError(null)
    setImportResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (!isOpen) return null

  const validCount = parsedRows.filter((r) => r.studentId && !r.matchError).length
  const errorCount = parsedRows.filter((r) => r.matchError || !r.studentId).length

  // ── العرض ────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* خلفية شفافة */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* نافذة الحوار */}
      <div className="relative z-10 w-full max-w-3xl bg-[var(--card-bg)] rounded-2xl shadow-2xl border border-[var(--border)] flex flex-col max-h-[90vh]">

        {/* الرأس */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] flex-shrink-0">
          <div>
            <h2 className="text-lg font-black text-[var(--text-primary)]">
              {isAr ? 'استيراد الدرجات من Excel' : 'Import Grades from Excel'}
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {isAr
                ? `السنة: ${filters.academicYear} · الفصل: ${filters.semester}`
                : `Year: ${filters.academicYear} · Semester: ${filters.semester}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-muted)] transition-colors"
            aria-label={isAr ? 'إغلاق' : 'Close'}
          >
            ✕
          </button>
        </div>

        {/* المراحل */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-[var(--border)] flex-shrink-0">
          {[
            { n: 1, label: isAr ? 'رفع الملف' : 'Upload' },
            { n: 2, label: isAr ? 'مراجعة البيانات' : 'Review' },
            { n: 3, label: isAr ? 'النتيجة' : 'Result' },
          ].map(({ n, label }) => (
            <div key={n} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-colors ${
                  step >= n
                    ? 'text-white'
                    : 'border border-[var(--border)] text-[var(--text-muted)]'
                }`}
                style={step >= n ? { background: 'var(--primary)' } : {}}
              >
                {n}
              </div>
              <span
                className={`text-xs font-semibold ${step >= n ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}
              >
                {label}
              </span>
              {n < 3 && <span className="text-[var(--text-muted)] text-xs mx-1">›</span>}
            </div>
          ))}
        </div>

        {/* المحتوى */}
        <div className="overflow-y-auto flex-1 p-6 custom-scrollbar">

          {/* ── الخطوة 1: رفع الملف ── */}
          {step === 1 && (
            <div className="space-y-4">
              {/* منطقة الإفلات */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--border)] rounded-2xl p-10 text-center cursor-pointer hover:border-[var(--primary)] hover:bg-[var(--surface-muted)] transition-colors"
              >
                <div className="text-4xl mb-3">📂</div>
                <p className="font-bold text-[var(--text-primary)] text-sm">
                  {isAr ? 'اسحب ملف Excel هنا أو انقر للاختيار' : 'Drag Excel file here or click to browse'}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {isAr ? '.xlsx أو .xls' : '.xlsx or .xls files'}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </div>

              {/* تنسيق الأعمدة المتوقعة */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <p className="text-xs font-bold text-[var(--text-muted)] mb-2">
                  {isAr ? 'الأعمدة المتوقعة في الملف:' : 'Expected columns:'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    isAr ? 'اسم الطالب' : 'student name',
                    isAr ? 'شفهي' : 'oral',
                    isAr ? 'واجبات' : 'homework',
                    isAr ? 'شهري' : 'monthly',
                    isAr ? 'نصفي' : 'midterm',
                    isAr ? 'نهائي' : 'final',
                  ].map((col) => (
                    <span
                      key={col}
                      className="text-xs font-mono bg-[var(--card-bg)] border border-[var(--border)] px-2 py-0.5 rounded-lg text-[var(--text-primary)]"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>

              {/* خطأ في القراءة */}
              {parseError && (
                <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300 font-medium">
                  {parseError}
                </div>
              )}
            </div>
          )}

          {/* ── الخطوة 2: مراجعة البيانات ── */}
          {step === 2 && (
            <div className="space-y-4">
              {/* ملخص */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                  <span className="text-green-600 text-sm">✓</span>
                  <span className="text-xs font-bold text-green-700 dark:text-green-300">
                    {validCount} {isAr ? 'صف صالح' : 'valid rows'}
                  </span>
                </div>
                {errorCount > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                    <span className="text-red-600 text-sm">⚠</span>
                    <span className="text-xs font-bold text-red-700 dark:text-red-300">
                      {errorCount} {isAr ? 'صف به خطأ' : 'rows with errors'}
                    </span>
                  </div>
                )}
              </div>

              {/* جدول المعاينة */}
              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full text-xs" dir={isAr ? 'rtl' : 'ltr'}>
                  <thead>
                    <tr className="bg-[var(--surface-muted)] border-b border-[var(--border)]">
                      {[
                        isAr ? 'اسم الطالب (الملف)' : 'Student Name (File)',
                        isAr ? 'التطابق' : 'Match',
                        isAr ? 'شفهي' : 'Oral',
                        isAr ? 'واجبات' : 'Homework',
                        isAr ? 'شهري' : 'Monthly',
                        isAr ? 'نصفي' : 'Midterm',
                        isAr ? 'نهائي' : 'Final',
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2.5 text-center font-bold text-[var(--text-muted)] whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {parsedRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={
                          row.matchError
                            ? 'bg-red-50 dark:bg-red-950/20'
                            : 'hover:bg-[var(--surface-muted)]'
                        }
                      >
                        <td className="px-3 py-2 text-[var(--text-primary)] font-medium">
                          {row.studentName || '—'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {row.matchError ? (
                            <span className="text-red-600 text-xs font-bold">✗ {isAr ? 'غير موجود' : 'Not found'}</span>
                          ) : (
                            <span className="text-green-600 text-xs font-bold">✓</span>
                          )}
                        </td>
                        {[row.oral, row.homework, row.monthly, row.midterm, row.final].map(
                          (v, i) => (
                            <td key={i} className="px-3 py-2 text-center text-[var(--text-primary)]">
                              {v !== null ? v : <span className="text-[var(--text-muted)]">—</span>}
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {validCount === 0 && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-300 font-medium text-center">
                  {isAr
                    ? 'لا يوجد صفوف صالحة للاستيراد. تحقق من أسماء الطلاب في الملف.'
                    : 'No valid rows to import. Check student names in the file.'}
                </div>
              )}
            </div>
          )}

          {/* ── الخطوة 3: النتيجة ── */}
          {step === 3 && importResult && (
            <div className="space-y-4 text-center">
              <div className="text-5xl mb-4">
                {importResult.inserted > 0 ? '✅' : '⚠️'}
              </div>
              <p className="font-black text-[var(--text-primary)] text-lg">
                {importResult.message}
              </p>
              {importResult.inserted > 0 && (
                <p className="text-sm text-[var(--text-muted)]">
                  {isAr
                    ? `تم استيراد ${importResult.inserted} سجل درجات بنجاح.`
                    : `${importResult.inserted} grade records imported successfully.`}
                </p>
              )}
              {importResult.errors.length > 0 && (
                <div className="text-start mt-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4">
                  <p className="text-xs font-bold text-red-700 dark:text-red-300 mb-2">
                    {isAr ? 'أخطاء:' : 'Errors:'}
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {importResult.errors.slice(0, 10).map((err, i) => (
                      <li key={i} className="text-xs text-red-600 dark:text-red-400">
                        {err}
                      </li>
                    ))}
                    {importResult.errors.length > 10 && (
                      <li className="text-xs text-red-500">
                        {isAr
                          ? `... و ${importResult.errors.length - 10} أخطاء إضافية`
                          : `... and ${importResult.errors.length - 10} more errors`}
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

        </div>

        {/* التذييل بالأزرار */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-[var(--border)] flex-shrink-0">

          <button
            onClick={step === 1 ? onClose : handleReset}
            className="px-4 py-2 rounded-xl text-sm font-bold text-[var(--text-muted)] border border-[var(--border)] hover:bg-[var(--surface-muted)] transition-colors"
          >
            {step === 1
              ? (isAr ? 'إلغاء' : 'Cancel')
              : (isAr ? 'بدء من جديد' : 'Start Over')}
          </button>

          <div className="flex items-center gap-2">
            {step === 3 && (
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white transition-colors"
                style={{ background: 'var(--primary)' }}
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            )}

            {step === 2 && (
              <button
                onClick={handleImport}
                disabled={importing || validCount === 0}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'var(--primary)' }}
              >
                {importing
                  ? (isAr ? 'جاري الاستيراد...' : 'Importing...')
                  : (isAr ? `استيراد ${validCount} صف` : `Import ${validCount} rows`)}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
