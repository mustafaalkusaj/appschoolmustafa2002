"use client";

import { computeGradeLabel, computePercentage } from "@/lib/grades/grade-calculator";
import type { GradeEntry } from "@/lib/grades/types";

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  studentName: string;
  className: string;
  sectionName: string | null;
  academicYear: string;
  semester: 1 | 2;
  entries: GradeEntry[];
  schoolName?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function semesterLabel(sem: 1 | 2): string {
  return sem === 1 ? "الفصل الأول" : "الفصل الثاني";
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * ReportCardPrintView
 *
 * Rendered in the DOM at all times but hidden on screen via `hidden print:block`.
 * When the user calls `window.print()`, only this component and the browser's
 * print stylesheet are visible.
 */
export function ReportCardPrintView({
  studentName,
  className,
  sectionName,
  academicYear,
  semester,
  entries,
  schoolName,
}: Props) {
  // Compute overall average across all entries
  const totalScore = entries.reduce((s, e) => s + e.score, 0);
  const totalMax = entries.reduce((s, e) => s + e.max_score, 0);
  const avgPct = totalMax > 0 ? computePercentage(totalScore, totalMax) : null;
  const overallLabel = avgPct !== null ? computeGradeLabel(avgPct) : null;

  return (
    // hidden on screen; visible only in @media print
    <div className="hidden print:block" dir="rtl">
      <div
        style={{
          fontFamily: "'Cairo', 'Tajawal', Arial, sans-serif",
          padding: "24px 32px",
          maxWidth: "800px",
          margin: "0 auto",
          color: "#111",
        }}
      >
        {/* ── School header ──────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: "20px", borderBottom: "2px solid #111", paddingBottom: "16px" }}>
          {schoolName && (
            <p style={{ fontSize: "18px", fontWeight: "900", marginBottom: "4px" }}>{schoolName}</p>
          )}
          <p style={{ fontSize: "22px", fontWeight: "900" }}>كشف درجات</p>
        </div>

        {/* ── Student info ───────────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px 24px",
            marginBottom: "20px",
            fontSize: "13px",
          }}
        >
          {[
            { label: "اسم الطالب", value: studentName },
            { label: "الصف", value: [className, sectionName].filter(Boolean).join(" / ") },
            { label: "السنة الدراسية", value: academicYear },
            { label: "الفصل الدراسي", value: semesterLabel(semester) },
          ].map((row) => (
            <div key={row.label} style={{ display: "flex", gap: "6px" }}>
              <span style={{ fontWeight: "700", whiteSpace: "nowrap" }}>{row.label}:</span>
              <span>{row.value}</span>
            </div>
          ))}
        </div>

        {/* ── Grade table ────────────────────────────────────────────────── */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "12px",
            marginBottom: "20px",
          }}
        >
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              {[
                "المادة",
                "نوع الدرجة",
                "الدرجة",
                "من",
                "%",
                "التقدير",
                "الحالة",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "6px 8px",
                    textAlign: "center",
                    fontWeight: "700",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => {
              const pct = entry.percentage ?? computePercentage(entry.score, entry.max_score);
              const gradeLabel = computeGradeLabel(pct);
              const statusLabels: Record<string, string> = {
                draft: "مسودة",
                confirmed: "مؤكد",
                locked: "مقفل",
              };
              return (
                <tr
                  key={entry.id}
                  style={{ background: idx % 2 === 0 ? "#fff" : "#f9fafb" }}
                >
                  <td style={{ border: "1px solid #d1d5db", padding: "5px 8px", fontWeight: "600" }}>
                    {entry.subject_name ?? entry.subject_id}
                  </td>
                  <td style={{ border: "1px solid #d1d5db", padding: "5px 8px", textAlign: "center" }}>
                    {entry.grade_type_name ?? "—"}
                  </td>
                  <td style={{ border: "1px solid #d1d5db", padding: "5px 8px", textAlign: "center", fontWeight: "900" }}>
                    {entry.score}
                  </td>
                  <td style={{ border: "1px solid #d1d5db", padding: "5px 8px", textAlign: "center" }}>
                    {entry.max_score}
                  </td>
                  <td style={{ border: "1px solid #d1d5db", padding: "5px 8px", textAlign: "center" }}>
                    {pct.toFixed(0)}%
                  </td>
                  <td style={{ border: "1px solid #d1d5db", padding: "5px 8px", textAlign: "center" }}>
                    {gradeLabel.badge} {gradeLabel.labelAr}
                  </td>
                  <td style={{ border: "1px solid #d1d5db", padding: "5px 8px", textAlign: "center" }}>
                    {statusLabels[entry.status] ?? entry.status}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Summary row */}
          {avgPct !== null && (
            <tfoot>
              <tr style={{ background: "#f3f4f6", fontWeight: "700" }}>
                <td
                  colSpan={4}
                  style={{ border: "1px solid #d1d5db", padding: "6px 8px", textAlign: "right" }}
                >
                  المتوسط الكلي
                </td>
                <td style={{ border: "1px solid #d1d5db", padding: "6px 8px", textAlign: "center", fontWeight: "900" }}>
                  {avgPct.toFixed(0)}%
                </td>
                <td style={{ border: "1px solid #d1d5db", padding: "6px 8px", textAlign: "center" }}>
                  {overallLabel ? `${overallLabel.badge} ${overallLabel.labelAr}` : "—"}
                </td>
                <td style={{ border: "1px solid #d1d5db", padding: "6px 8px", textAlign: "center" }}>
                  {avgPct >= 50 ? "ناجح" : "راسب"}
                </td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* ── QR code placeholder ────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-start",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              border: "2px dashed #9ca3af",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "10px",
              color: "#9ca3af",
              textAlign: "center",
            }}
          >
            QR
          </div>
        </div>

        {/* ── Signature line ─────────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "32px",
            marginTop: "8px",
            paddingTop: "16px",
            borderTop: "1px solid #d1d5db",
          }}
        >
          {["مدير الفرع", "المدير العام"].map((title) => (
            <div key={title} style={{ textAlign: "center" }}>
              <div
                style={{
                  borderBottom: "1px solid #111",
                  marginBottom: "6px",
                  height: "36px",
                }}
              />
              <p style={{ fontSize: "12px", fontWeight: "700" }}>{title}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
