"use client";

import { AppIcon } from "@/components/AppIcon";
import type { Subject, JobTitle, ClassItem } from "../_types";

interface ManagerModalsProps {
  // Subjects
  showSubjectsMgr: boolean;
  subjectsList: Subject[];
  newSubject: string;
  onCloseSubjects: () => void;
  onNewSubjectChange: (val: string) => void;
  onAddSubject: () => void;
  onDeleteSubject: (id: string) => void;
  // Job Titles
  showJobTitlesMgr: boolean;
  jobTitlesList: JobTitle[];
  newJobTitle: string;
  onCloseJobTitles: () => void;
  onNewJobTitleChange: (val: string) => void;
  onAddJobTitle: () => void;
  onDeleteJobTitle: (id: string) => void;
  // Classes
  showClassesMgr: boolean;
  classes: ClassItem[];
  newGrade: string;
  newSection: string;
  newSectionGrade: string;
  onCloseClasses: () => void;
  onNewGradeChange: (val: string) => void;
  onNewSectionChange: (val: string) => void;
  onNewSectionGradeChange: (val: string) => void;
  onAddClass: () => void;
  onAddSection: () => void;
  onDeleteClass: (id: string) => void;
}

export function ManagerModals({
  showSubjectsMgr,
  subjectsList,
  newSubject,
  onCloseSubjects,
  onNewSubjectChange,
  onAddSubject,
  onDeleteSubject,
  showJobTitlesMgr,
  jobTitlesList,
  newJobTitle,
  onCloseJobTitles,
  onNewJobTitleChange,
  onAddJobTitle,
  onDeleteJobTitle,
  showClassesMgr,
  classes,
  newGrade,
  newSection,
  newSectionGrade,
  onCloseClasses,
  onNewGradeChange,
  onNewSectionChange,
  onNewSectionGradeChange,
  onAddClass,
  onAddSection,
  onDeleteClass,
}: ManagerModalsProps) {
  const gradeOptions = Array.from(new Set(classes.map((c) => c.grade))) as string[];

  return (
    <>
      {/* Subjects Manager */}
      {showSubjectsMgr && (
        <div className="overlay" onClick={(e) => {
          if (e.target === e.currentTarget) onCloseSubjects();
        }}>
          <div className="modal modal-sm">
            <div className="mh">
              <div className="mt">المواد الدراسية</div>
              <button className="mc" onClick={onCloseSubjects}>
                <AppIcon token="✕" size={12} />
              </button>
            </div>
            <div style={{ display: "flex", gap: ".6rem", marginBottom: "1rem" }}>
              <input
                className="fis"
                placeholder="اسم المادة"
                value={newSubject}
                onChange={(e) => onNewSubjectChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onAddSubject()}
                style={{ flex: 1 }}
              />
              <button
                className="bs"
                style={{ padding: ".6rem 1rem", flex: "none", width: "auto" }}
                onClick={onAddSubject}
              >
                + إضافة
              </button>
            </div>
            <div
              style={{
                background: "#F7FBFF",
                borderRadius: 12,
                padding: "1rem",
                maxHeight: 320,
                overflowY: "auto",
              }}
            >
              {subjectsList.map((s) => (
                <div key={s.id} className="mgr-item">
                  <span style={{ fontSize: ".85rem", fontWeight: 600 }}>{s.name}</span>
                  <button onClick={() => onDeleteSubject(s.id)} className="btn-del-item">
                    <AppIcon token="🗑️" size={12} />
                  </button>
                </div>
              ))}
            </div>
            <div className="fa">
              <button className="bc" onClick={onCloseSubjects}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* Job Titles Manager */}
      {showJobTitlesMgr && (
        <div className="overlay" onClick={(e) => {
          if (e.target === e.currentTarget) onCloseJobTitles();
        }}>
          <div className="modal modal-sm">
            <div className="mh">
              <div className="mt">المسميات الوظيفية</div>
              <button className="mc" onClick={onCloseJobTitles}>
                <AppIcon token="✕" size={12} />
              </button>
            </div>
            <div style={{ display: "flex", gap: ".6rem", marginBottom: "1rem" }}>
              <input
                className="fis"
                placeholder="اسم المسمى"
                value={newJobTitle}
                onChange={(e) => onNewJobTitleChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onAddJobTitle()}
                style={{ flex: 1 }}
              />
              <button
                className="bs"
                style={{ padding: ".6rem 1rem", flex: "none", width: "auto" }}
                onClick={onAddJobTitle}
              >
                + إضافة
              </button>
            </div>
            <div
              style={{
                background: "#F7FBFF",
                borderRadius: 12,
                padding: "1rem",
                maxHeight: 320,
                overflowY: "auto",
              }}
            >
              {jobTitlesList.map((j) => (
                <div key={j.id} className="mgr-item">
                  <span style={{ fontSize: ".85rem", fontWeight: 600 }}>{j.name}</span>
                  <button onClick={() => onDeleteJobTitle(j.id)} className="btn-del-item">
                    <AppIcon token="🗑️" size={12} />
                  </button>
                </div>
              ))}
            </div>
            <div className="fa">
              <button className="bc" onClick={onCloseJobTitles}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* Classes Manager */}
      {showClassesMgr && (
        <div className="overlay" onClick={(e) => {
          if (e.target === e.currentTarget) onCloseClasses();
        }}>
          <div className="modal modal-lg">
            <div className="mh">
              <div className="mt">إدارة الصفوف والشعب</div>
              <button className="mc" onClick={onCloseClasses}>
                <AppIcon token="✕" size={12} />
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div style={{ background: "#F7FBFF", borderRadius: 12, padding: "1rem" }}>
                <div
                  style={{
                    fontSize: ".82rem",
                    fontWeight: 800,
                    color: "var(--p2)",
                    marginBottom: ".7rem",
                  }}
                >
                  إضافة صف جديد
                </div>
                <input
                  className="fis"
                  placeholder="اسم الصف"
                  value={newGrade}
                  onChange={(e) => onNewGradeChange(e.target.value)}
                  style={{ marginBottom: ".5rem" }}
                />
                <button className="bs" style={{ padding: ".6rem", width: "100%" }} onClick={onAddClass}>
                  إضافة صف
                </button>
              </div>
              <div
                style={{
                  background: "#F0FDF4",
                  borderRadius: 12,
                  padding: "1rem",
                  border: "1px solid #D1FAE5",
                }}
              >
                <div
                  style={{
                    fontSize: ".82rem",
                    fontWeight: 800,
                    color: "#065F46",
                    marginBottom: ".7rem",
                  }}
                >
                  إضافة شعبة
                </div>
                <select
                  className="fis"
                  value={newSectionGrade}
                  onChange={(e) => onNewSectionGradeChange(e.target.value)}
                  style={{ marginBottom: ".5rem" }}
                >
                  <option value="">اختر الصف...</option>
                  {gradeOptions.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <input
                  className="fis"
                  placeholder="اسم الشعبة"
                  value={newSection}
                  onChange={(e) => onNewSectionChange(e.target.value)}
                  style={{ marginBottom: ".5rem" }}
                />
                <button
                  onClick={onAddSection}
                  style={{
                    width: "100%",
                    padding: ".6rem",
                    background: "linear-gradient(135deg,#10B981,#059669)",
                    color: "white",
                    border: "none",
                    borderRadius: 9,
                    fontFamily: "var(--font-manrope),Segoe UI,sans-serif",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  إضافة شعبة
                </button>
              </div>
            </div>
            <div
              style={{
                background: "#F7FBFF",
                borderRadius: 12,
                padding: "1rem",
                maxHeight: 300,
                overflowY: "auto",
              }}
            >
              {gradeOptions.map((grade) => (
                <div
                  key={grade}
                  style={{
                    marginBottom: ".6rem",
                    borderBottom: "1px solid rgba(79,140,255,0.08)",
                    paddingBottom: ".6rem",
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: ".85rem", marginBottom: ".4rem" }}>
                    {grade}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: ".3rem" }}>
                    {classes
                      .filter((c) => c.grade === grade)
                      .map((c) => (
                        <span
                          key={c.id}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: ".3rem",
                            background: "#EDF6FF",
                            color: "var(--p3)",
                            padding: ".2rem .6rem",
                            borderRadius: 20,
                            fontSize: ".75rem",
                            fontWeight: 700,
                          }}
                        >
                          {c.section}
                          <button
                            onClick={() => onDeleteClass(c.id)}
                            style={{
                              background: "#EF4444",
                              color: "white",
                              border: "none",
                              borderRadius: "50%",
                              width: 14,
                              height: 14,
                              cursor: "pointer",
                              fontSize: ".6rem",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <AppIcon token="✕" size={12} />
                          </button>
                        </span>
                      ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="fa">
              <button className="bc" onClick={onCloseClasses}>إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
