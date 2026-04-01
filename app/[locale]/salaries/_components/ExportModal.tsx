"use client";

import { AppIcon } from "@/components/AppIcon";
import type { ExportOptions } from "../_types";

interface ExportModalProps {
  show: boolean;
  exportOptions: ExportOptions;
  onClose: () => void;
  onOptionsChange: (options: ExportOptions) => void;
  onExport: () => void;
}

export function ExportModal({
  show,
  exportOptions,
  onClose,
  onOptionsChange,
  onExport,
}: ExportModalProps) {
  if (!show) return null;

  const exportItems: [keyof ExportOptions, string, string][] = [
    ["teachers", "👨‍🏫", "بيانات الأساتذة"],
    ["subjects", "📚", "المواد الدراسية"],
    ["classes", "🏫", "الصفوف والشعب"],
    ["prices", "🏷️", "أسعار المحاضرات"],
    ["fixed_salaries", "💰", "الرواتب الثابتة"],
    ["lectures", "📋", "سجل المحاضرات"],
    ["lesson_times", "⏰", "توقيتات الدروس"],
  ];

  return (
    <div className="overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="modal modal-sm">
        <div className="mh">
          <div className="mt" style={{ display: "flex", alignItems: "center", gap: ".35rem" }}>
            <AppIcon token="📤" size={16} />
            خيارات التصدير
          </div>
          <button className="mc" onClick={onClose}>
            <AppIcon token="✕" size={14} />
          </button>
        </div>
        <button
          style={{
            width: "100%",
            padding: ".7rem",
            background: "linear-gradient(135deg,#F59E0B,#D97706)",
            color: "white",
            border: "none",
            borderRadius: 10,
            fontFamily: "var(--font-manrope),Segoe UI,sans-serif",
            fontSize: ".85rem",
            fontWeight: 800,
            cursor: "pointer",
            marginBottom: ".8rem",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: ".35rem",
          }}
          onClick={() =>
            onOptionsChange({
              lesson_times: true,
              classes: true,
              prices: true,
              teachers: true,
              subjects: true,
              fixed_salaries: true,
              lectures: true,
            })
          }
        >
          <AppIcon token="💾" size={14} />
          تصدير كامل النظام
        </button>
        {exportItems.map(([key, icon, label]) => (
          <div
            key={key}
            className={`exp-item${exportOptions[key] ? " selected" : ""}`}
            onClick={() => onOptionsChange({ ...exportOptions, [key]: !exportOptions[key] })}
          >
            <span
              className="exp-name"
              style={{ display: "inline-flex", alignItems: "center", gap: ".35rem" }}
            >
              <AppIcon token={icon} size={13} /> {label}
            </span>
            <div className={`exp-cb${exportOptions[key] ? " checked" : ""}`}>
              {exportOptions[key] && "✓"}
            </div>
          </div>
        ))}
        <div className="fa">
          <button className="bs" onClick={onExport}>
            <AppIcon token="⬇️" size={14} /> تصدير الآن
          </button>
          <button className="bc" onClick={onClose}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}
