"use client";

import { AppIcon } from "@/components/AppIcon";
import { PERIODS, type Teacher, type ClassItem, type LecturePrice } from "../_types";

interface DailyLogModalProps {
  show: boolean;
  teachers: Teacher[];
  classes: ClassItem[];
  lecturePrices: LecturePrice[];
  dailyTeacher: string;
  dailyDate: string;
  dailyGrades: string[];
  dailyPeriods: string[];
  saving: boolean;
  onClose: () => void;
  onTeacherChange: (id: string) => void;
  onDateChange: (date: string) => void;
  onGradesChange: (grades: string[]) => void;
  onPeriodsChange: (periods: string[]) => void;
  onSave: () => void;
}

export function DailyLogModal({
  show,
  teachers,
  classes,
  lecturePrices: _lecturePrices,
  dailyTeacher,
  dailyDate,
  dailyGrades,
  dailyPeriods,
  saving,
  onClose,
  onTeacherChange,
  onDateChange,
  onGradesChange,
  onPeriodsChange,
  onSave,
}: DailyLogModalProps) {
  if (!show) return null;

  const gradeOptions = Array.from(new Set(classes.map((c) => c.grade))) as string[];
  const sectionOptions = (grade: string) =>
    classes.filter((c) => c.grade === grade).map((c) => c.section);

  const activeTeachers = teachers.filter((t) => t.status === "active");

  const toggleArr = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  return (
    <div className="overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="modal">
        <div className="mh">
          <div className="mt" style={{ display: "flex", alignItems: "center", gap: ".35rem" }}>
            <AppIcon token="📋" size={16} />
            السجل اليومي
          </div>
          <button className="mc" onClick={onClose}>
            <AppIcon token="✕" size={14} />
          </button>
        </div>
        <div className="fg">
          <div className="ff">
            <label className="fl">الأستاذ</label>
            <select
              className="fis"
              value={dailyTeacher}
              onChange={(e) => onTeacherChange(e.target.value)}
            >
              <option value="">اختر الأستاذ...</option>
              {activeTeachers.map((t) => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </select>
          </div>
          <div className="ff">
            <label className="fl">التاريخ</label>
            <input
              type="date"
              className="fis"
              value={dailyDate}
              onChange={(e) => onDateChange(e.target.value)}
            />
          </div>
          <div className="ff full">
            <label className="fl">الصفوف (يمكن اختيار أكثر من صف)</label>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: ".4rem",
                background: "#F7FBFF",
                padding: ".6rem",
                borderRadius: 9,
                border: "1.5px solid rgba(79,140,255,0.12)",
              }}
            >
              {gradeOptions.map((g) =>
                sectionOptions(g).map((sec) => (
                  <span
                    key={`${g}||${sec}`}
                    onClick={() => onGradesChange(toggleArr(dailyGrades, `${g}||${sec}`))}
                    style={{
                      padding: ".25rem .65rem",
                      borderRadius: 20,
                      fontSize: ".75rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      background: dailyGrades.includes(`${g}||${sec}`) ? "var(--p3)" : "white",
                      color: dailyGrades.includes(`${g}||${sec}`) ? "white" : "var(--dark)",
                      border: "1px solid rgba(79,140,255,0.2)",
                    }}
                  >
                    {g} ({sec})
                  </span>
                ))
              )}
            </div>
          </div>
          <div className="ff full">
            <label className="fl">الحصص</label>
            <div>
              <div style={{ fontSize: ".75rem", fontWeight: 700, color: "#10B981", marginBottom: ".3rem" }}>
                الصباحي
              </div>
              <div className="periods-grid" style={{ marginBottom: ".5rem" }}>
                {PERIODS.map((p) => (
                  <div
                    key={`${p}-morning`}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: ".2rem",
                      cursor: "pointer",
                    }}
                    onClick={() => onPeriodsChange(toggleArr(dailyPeriods, `${p}-morning`))}
                  >
                    <div className={`period-box${dailyPeriods.includes(`${p}-morning`) ? " sel" : ""}`}>
                      {p}
                    </div>
                    <span style={{ fontSize: ".65rem", color: "var(--gray)" }}>درس {p}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: ".75rem", fontWeight: 700, color: "#F59E0B", marginBottom: ".3rem" }}>
                الظهري
              </div>
              <div className="periods-grid">
                {PERIODS.map((p) => (
                  <div
                    key={`${p}-afternoon`}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: ".2rem",
                      cursor: "pointer",
                    }}
                    onClick={() => onPeriodsChange(toggleArr(dailyPeriods, `${p}-afternoon`))}
                  >
                    <div className={`period-box${dailyPeriods.includes(`${p}-afternoon`) ? " sel" : ""}`}>
                      {p}<span style={{ fontSize: ".6rem" }}>(ظ)</span>
                    </div>
                    <span style={{ fontSize: ".65rem", color: "var(--gray)" }}>درس {p}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {dailyTeacher && dailyGrades.length > 0 && dailyPeriods.length > 0 && (
          <div
            style={{
              background: "#EEF6FF",
              borderRadius: 10,
              padding: ".7rem",
              marginTop: ".5rem",
              fontSize: ".8rem",
              fontWeight: 600,
              color: "var(--p2)",
            }}
          >
            سيتم تسجيل: {dailyGrades.length} صف × {dailyPeriods.length} حصة ={" "}
            <strong>{dailyGrades.length * dailyPeriods.length} محاضرة</strong>
          </div>
        )}
        <div className="fa">
          <button
            className="bs"
            disabled={saving || !dailyTeacher || dailyGrades.length === 0 || dailyPeriods.length === 0}
            onClick={onSave}
          >
            {saving ? "جارٍ الحفظ..." : "تسجيل المحاضرات"}
          </button>
          <button className="bc" onClick={onClose}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}
