"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "@/lib/icons";

const DAY_LABELS: Record<string, string> = {
  saturday: "السبت",
  sunday: "الأحد",
  monday: "الاثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
  friday: "الجمعة",
};

type Props = {
  open: boolean;
  day: string;
  period: string | number;
  initialSubject: string;
  initialTeacher: string;
  subjects: string[];
  teachers: string[];
  onSave: (subject: string, teacher: string) => void;
  onClear: () => void;
  onClose: () => void;
};

export function ScheduleCellModal({
  open,
  day,
  period,
  initialSubject,
  initialTeacher,
  subjects,
  teachers,
  onSave,
  onClear,
  onClose,
}: Props) {
  const [subject, setSubject] = useState(initialSubject);
  const [teacher, setTeacher] = useState(initialTeacher);
  // Track if subject is a free-text value not in the list
  const [subjectCustom, setSubjectCustom] = useState(false);
  const subjectInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSubject(initialSubject);
      setTeacher(initialTeacher);
      // If current subject not in list, show custom text input
      setSubjectCustom(!!initialSubject && subjects.length > 0 && !subjects.includes(initialSubject));
    }
  }, [open, initialSubject, initialTeacher, subjects]);

  if (!open) return null;

  const handleSave = () => {
    if (!subject.trim()) return;
    onSave(subject.trim(), teacher.trim());
    onClose();
  };

  const handleClear = () => {
    onClear();
    onClose();
  };

  const selectStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box" as const,
    padding: "10px 14px", borderRadius: 12,
    border: "1.5px solid var(--border-strong)",
    background: "var(--surface-soft)",
    color: "var(--text-primary)",
    fontSize: 14, fontWeight: 600, outline: "none",
    direction: "rtl", transition: "border-color 0.15s, box-shadow 0.15s",
    cursor: "pointer",
    appearance: "none" as const,
  };

  const inputStyle: React.CSSProperties = {
    ...selectStyle,
    cursor: "text",
    appearance: undefined,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full"
        style={{
          maxWidth: 400,
          background: "var(--surface-strong)",
          borderRadius: "var(--radius-modal)",
          boxShadow: "var(--shadow-xl)",
          border: "1px solid var(--border)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
          background: "linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 70%, #000) 100%)",
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>
              تعديل الحصة
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", fontWeight: 600, marginTop: 2 }}>
              {DAY_LABELS[day] ?? day}{period ? ` — ${period}` : ""}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 8, width: 30, height: 30,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "rgba(255,255,255,0.8)",
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Subject */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={{
                fontSize: 11, fontWeight: 800,
                color: "var(--text-secondary)", letterSpacing: "0.05em",
              }}>
                المادة <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              {subjects.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSubjectCustom((v) => !v);
                    if (subjectCustom) setSubject("");
                    else setTimeout(() => subjectInputRef.current?.focus(), 50);
                  }}
                  style={{
                    fontSize: 10, fontWeight: 700, color: "var(--primary)",
                    background: "none", border: "none", cursor: "pointer", padding: 0,
                    textDecoration: "underline",
                  }}
                >
                  {subjectCustom ? "اختر من القائمة" : "كتابة يدوية"}
                </button>
              )}
            </div>

            {subjects.length === 0 || subjectCustom ? (
              <div style={{ position: "relative" }}>
                <input
                  ref={subjectInputRef}
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="اسم المادة..."
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = "var(--primary)"; e.target.style.boxShadow = "0 0 0 3px var(--focus-ring)"; }}
                  onBlur={e => { e.target.style.borderColor = "var(--border-strong)"; e.target.style.boxShadow = "none"; }}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                />
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  style={selectStyle}
                  onFocus={e => { (e.target as HTMLSelectElement).style.borderColor = "var(--primary)"; (e.target as HTMLSelectElement).style.boxShadow = "0 0 0 3px var(--focus-ring)"; }}
                  onBlur={e => { (e.target as HTMLSelectElement).style.borderColor = "var(--border-strong)"; (e.target as HTMLSelectElement).style.boxShadow = "none"; }}
                >
                  <option value="">— اختر المادة —</option>
                  {subjects.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {/* Custom chevron */}
                <span style={{
                  position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                  pointerEvents: "none", color: "var(--text-muted)",
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </div>
            )}
          </div>

          {/* Teacher */}
          <div>
            <label style={{
              display: "block", fontSize: 11, fontWeight: 800,
              color: "var(--text-secondary)", marginBottom: 6, letterSpacing: "0.05em",
            }}>
              المعلم
            </label>

            {teachers.length === 0 ? (
              <input
                type="text"
                value={teacher}
                onChange={(e) => setTeacher(e.target.value)}
                placeholder="اسم المعلم (اختياري)..."
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = "var(--primary)"; e.target.style.boxShadow = "0 0 0 3px var(--focus-ring)"; }}
                onBlur={e => { e.target.style.borderColor = "var(--border-strong)"; e.target.style.boxShadow = "none"; }}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            ) : (
              <div style={{ position: "relative" }}>
                <select
                  value={teacher}
                  onChange={(e) => setTeacher(e.target.value)}
                  style={selectStyle}
                  onFocus={e => { (e.target as HTMLSelectElement).style.borderColor = "var(--primary)"; (e.target as HTMLSelectElement).style.boxShadow = "0 0 0 3px var(--focus-ring)"; }}
                  onBlur={e => { (e.target as HTMLSelectElement).style.borderColor = "var(--border-strong)"; (e.target as HTMLSelectElement).style.boxShadow = "none"; }}
                >
                  <option value="">— اختر المعلم (اختياري) —</option>
                  {teachers.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <span style={{
                  position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                  pointerEvents: "none", color: "var(--text-muted)",
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", gap: 8, padding: "14px 20px",
          borderTop: "1px solid var(--border)",
          background: "var(--surface-soft)",
        }}>
          <button
            onClick={handleSave}
            disabled={!subject.trim()}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 12, border: "none",
              fontSize: 13, fontWeight: 800,
              cursor: subject.trim() ? "pointer" : "not-allowed",
              background: subject.trim() ? "var(--primary)" : "var(--surface-muted)",
              color: subject.trim() ? "#fff" : "var(--text-muted)",
              opacity: subject.trim() ? 1 : 0.6,
              boxShadow: subject.trim() ? "var(--shadow-primary)" : "none",
              transition: "all 0.15s",
            }}
          >
            حفظ
          </button>
          <button
            onClick={handleClear}
            style={{
              padding: "10px 16px", borderRadius: 12, border: "1px solid rgba(239,68,68,0.2)",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              background: "rgba(239,68,68,0.07)", color: "var(--danger)",
              transition: "all 0.15s",
            }}
          >
            مسح
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "10px 16px", borderRadius: 12,
              border: "1px solid var(--border)",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              background: "var(--surface-muted)", color: "var(--text-secondary)",
              transition: "all 0.15s",
            }}
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
