"use client";

import { AppIcon } from "@/components/AppIcon";
import { DAYS, PERIODS, type Teacher, type ClassItem } from "../_types";

interface ScheduleSectionProps {
  teachers: Teacher[];
  classes: ClassItem[];
  scheduleGrade: string;
  scheduleSection: string;
  scheduleGrid: Record<string, string>;
  saving: boolean;
  onGradeChange: (grade: string) => void;
  onSectionChange: (section: string) => void;
  onFetchSchedule: (grade: string, section: string) => void;
  onGridChange: (grid: Record<string, string>) => void;
  onSave: () => void;
}

export function ScheduleSection({
  teachers,
  classes,
  scheduleGrade,
  scheduleSection,
  scheduleGrid,
  saving,
  onGradeChange,
  onSectionChange,
  onFetchSchedule,
  onGridChange,
  onSave,
}: ScheduleSectionProps) {
  const gradeOptions = Array.from(new Set(classes.map((c) => c.grade))) as string[];
  const sectionOptions = (grade: string) =>
    classes.filter((c) => c.grade === grade).map((c) => c.section);

  const activeTeachers = teachers.filter((t) => t.status === "active");

  return (
    <>
      <div style={{ display: "flex", gap: ".7rem", marginBottom: "1rem" }}>
        <select
          className="month-pick"
          value={scheduleGrade}
          onChange={(e) => {
            onGradeChange(e.target.value);
            onSectionChange("");
          }}
        >
          <option value="">اختر الصف...</option>
          {gradeOptions.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <select
          className="month-pick"
          value={scheduleSection}
          onChange={(e) => {
            onSectionChange(e.target.value);
            if (scheduleGrade && e.target.value) {
              onFetchSchedule(scheduleGrade, e.target.value);
            }
          }}
        >
          <option value="">اختر الشعبة...</option>
          {sectionOptions(scheduleGrade).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {scheduleGrade && scheduleSection && (
          <button className="btn-add" disabled={saving} onClick={onSave}>
            {saving ? "جارٍ الحفظ..." : (
              <>
                <AppIcon token="💾" size={14} /> حفظ الجدول
              </>
            )}
          </button>
        )}
      </div>

      {scheduleGrade && scheduleSection ? (
        ["morning", "afternoon"].map((sessionType) => (
          <div key={sessionType} style={{ marginBottom: "1rem" }}>
            <div
              className="session-title"
              style={{ display: "flex", alignItems: "center", gap: ".35rem" }}
            >
              <AppIcon token={sessionType === "morning" ? "🌅" : "🌞"} size={14} />
              {sessionType === "morning" ? "الدوام الصباحي" : "الدوام الظهري"}
            </div>
            <div className="tbl-wrap">
              <table className="sch-grid">
                <thead>
                  <tr>
                    <th>اليوم / الدرس</th>
                    {PERIODS.map((p) => (
                      <th key={p}>{p}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day) => (
                    <tr key={day}>
                      <td
                        style={{
                          fontWeight: 700,
                          textAlign: "center",
                          background: "#F7FBFF",
                          padding: ".4rem",
                        }}
                      >
                        {day}
                      </td>
                      {PERIODS.map((p) => (
                        <td key={p}>
                          <select
                            className="sch-sel"
                            value={scheduleGrid[`${day}-${p}-${sessionType}`] || ""}
                            onChange={(e) =>
                              onGridChange({
                                ...scheduleGrid,
                                [`${day}-${p}-${sessionType}`]: e.target.value,
                              })
                            }
                          >
                            <option value="">(فراغ)</option>
                            {activeTeachers.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.full_name.split(" ")[0]}
                              </option>
                            ))}
                          </select>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      ) : (
        <div className="empty">اختر الصف والشعبة لعرض الجدول</div>
      )}
    </>
  );
}
