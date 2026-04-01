"use client";

import { AppIcon } from "@/components/AppIcon";
import type { ClassItem } from "../_types";

interface SettingsSectionProps {
  classes: ClassItem[];
  onExport: () => void;
}

export function SettingsSection({ classes, onExport }: SettingsSectionProps) {
  const gradeOptions = Array.from(new Set(classes.map((c) => c.grade))) as string[];

  return (
    <>
      <div className="settings-card">
        <div className="settings-title">أيام العطل الأسبوعية</div>
        <div style={{ fontSize: ".8rem", color: "var(--gray)", marginBottom: ".8rem" }}>
          حدد الصف ثم اختر أيام العطل الخاصة به.
        </div>
        <select className="fis" style={{ marginBottom: "1rem" }}>
          <option value="">اختر الصف...</option>
          {gradeOptions.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      <div className="settings-card">
        <div className="settings-title">نسخ احتياطي</div>
        <button className="btn-success" style={{ marginBottom: ".5rem" }} onClick={onExport}>
          <AppIcon token="⬆️" size={13} /> احتياطية
        </button>
        <button className="btn-warning" onClick={onExport}>
          <AppIcon token="⬇️" size={13} /> من السحابة
        </button>
      </div>

      <div className="settings-card">
        <div className="settings-title">نقل البيانات يدوياً (ملف)</div>
        <div style={{ display: "flex", gap: ".7rem" }}>
          <button className="btn-add" style={{ flex: 1 }} onClick={onExport}>
            <AppIcon token="📤" size={14} />تصدير ملف
          </button>
          <button className="btn-export" style={{ flex: 1 }}>
            <AppIcon token="📥" size={14} />استيراد ملف
          </button>
        </div>
      </div>
    </>
  );
}
