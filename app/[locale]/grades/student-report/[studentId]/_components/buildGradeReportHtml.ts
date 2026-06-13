import { wrapPrintDocument, escapeHtml } from "@/lib/print/branding";
import type { GradeEntry } from "@/lib/grades/types";
import { computeGradeLabel, computePercentage } from "@/lib/grades/grade-calculator";

export interface GradeReportSection {
  /** Section heading shown above the table (e.g. "الفصل الأول" or "2024-2025 – الفصل الأول") */
  label: string;
  entries: GradeEntry[];
}

interface GradeReportOptions {
  locale: "ar" | "en";
  studentName: string;
  className: string;
  sectionName: string | null;
  academicYear?: string;
  /** Top-level period label shown in the student-info panel */
  periodLabel?: string;
  sections: GradeReportSection[];
  branding?: {
    schoolName?: string | null;
    logoUrl?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
  };
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(n);
}

const STATUS_LABELS: Record<string, Record<string, string>> = {
  ar: { draft: "مسودة", confirmed: "مؤكد", locked: "مقفل" },
  en: { draft: "Draft", confirmed: "Confirmed", locked: "Locked" },
};

function buildSectionHtml(section: GradeReportSection, isAr: boolean): string {
  const statusLabels = STATUS_LABELS[isAr ? "ar" : "en"];
  const tableHeaders = isAr
    ? ["المادة", "نوع الدرجة", "الدرجة", "من", "%", "التقدير", "الحالة"]
    : ["Subject", "Grade Type", "Score", "Max", "%", "Grade", "Status"];

  const totalScore = section.entries.reduce((s, e) => s + e.score, 0);
  const totalMax = section.entries.reduce((s, e) => s + e.max_score, 0);
  const avgPct = totalMax > 0 ? computePercentage(totalScore, totalMax) : null;
  const overallLabel = avgPct !== null ? computeGradeLabel(avgPct) : null;

  if (section.entries.length === 0) {
    return `
      <div style="margin-bottom:24px">
        ${section.label ? `<h3 style="font-size:15px;font-weight:800;color:var(--print-primary-deep);margin:0 0 10px">${escapeHtml(section.label)}</h3>` : ""}
        <p style="color:var(--print-muted);font-size:13px">${isAr ? "لا توجد درجات لهذا الفصل." : "No grades for this period."}</p>
      </div>
    `;
  }

  const rows = section.entries.map((entry) => {
    const pct = entry.percentage ?? computePercentage(entry.score, entry.max_score);
    const label = computeGradeLabel(pct);
    const passColor = pct >= 50 ? "#16a34a" : "#dc2626";
    return `
      <tr>
        <td style="font-weight:700">${escapeHtml(entry.subject_name ?? entry.subject_id)}</td>
        <td style="text-align:center;font-size:11px">${escapeHtml(entry.grade_type_name ?? "—")}</td>
        <td style="text-align:center;font-weight:900;font-size:15px">${fmt(entry.score)}</td>
        <td style="text-align:center">${fmt(entry.max_score)}</td>
        <td style="text-align:center;font-weight:700">${fmt(pct)}%</td>
        <td style="text-align:center">${escapeHtml(label.badge)} ${escapeHtml(isAr ? label.labelAr : label.label)}</td>
        <td style="text-align:center;color:${passColor};font-weight:700;font-size:11px">${escapeHtml(statusLabels[entry.status] ?? entry.status)}</td>
      </tr>
    `;
  }).join("");

  const summaryRow = avgPct !== null ? `
    <tfoot>
      <tr style="background:var(--print-surface)">
        <td colspan="4" style="font-weight:700;padding:10px 14px">${isAr ? "المتوسط الكلي" : "Overall Average"}</td>
        <td style="text-align:center;font-weight:900;font-size:15px;padding:10px 14px">${fmt(avgPct)}%</td>
        <td style="text-align:center;padding:10px 14px">${overallLabel ? `${overallLabel.badge} ${isAr ? overallLabel.labelAr : overallLabel.label}` : "—"}</td>
        <td style="text-align:center;padding:10px 14px;font-weight:700;color:${avgPct >= 50 ? "#16a34a" : "#dc2626"}">
          ${avgPct >= 50 ? (isAr ? "ناجح" : "Pass") : (isAr ? "راسب" : "Fail")}
        </td>
      </tr>
    </tfoot>
  ` : "";

  return `
    <div style="margin-bottom:28px">
      ${section.label ? `<h3 style="font-size:15px;font-weight:800;color:var(--print-primary-deep);margin:0 0 10px;padding-bottom:6px;border-bottom:2px solid var(--print-primary)20">${escapeHtml(section.label)}</h3>` : ""}
      <table style="margin-bottom:0">
        <thead><tr>${tableHeaders.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
        <tbody>${rows}</tbody>
        ${summaryRow}
      </table>
    </div>
  `;
}

export function buildGradeReportHtml(opts: GradeReportOptions): string {
  const { locale, studentName, className, sectionName, academicYear, periodLabel, sections, branding } = opts;
  const isAr = locale !== "en";

  const classLine = [className, sectionName].filter(Boolean).join(" / ");
  const sectionsHtml = sections.map((s) => buildSectionHtml(s, isAr)).join("");

  const bodyHtml = `
    <!-- Student info panel -->
    <div class="print-panel" style="margin-bottom:20px">
      <div class="print-grid">
        <div>
          <span class="print-label">${isAr ? "اسم الطالب" : "Student Name"}</span>
          <div class="print-value" style="font-size:20px">${escapeHtml(studentName)}</div>
        </div>
        <div>
          <span class="print-label">${isAr ? "الصف والشعبة" : "Class"}</span>
          <div class="print-value">${escapeHtml(classLine || "—")}</div>
        </div>
        ${academicYear ? `<div>
          <span class="print-label">${isAr ? "السنة الدراسية" : "Academic Year"}</span>
          <div class="print-value">${escapeHtml(academicYear)}</div>
        </div>` : ""}
        ${periodLabel ? `<div>
          <span class="print-label">${isAr ? "الفترة" : "Period"}</span>
          <div class="print-value">${escapeHtml(periodLabel)}</div>
        </div>` : ""}
      </div>
    </div>

    ${sectionsHtml}

    <!-- Signature lines -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:32px;padding-top:20px;border-top:1px solid rgba(16,35,58,.1)">
      ${(isAr ? ["مدير الفرع", "المدير العام"] : ["Branch Manager", "General Manager"]).map((title) => `
        <div style="text-align:center">
          <div style="height:40px;border-bottom:1px solid #374151;margin-bottom:8px"></div>
          <p style="font-size:12px;font-weight:700;color:var(--print-muted)">${escapeHtml(title)}</p>
        </div>
      `).join("")}
    </div>
  `;

  const titleLabel = isAr
    ? sections.length === 1 ? "كشف درجات" : "تقرير درجات شامل"
    : sections.length === 1 ? "Grade Report" : "Full Grade Report";

  return wrapPrintDocument({
    title: titleLabel,
    subtitle: studentName,
    bodyHtml,
    branding: {
      schoolName: branding?.schoolName,
      logoUrl: branding?.logoUrl,
      primaryColor: branding?.primaryColor,
      secondaryColor: branding?.secondaryColor,
      locale,
    },
    autoPrint: false,
  });
}
