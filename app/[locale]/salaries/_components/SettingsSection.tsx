"use client";

import { AppIcon } from "@/components/AppIcon";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { ClassItem } from "../_types";

interface SettingsSectionProps {
  classes: ClassItem[];
  onExport: () => void;
}

export function SettingsSection({ classes, onExport }: SettingsSectionProps) {
  const gradeOptions = Array.from(new Set(classes.map((c) => c.grade))) as string[];

  return (
    <div className="space-y-4">
      {/* Weekend Settings */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
        <div className="text-sm font-bold text-[var(--text-primary)] mb-2">
          أيام العطل الأسبوعية
        </div>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          حدد الصف ثم اختر أيام العطل الخاصة به.
        </p>
        <Select>
          <option value="">اختر الصف...</option>
          {gradeOptions.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </Select>
      </div>

      {/* Backup Settings */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6 space-y-3">
        <div className="text-sm font-bold text-[var(--text-primary)]">
          نسخ احتياطي
        </div>
        <Button className="w-full bg-[var(--success)] text-white hover:brightness-110" onClick={onExport}>
          <AppIcon token="⬆️" size={13} />
          احتياطية
        </Button>
        <Button className="w-full bg-[var(--warning)] text-white hover:brightness-110" onClick={onExport}>
          <AppIcon token="⬇️" size={13} />
          من السحابة
        </Button>
      </div>

      {/* Manual Transfer */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
        <div className="text-sm font-bold text-[var(--text-primary)] mb-4">
          نقل البيانات يدوياً (ملف)
        </div>
        <div className="flex flex-wrap gap-3">
          <Button className="flex-1" onClick={onExport}>
            <AppIcon token="📤" size={14} />
            تصدير ملف
          </Button>
          <Button variant="secondary" className="flex-1" disabled title="الميزة قيد التطوير">
            <AppIcon token="📥" size={14} />
            استيراد ملف
          </Button>
        </div>
      </div>
    </div>
  );
}
