import 'server-only'
import { createHash } from 'node:crypto'
import { computeGradeLabel, computePercentage } from './grade-calculator'
import type { GradeEntry } from './types'

// ---------------------------------------------------------------------------
// المعاملات المدخلة لبناء كشف الدرجات
// ---------------------------------------------------------------------------

export interface ReportCardParams {
  studentId: string
  studentName: string
  className: string
  sectionName?: string | null
  academicYear: string
  semester: 1 | 2
  entries: GradeEntry[]
  schoolName?: string | null
  schoolLogoUrl?: string | null
}

// ---------------------------------------------------------------------------
// دوال مساعدة
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function semesterLabel(sem: 1 | 2): string {
  return sem === 1 ? 'الفصل الأول' : 'الفصل الثاني'
}

function formatScore(value: number | null): string {
  return value !== null ? String(value) : '—'
}

function formatDate(date: Date): string {
  try {
    return new Intl.DateTimeFormat('ar-SA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date)
  } catch {
    return date.toLocaleDateString()
  }
}

/**
 * حساب hash قصير لأغراض التحقق من الوثيقة (8 أحرف base64)
 */
function buildDocumentHash(studentId: string, academicYear: string, semester: number): string {
  const raw = `${studentId}:${academicYear}:${semester}`
  const digest = createHash('sha256').update(raw).digest('base64')
  // نأخذ أول 8 أحرف فقط للعرض
  return digest.slice(0, 8)
}

// ---------------------------------------------------------------------------
// البناء الرئيسي للـ HTML
// ---------------------------------------------------------------------------

/**
 * بناء HTML كشف الدرجات القابل للطباعة
 * يُعيد نص HTML كامل (document) بدعم RTL وتصميم طباعة.
 */
export function buildReportCardHTML(params: ReportCardParams): string {
  const {
    studentId,
    studentName,
    className,
    sectionName,
    academicYear,
    semester,
    entries,
    schoolName,
    schoolLogoUrl,
  } = params

  const docHash = buildDocumentHash(studentId, academicYear, semester)
  const issuedDate = formatDate(new Date())

  // حساب المتوسط الإجمالي من percentage
  const validEntries = entries.filter((e) => e.percentage != null)
  const avgPct =
    validEntries.length > 0
      ? Math.round(
          (validEntries.reduce((s, e) => s + (e.percentage ?? 0), 0) / validEntries.length) * 10,
        ) / 10
      : null
  const overallLabel = avgPct !== null ? computeGradeLabel(avgPct) : null

  // بناء صفوف الجدول
  const tableRows = entries
    .map((entry, idx) => {
      const pct = computePercentage(entry.score, entry.max_score)
      const gradeLabel = computeGradeLabel(pct)
      const rowBg = idx % 2 === 0 ? '#ffffff' : '#f9fafb'

      return `
      <tr style="background:${rowBg}">
        <td style="border:1px solid #d1d5db;padding:6px 10px;font-weight:600;text-align:right">${escapeHtml(entry.subject_name ?? entry.subject_id)}</td>
        <td style="border:1px solid #d1d5db;padding:6px 8px;text-align:center">${escapeHtml(entry.grade_type_name ?? '—')}</td>
        <td style="border:1px solid #d1d5db;padding:6px 8px;text-align:center;font-weight:900">${formatScore(entry.score)}</td>
        <td style="border:1px solid #d1d5db;padding:6px 8px;text-align:center">${formatScore(entry.max_score)}</td>
        <td style="border:1px solid #d1d5db;padding:6px 8px;text-align:center">${pct}%</td>
        <td style="border:1px solid #d1d5db;padding:6px 8px;text-align:center">${escapeHtml(gradeLabel.labelAr)}</td>
      </tr>`
    })
    .join('')

  // صف المتوسط
  const summaryRow =
    avgPct !== null
      ? `
    <tfoot>
      <tr style="background:#f3f4f6;font-weight:700">
        <td colspan="4" style="border:1px solid #d1d5db;padding:7px 10px;text-align:right">المتوسط الإجمالي</td>
        <td style="border:1px solid #d1d5db;padding:7px 8px;text-align:center">${avgPct}%</td>
        <td style="border:1px solid #d1d5db;padding:7px 8px;text-align:center">${overallLabel ? escapeHtml(overallLabel.labelAr) : '—'}</td>
      </tr>
    </tfoot>`
      : ''

  // شعار المدرسة
  const logoHtml = schoolLogoUrl
    ? `<img src="${escapeHtml(schoolLogoUrl)}" alt="شعار المدرسة" style="height:70px;object-fit:contain;margin-bottom:10px" />`
    : ''

  // اسم المدرسة
  const schoolNameHtml = schoolName
    ? `<p style="font-size:17px;font-weight:900;margin:0 0 4px 0">${escapeHtml(schoolName)}</p>`
    : ''

  // اسم القسم
  const classDisplay = [className, sectionName].filter(Boolean).join(' / ')

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>كشف درجات — ${escapeHtml(studentName)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Cairo', 'Tajawal', Arial, sans-serif;
      background: #f8fafc;
      color: #111827;
      direction: rtl;
    }

    .page-wrapper {
      max-width: 820px;
      margin: 0 auto;
      padding: 32px;
      background: #ffffff;
      position: relative;
    }

    /* علامة مائية خفيفة */
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 90px;
      font-weight: 900;
      color: rgba(99, 102, 241, 0.05);
      white-space: nowrap;
      pointer-events: none;
      z-index: 0;
      user-select: none;
    }

    .content { position: relative; z-index: 1; }

    /* رأس الوثيقة */
    .header {
      text-align: center;
      padding-bottom: 20px;
      margin-bottom: 20px;
      border-bottom: 3px solid #1e3a5f;
    }

    /* معلومات الطالب */
    .student-info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 32px;
      margin-bottom: 24px;
      font-size: 13px;
      background: #f8fafc;
      padding: 14px 18px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }

    .info-row {
      display: flex;
      gap: 6px;
      align-items: baseline;
    }

    .info-label {
      font-weight: 700;
      white-space: nowrap;
      color: #374151;
    }

    .info-value {
      color: #111827;
    }

    /* جدول الدرجات */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
      margin-bottom: 28px;
    }

    thead tr {
      background: #1e3a5f;
      color: #ffffff;
    }

    thead th {
      padding: 8px 8px;
      text-align: center;
      font-weight: 700;
      border: 1px solid #1e3a5f;
    }

    /* التوقيعات */
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #d1d5db;
    }

    .sig-block {
      text-align: center;
    }

    .sig-line {
      border-bottom: 1.5px solid #374151;
      height: 40px;
      margin-bottom: 6px;
    }

    .sig-title {
      font-size: 12px;
      font-weight: 700;
      color: #374151;
    }

    /* تذييل الوثيقة */
    .doc-footer {
      margin-top: 28px;
      padding-top: 12px;
      border-top: 1px dashed #d1d5db;
      font-size: 11px;
      color: #6b7280;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .doc-hash {
      font-family: monospace;
      background: #f3f4f6;
      padding: 2px 8px;
      border-radius: 4px;
      letter-spacing: 1px;
    }

    /* طباعة */
    @media print {
      body { background: #fff; }
      .page-wrapper { padding: 16px 24px; max-width: 100%; }
      .no-print { display: none !important; }
      .watermark {
        position: fixed;
        color: rgba(0,0,0,0.04);
      }
      thead tr { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <!-- علامة مائية -->
  <div class="watermark" aria-hidden="true">كشف درجات</div>

  <div class="page-wrapper">
    <div class="content">

      <!-- رأس الصفحة -->
      <div class="header">
        ${logoHtml}
        ${schoolNameHtml}
        <p style="font-size:20px;font-weight:900;color:#1e3a5f">كشف درجات</p>
      </div>

      <!-- معلومات الطالب -->
      <div class="student-info-grid">
        <div class="info-row">
          <span class="info-label">اسم الطالب:</span>
          <span class="info-value">${escapeHtml(studentName)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">الصف:</span>
          <span class="info-value">${escapeHtml(classDisplay)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">السنة الدراسية:</span>
          <span class="info-value">${escapeHtml(academicYear)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">الفصل الدراسي:</span>
          <span class="info-value">${escapeHtml(semesterLabel(semester))}</span>
        </div>
      </div>

      <!-- جدول الدرجات -->
      <table>
        <thead>
          <tr>
            <th style="text-align:right;padding-right:10px">المادة</th>
            <th>شفهي</th>
            <th>واجبات</th>
            <th>شهري</th>
            <th>نصفي</th>
            <th>نهائي</th>
            <th>المجموع</th>
            <th>%</th>
            <th>التقدير</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
        ${summaryRow}
      </table>

      <!-- التوقيعات -->
      <div class="signatures">
        <div class="sig-block">
          <div class="sig-line"></div>
          <p class="sig-title">مدير الفرع</p>
        </div>
        <div class="sig-block">
          <div class="sig-line"></div>
          <p class="sig-title">المدير العام</p>
        </div>
      </div>

      <!-- تذييل الوثيقة -->
      <div class="doc-footer">
        <span>هذه الوثيقة صادرة بتاريخ: <strong>${issuedDate}</strong></span>
        <span>رمز التحقق: <span class="doc-hash">${docHash}</span></span>
      </div>

    </div><!-- end .content -->
  </div><!-- end .page-wrapper -->

</body>
</html>`
}
