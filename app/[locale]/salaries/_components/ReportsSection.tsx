"use client";

import { AppIcon } from "@/components/AppIcon";
import { formatNumber } from "@/lib/formatting";
import type { Teacher, DailyLecture, ReportSummary, ReportTotals } from "../_types";

interface ReportsSectionProps {
  reportView: "summary" | "details";
  reportTeacher: string;
  reportLoading: boolean;
  reportSummary: ReportSummary[];
  reportTotals: ReportTotals;
  dailyLectures: DailyLecture[];
  teachers: Teacher[];
  onViewChange: (view: "summary" | "details") => void;
  onTeacherChange: (id: string) => void;
  onPrintReport: () => void;
}

export function ReportsSection({
  reportView,
  reportTeacher,
  reportLoading,
  reportSummary,
  reportTotals,
  dailyLectures,
  teachers,
  onViewChange,
  onTeacherChange,
  onPrintReport,
}: ReportsSectionProps) {
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <div className="report-tabs">
          <button
            className="report-tab"
            style={{
              background:
                reportView === "summary"
                  ? "linear-gradient(135deg,var(--p3),var(--p2))"
                  : "#EEF6FF",
              color: reportView === "summary" ? "white" : "var(--p3)",
            }}
            onClick={() => onViewChange("summary")}
          >
            ملخص
          </button>
          <button
            className="report-tab"
            style={{
              background:
                reportView === "details"
                  ? "linear-gradient(135deg,var(--p3),var(--p2))"
                  : "#EEF6FF",
              color: reportView === "details" ? "white" : "var(--p3)",
            }}
            onClick={() => onViewChange("details")}
          >
            تفاصيل السجلات
          </button>
        </div>
        <button className="btn-add" onClick={onPrintReport}>
          <AppIcon token="🖨️" size={14} /> طباعة التقرير
        </button>
      </div>

      {reportView === "summary" && (
        <>
          {reportLoading ? (
            <div className="spin" />
          ) : reportSummary.length === 0 ? (
            <div className="empty">لا توجد محاضرات مسجلة</div>
          ) : (
            reportSummary.map((t) => (
              <div className="report-card" key={t.teacher_id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div className="report-name">{t.full_name}</div>
                    <div className="report-sub">
                      {t.subject || "—"} • {teachers.find((teacher) => teacher.id === t.teacher_id)?.job_title || ""}
                    </div>
                    <div style={{ marginTop: ".4rem" }}>
                      {Object.entries(t.byGrade).map(([grade, count]: [string, any]) => (
                        <span key={grade} className="grade-badge">
                          {grade}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: ".75rem", color: "var(--gray)", marginBottom: ".2rem" }}>
                      عدد المحاضرات: <strong>{t.lectureCount}</strong>
                    </div>
                    <div className="report-amount">د.ع {formatNumber(t.lectureTotal)}</div>
                  </div>
                </div>
              </div>
            ))
          )}
          {reportSummary.length > 0 && (
            <div
              style={{
                background: "linear-gradient(135deg,var(--p3),var(--p2))",
                borderRadius: 13,
                padding: "1rem 1.4rem",
                color: "white",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: ".5rem",
              }}
            >
              <span style={{ fontWeight: 700 }}>
                إجمالي جميع المحاضرات: {reportTotals.lectureCount}
              </span>
              <span style={{ fontSize: "1.1rem", fontWeight: 900 }}>
                د.ع {formatNumber(reportTotals.total)}
              </span>
            </div>
          )}
        </>
      )}

      {reportView === "details" && (
        <>
          <div style={{ marginBottom: ".8rem" }}>
            <select
              className="month-pick"
              value={reportTeacher}
              onChange={(e) => onTeacherChange(e.target.value)}
            >
              <option value="">كل الأساتذة</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </select>
          </div>
          <div className="tbl-wrap">
            {reportLoading ? (
              <div className="spin" />
            ) : (() => {
              const filtered = reportTeacher
                ? dailyLectures.filter((l) => l.teacher_id === reportTeacher)
                : dailyLectures;
              return filtered.length === 0 ? (
                <div className="empty">لا توجد سجلات</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>التاريخ</th>
                      <th>الصف</th>
                      <th>الشعبة</th>
                      <th>الدرس</th>
                      <th>النوع</th>
                      <th>السعر</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((l, i) => (
                      <tr key={l.id}>
                        <td style={{ color: "var(--gray)", fontSize: ".7rem" }}>{i + 1}</td>
                        <td>{l.lecture_date}</td>
                        <td style={{ fontWeight: 600 }}>{l.grade}</td>
                        <td>({l.section})</td>
                        <td>الدرس {l.period}</td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              background: l.session_type === "morning" ? "#DBEAFE" : "#FEF3C7",
                              color: l.session_type === "morning" ? "#1E40AF" : "#92400E",
                            }}
                          >
                            {l.session_type === "morning" ? "صباحي" : "ظهري"}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: "var(--p3)" }}>
                          د.ع {formatNumber(l.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>
        </>
      )}
    </>
  );
}
