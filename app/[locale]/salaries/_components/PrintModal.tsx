"use client";

import { AppIcon } from "@/components/AppIcon";
import type { Teacher } from "../_types";

interface PrintModalProps {
  show: boolean;
  teachers: Teacher[];
  printTeacher: string;
  onClose: () => void;
  onTeacherChange: (id: string) => void;
  onPrintReport: (teacherId: string) => void;
  onPrintAll: () => void;
}

export function PrintModal({
  show,
  teachers,
  printTeacher,
  onClose,
  onTeacherChange,
  onPrintReport,
  onPrintAll,
}: PrintModalProps) {
  if (!show) return null;

  return (
    <div className="overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="modal modal-sm">
        <div className="mh">
          <div className="mt" style={{ display: "flex", alignItems: "center", gap: ".35rem" }}>
            <AppIcon token="🖨️" size={16} />
            خيارات الطباعة
          </div>
          <button className="mc" onClick={onClose}>
            <AppIcon token="✕" size={14} />
          </button>
        </div>
        <div className="print-card">
          <div
            className="print-card-title"
            style={{ display: "flex", alignItems: "center", gap: ".35rem" }}
          >
            <AppIcon token="👤" size={14} />
            تقرير أستاذ مفصل
          </div>
          <div className="print-card-desc">
            اختر الأستاذ لطباعة تقرير كامل بجميع محاضراته.
          </div>
          <select
            className="fis"
            value={printTeacher}
            onChange={(e) => onTeacherChange(e.target.value)}
            style={{ marginBottom: ".7rem" }}
          >
            <option value="">اختر الأستاذ...</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.full_name}</option>
            ))}
          </select>
          <button
            style={{
              padding: ".6rem 1rem",
              background: "linear-gradient(135deg,#06B6D4,#0891B2)",
              color: "white",
              border: "none",
              borderRadius: 9,
              fontFamily: "var(--font-manrope),Segoe UI,sans-serif",
              fontSize: ".82rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: ".35rem",
            }}
            onClick={() => printTeacher && onPrintReport(printTeacher)}
          >
            <AppIcon token="🖨️" size={13} className="text-white" />
            طباعة
          </button>
        </div>
        <div className="print-card">
          <div
            className="print-card-title"
            style={{ display: "flex", alignItems: "center", gap: ".35rem" }}
          >
            <AppIcon token="👥" size={14} />
            تقرير شامل
          </div>
          <div className="print-card-desc">تقرير لجميع الأساتذة.</div>
          <button
            style={{
              width: "100%",
              padding: ".7rem",
              background: "#1F2937",
              color: "white",
              border: "none",
              borderRadius: 9,
              fontFamily: "var(--font-manrope),Segoe UI,sans-serif",
              fontSize: ".85rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: ".35rem",
            }}
            onClick={onPrintAll}
          >
            <AppIcon token="☰" size={13} className="text-white" />
            طباعة التقرير الشامل
          </button>
        </div>
        <div className="fa">
          <button className="bc" onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}
