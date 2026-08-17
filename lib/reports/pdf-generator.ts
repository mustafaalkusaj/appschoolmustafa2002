/**
 * Server-side HTML report generators.
 * Each function returns a complete HTML string with print CSS,
 * school branding header, RTL support, and styled tables.
 * The browser's native print dialog handles PDF conversion.
 */

import { escapeHtml } from "@/lib/print/branding";

// ── Types ────────────────────────────────────────────────────────────────────

export type ReportBranding = {
  schoolName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
};

type GradeRow = {
  subject_name: string;
  grade_type_name: string | null;
  score: number;
  max_score: number;
  percentage: number;
  status: string;
};

type AttendanceRow = {
  student_name: string;
  date: string;
  status: string; // present | absent | late | excused
};

type FinancialSummaryData = {
  totalStudents: number;
  totalFees: number;
  totalPaid: number;
  totalRemaining: number;
  totalExpenses: number;
  totalSalaries: number;
  totalIncomes: number;
  paymentsByMethod: Array<{ method: string; total: number; count: number }>;
  topDebtors: Array<{ name: string; className: string; remaining: number }>;
};

// ── Shared helpers ───────────────────────────────────────────────────────────

function fmt(n: number): string {
  try {
    return new Intl.NumberFormat("en-US").format(n);
  } catch {
    return String(n);
  }
}

function fmtDate(d: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    }).format(new Date(d));
  } catch {
    return d;
  }
}

function reportShell(opts: {
  title: string;
  subtitle: string;
  locale: "ar" | "en";
  branding: ReportBranding;
  bodyHtml: string;
}): string {
  const { title, subtitle, locale, branding, bodyHtml } = opts;
  const dir = locale === "en" ? "ltr" : "rtl";
  const isEn = locale === "en";
  const primary = branding.primaryColor || "#1B2B72";
  const schoolName = escapeHtml(branding.schoolName || (isEn ? "School" : "المدرسة"));
  const logoUrl = branding.logoUrl;

  const logoHtml = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="logo" class="rpt-logo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><div class="rpt-logo rpt-logo-fb" style="display:none">${schoolName.charAt(0)}</div>`
    : `<div class="rpt-logo rpt-logo-fb">${schoolName.charAt(0)}</div>`;

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${locale}">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(title)}</title>
<style>
@font-face{font-family:"Noto Sans Arabic";src:url("/fonts/noto-sans-arabic/NotoSansArabic-Variable.ttf") format("truetype");font-style:normal;font-weight:100 900;font-display:swap;}
*{box-sizing:border-box;margin:0;padding:0}
body{
  font-family:"Noto Sans Arabic",Segoe UI,Tahoma,Arial,sans-serif;
  color:#1a1a2e;background:#f0f2f8;
  padding:24px 16px;direction:${dir};
  -webkit-print-color-adjust:exact;print-color-adjust:exact;
}
.rpt-page{
  max-width:900px;margin:0 auto;background:#fff;
  border-radius:20px;border:1px solid #e2e6f0;
  box-shadow:0 8px 32px rgba(15,23,42,.08);overflow:hidden;
}
.rpt-header{
  display:flex;align-items:center;justify-content:space-between;gap:16px;
  padding:24px 28px 20px;
  border-bottom:2px solid ${primary}18;
  background:linear-gradient(135deg,${primary}08,#fff);
}
.rpt-brand{display:flex;align-items:center;gap:14px;min-width:0}
.rpt-logo{width:56px;height:56px;border-radius:16px;object-fit:contain;border:1px solid ${primary}20;background:#fff;flex-shrink:0}
.rpt-logo-fb{display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:${primary};background:${primary}08}
.rpt-school{font-size:18px;font-weight:900;color:${primary}}
.rpt-meta{text-align:end}
.rpt-title{font-size:14px;font-weight:900;color:#1a1a2e}
.rpt-sub{font-size:11px;color:#6b7280;margin-top:2px}
.rpt-date{font-size:10px;color:#9ca3af;margin-top:4px}
.rpt-body{padding:24px 28px 28px}
table{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}
th{background:${primary}0c;color:${primary};font-weight:900;font-size:10px;text-transform:uppercase;letter-spacing:.5px;padding:10px 12px;border-bottom:2px solid ${primary}20;text-align:center;white-space:nowrap}
td{padding:9px 12px;border-bottom:1px solid #f0f2f8;text-align:center}
tr:hover{background:${primary}04}
.rpt-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px}
.rpt-stat{background:${primary}06;border:1px solid ${primary}12;border-radius:14px;padding:14px 16px}
.rpt-stat-label{font-size:10px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:.3px;margin-bottom:4px}
.rpt-stat-value{font-size:20px;font-weight:900;color:${primary}}
.rpt-footer{text-align:center;padding:16px;font-size:10px;color:#9ca3af;border-top:1px solid #f0f2f8}
.pass{color:#16a34a;font-weight:700} .fail{color:#dc2626;font-weight:700}
.present{color:#16a34a} .absent{color:#dc2626} .late{color:#d97706} .excused{color:#6366f1}
@media print{
  @page{size:A4;margin:1cm}
  body{background:#fff!important;padding:0!important}
  .rpt-page{border:none!important;border-radius:0!important;box-shadow:none!important;max-width:none!important}
  .no-print{display:none!important}
}
</style>
</head>
<body>
<div class="rpt-page">
  <div class="rpt-header">
    <div class="rpt-brand">
      ${logoHtml}
      <div class="rpt-school">${schoolName}</div>
    </div>
    <div class="rpt-meta">
      <div class="rpt-title">${escapeHtml(title)}</div>
      <div class="rpt-sub">${escapeHtml(subtitle)}</div>
      <div class="rpt-date">${fmtDate(new Date().toISOString())}</div>
    </div>
  </div>
  <div class="rpt-body">
    ${bodyHtml}
  </div>
  <div class="rpt-footer">
    ${isEn ? "Generated by the school management system" : "تم إنشاء التقرير من نظام إدارة المدرسة"}
  </div>
</div>
<script>window.onload=function(){window.print()}</script>
</body>
</html>`;
}

// ── 1. Student Grade Report ──────────────────────────────────────────────────

export function generateStudentGradeReport(opts: {
  studentName: string;
  className: string;
  sectionName?: string | null;
  academicYear?: string | null;
  entries: GradeRow[];
  locale: "ar" | "en";
  branding: ReportBranding;
}): string {
  const { studentName, className, sectionName, academicYear, entries, locale, branding } = opts;
  const isEn = locale === "en";

  const totalScore = entries.reduce((s, e) => s + e.score, 0);
  const totalMax = entries.reduce((s, e) => s + e.max_score, 0);
  const avgPct = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;

  const statusLabel = (s: string) => {
    if (s === "pass" || s === "passed") return isEn ? "Pass" : "ناجح";
    if (s === "fail" || s === "failed") return isEn ? "Fail" : "راسب";
    return s;
  };

  const summaryHtml = `
    <div class="rpt-summary">
      <div class="rpt-stat">
        <div class="rpt-stat-label">${isEn ? "Student" : "الطالب"}</div>
        <div class="rpt-stat-value" style="font-size:16px">${escapeHtml(studentName)}</div>
      </div>
      <div class="rpt-stat">
        <div class="rpt-stat-label">${isEn ? "Class" : "الصف"}</div>
        <div class="rpt-stat-value" style="font-size:16px">${escapeHtml([className, sectionName].filter(Boolean).join(" - "))}</div>
      </div>
      <div class="rpt-stat">
        <div class="rpt-stat-label">${isEn ? "Subjects" : "المواد"}</div>
        <div class="rpt-stat-value">${entries.length}</div>
      </div>
      <div class="rpt-stat">
        <div class="rpt-stat-label">${isEn ? "Average" : "المعدل"}</div>
        <div class="rpt-stat-value" style="color:${avgPct >= 50 ? "#16a34a" : "#dc2626"}">${avgPct.toFixed(1)}%</div>
      </div>
    </div>`;

  const tableHtml = `
    <table>
      <thead><tr>
        <th>#</th>
        <th>${isEn ? "Subject" : "المادة"}</th>
        <th>${isEn ? "Type" : "النوع"}</th>
        <th>${isEn ? "Score" : "الدرجة"}</th>
        <th>${isEn ? "Max" : "من"}</th>
        <th>%</th>
        <th>${isEn ? "Status" : "الحالة"}</th>
      </tr></thead>
      <tbody>
        ${entries.map((e, i) => {
          const pct = e.max_score > 0 ? (e.score / e.max_score) * 100 : 0;
          const passed = pct >= 50;
          return `<tr>
            <td>${i + 1}</td>
            <td style="text-align:start;font-weight:700">${escapeHtml(e.subject_name)}</td>
            <td>${escapeHtml(e.grade_type_name || "—")}</td>
            <td style="font-weight:900">${e.score}</td>
            <td>${e.max_score}</td>
            <td style="font-weight:700">${pct.toFixed(0)}%</td>
            <td class="${passed ? "pass" : "fail"}">${statusLabel(e.status)}</td>
          </tr>`;
        }).join("")}
      </tbody>
      <tfoot>
        <tr style="background:#f8fafc;border-top:2px solid #e2e6f0">
          <td colspan="3" style="text-align:start;font-weight:900">${isEn ? "Total / Average" : "المجموع / المعدل"}</td>
          <td style="font-weight:900">${totalScore}</td>
          <td>${totalMax}</td>
          <td style="font-weight:900;color:${avgPct >= 50 ? "#16a34a" : "#dc2626"}">${avgPct.toFixed(1)}%</td>
          <td class="${avgPct >= 50 ? "pass" : "fail"}">${avgPct >= 50 ? (isEn ? "Pass" : "ناجح") : (isEn ? "Fail" : "راسب")}</td>
        </tr>
      </tfoot>
    </table>`;

  return reportShell({
    title: isEn ? "Student Grade Report" : "تقرير درجات الطالب",
    subtitle: academicYear
      ? (isEn ? `Academic Year ${academicYear}` : `السنة الدراسية ${academicYear}`)
      : (isEn ? "Grade Report" : "تقرير الدرجات"),
    locale,
    branding,
    bodyHtml: summaryHtml + tableHtml,
  });
}

// ── 2. Class Attendance Report ───────────────────────────────────────────────

export function generateClassAttendanceReport(opts: {
  className: string;
  section: string;
  dateRange: { from: string; to: string };
  rows: AttendanceRow[];
  locale: "ar" | "en";
  branding: ReportBranding;
}): string {
  const { className, section, dateRange, rows, locale, branding } = opts;
  const isEn = locale === "en";

  const totalPresent = rows.filter((r) => r.status === "present").length;
  const totalAbsent = rows.filter((r) => r.status === "absent").length;
  const totalLate = rows.filter((r) => r.status === "late").length;
  const totalExcused = rows.filter((r) => r.status === "excused").length;
  const attendanceRate = rows.length > 0 ? (totalPresent / rows.length) * 100 : 0;

  const statusLabel = (s: string) => {
    const map: Record<string, string> = isEn
      ? { present: "Present", absent: "Absent", late: "Late", excused: "Excused" }
      : { present: "حاضر", absent: "غائب", late: "متأخر", excused: "معذور" };
    return map[s] || s;
  };

  const summaryHtml = `
    <div class="rpt-summary">
      <div class="rpt-stat">
        <div class="rpt-stat-label">${isEn ? "Class" : "الصف"}</div>
        <div class="rpt-stat-value" style="font-size:16px">${escapeHtml(className)} - ${escapeHtml(section)}</div>
      </div>
      <div class="rpt-stat">
        <div class="rpt-stat-label">${isEn ? "Period" : "الفترة"}</div>
        <div class="rpt-stat-value" style="font-size:14px">${fmtDate(dateRange.from)} — ${fmtDate(dateRange.to)}</div>
      </div>
      <div class="rpt-stat">
        <div class="rpt-stat-label">${isEn ? "Records" : "السجلات"}</div>
        <div class="rpt-stat-value">${rows.length}</div>
      </div>
      <div class="rpt-stat">
        <div class="rpt-stat-label">${isEn ? "Attendance Rate" : "نسبة الحضور"}</div>
        <div class="rpt-stat-value" style="color:${attendanceRate >= 80 ? "#16a34a" : attendanceRate >= 60 ? "#d97706" : "#dc2626"}">${attendanceRate.toFixed(1)}%</div>
      </div>
    </div>
    <div class="rpt-summary">
      <div class="rpt-stat"><div class="rpt-stat-label present">${isEn ? "Present" : "حاضر"}</div><div class="rpt-stat-value present">${totalPresent}</div></div>
      <div class="rpt-stat"><div class="rpt-stat-label absent">${isEn ? "Absent" : "غائب"}</div><div class="rpt-stat-value absent">${totalAbsent}</div></div>
      <div class="rpt-stat"><div class="rpt-stat-label late">${isEn ? "Late" : "متأخر"}</div><div class="rpt-stat-value late">${totalLate}</div></div>
      <div class="rpt-stat"><div class="rpt-stat-label excused">${isEn ? "Excused" : "معذور"}</div><div class="rpt-stat-value excused">${totalExcused}</div></div>
    </div>`;

  const tableHtml = `
    <table>
      <thead><tr>
        <th>#</th>
        <th>${isEn ? "Student" : "الطالب"}</th>
        <th>${isEn ? "Date" : "التاريخ"}</th>
        <th>${isEn ? "Status" : "الحالة"}</th>
      </tr></thead>
      <tbody>
        ${rows.map((r, i) => `<tr>
          <td>${i + 1}</td>
          <td style="text-align:start;font-weight:700">${escapeHtml(r.student_name)}</td>
          <td>${fmtDate(r.date)}</td>
          <td class="${r.status}">${statusLabel(r.status)}</td>
        </tr>`).join("")}
      </tbody>
    </table>`;

  return reportShell({
    title: isEn ? "Class Attendance Report" : "تقرير حضور الصف",
    subtitle: `${escapeHtml(className)} - ${escapeHtml(section)}`,
    locale,
    branding,
    bodyHtml: summaryHtml + tableHtml,
  });
}

// ── 3. Financial Summary Report ──────────────────────────────────────────────

export function generateFinancialSummaryReport(opts: {
  dateRange: { from: string; to: string };
  data: FinancialSummaryData;
  locale: "ar" | "en";
  branding: ReportBranding;
}): string {
  const { dateRange, data, locale, branding } = opts;
  const isEn = locale === "en";
  const currency = isEn ? "IQD" : "د.ع";

  const collectionRate = data.totalFees > 0 ? (data.totalPaid / data.totalFees) * 100 : 0;

  const summaryHtml = `
    <div class="rpt-summary">
      <div class="rpt-stat">
        <div class="rpt-stat-label">${isEn ? "Total Students" : "عدد الطلاب"}</div>
        <div class="rpt-stat-value">${fmt(data.totalStudents)}</div>
      </div>
      <div class="rpt-stat">
        <div class="rpt-stat-label">${isEn ? "Total Fees" : "إجمالي الرسوم"}</div>
        <div class="rpt-stat-value" style="font-size:16px">${currency} ${fmt(data.totalFees)}</div>
      </div>
      <div class="rpt-stat">
        <div class="rpt-stat-label">${isEn ? "Collected" : "المستحصل"}</div>
        <div class="rpt-stat-value" style="font-size:16px;color:#16a34a">${currency} ${fmt(data.totalPaid)}</div>
      </div>
      <div class="rpt-stat">
        <div class="rpt-stat-label">${isEn ? "Remaining" : "المتبقي"}</div>
        <div class="rpt-stat-value" style="font-size:16px;color:#dc2626">${currency} ${fmt(data.totalRemaining)}</div>
      </div>
    </div>
    <div class="rpt-summary">
      <div class="rpt-stat">
        <div class="rpt-stat-label">${isEn ? "Expenses" : "المصروفات"}</div>
        <div class="rpt-stat-value" style="font-size:16px;color:#dc2626">${currency} ${fmt(data.totalExpenses)}</div>
      </div>
      <div class="rpt-stat">
        <div class="rpt-stat-label">${isEn ? "Salaries" : "الرواتب"}</div>
        <div class="rpt-stat-value" style="font-size:16px">${currency} ${fmt(data.totalSalaries)}</div>
      </div>
      <div class="rpt-stat">
        <div class="rpt-stat-label">${isEn ? "Other Income" : "إيرادات أخرى"}</div>
        <div class="rpt-stat-value" style="font-size:16px;color:#16a34a">${currency} ${fmt(data.totalIncomes)}</div>
      </div>
    </div>
    <div class="rpt-summary">
      <div class="rpt-stat">
        <div class="rpt-stat-label">${isEn ? "Collection Rate" : "نسبة التحصيل"}</div>
        <div class="rpt-stat-value" style="color:${collectionRate >= 80 ? "#16a34a" : collectionRate >= 50 ? "#d97706" : "#dc2626"}">${collectionRate.toFixed(1)}%</div>
      </div>
      <div class="rpt-stat">
        <div class="rpt-stat-label">${isEn ? "Period" : "الفترة"}</div>
        <div class="rpt-stat-value" style="font-size:14px">${fmtDate(dateRange.from)} — ${fmtDate(dateRange.to)}</div>
      </div>
    </div>`;

  const methodsHtml = data.paymentsByMethod.length > 0
    ? `<h3 style="font-size:13px;font-weight:900;margin:20px 0 8px;color:#1a1a2e">${isEn ? "Payments by Method" : "الدفعات حسب الطريقة"}</h3>
    <table>
      <thead><tr>
        <th>${isEn ? "Method" : "الطريقة"}</th>
        <th>${isEn ? "Count" : "العدد"}</th>
        <th>${isEn ? "Total" : "المجموع"}</th>
      </tr></thead>
      <tbody>
        ${data.paymentsByMethod.map((m) => `<tr>
          <td style="font-weight:700">${escapeHtml(m.method)}</td>
          <td>${m.count}</td>
          <td style="font-weight:700">${currency} ${fmt(m.total)}</td>
        </tr>`).join("")}
      </tbody>
    </table>`
    : "";

  const debtorsHtml = data.topDebtors.length > 0
    ? `<h3 style="font-size:13px;font-weight:900;margin:20px 0 8px;color:#1a1a2e">${isEn ? "Top Outstanding Balances" : "أعلى المبالغ المتبقية"}</h3>
    <table>
      <thead><tr>
        <th>#</th>
        <th>${isEn ? "Student" : "الطالب"}</th>
        <th>${isEn ? "Class" : "الصف"}</th>
        <th>${isEn ? "Remaining" : "المتبقي"}</th>
      </tr></thead>
      <tbody>
        ${data.topDebtors.map((d, i) => `<tr>
          <td>${i + 1}</td>
          <td style="text-align:start;font-weight:700">${escapeHtml(d.name)}</td>
          <td>${escapeHtml(d.className)}</td>
          <td style="font-weight:700;color:#dc2626">${currency} ${fmt(d.remaining)}</td>
        </tr>`).join("")}
      </tbody>
    </table>`
    : "";

  return reportShell({
    title: isEn ? "Financial Summary Report" : "التقرير المالي الشامل",
    subtitle: isEn ? "School Financial Overview" : "نظرة شاملة على الوضع المالي",
    locale,
    branding,
    bodyHtml: summaryHtml + methodsHtml + debtorsHtml,
  });
}
