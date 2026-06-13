"use client";

import { cn } from "@/lib/brand/brand-utils";
import { Save } from "@/lib/icons";
import type { WorkingDay } from "../_hooks/useTimeSlotsSettings";

type Props = {
  workingDays: WorkingDay[];
  canEdit: boolean;
  onToggle: (dayKey: string) => void;
  onSave: () => void;
  saving: boolean;
};

export function WorkingDaysToggle({ workingDays, canEdit, onToggle, onSave, saving }: Props) {
  if (workingDays.length === 0) return null;

  const sorted = [...workingDays].sort((a, b) => a.day_order - b.day_order);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] shrink-0">
        أيام الدوام
      </span>
      <div className="flex flex-wrap gap-1.5">
        {sorted.map((day) => (
          <button
            key={day.day_key}
            disabled={!canEdit || saving}
            onClick={() => canEdit && onToggle(day.day_key)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-bold transition-all border",
              day.is_active
                ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm"
                : "bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--primary)]/40",
              !canEdit && "cursor-default",
            )}
          >
            {day.name_ar}
          </button>
        ))}
      </div>
      {canEdit && (
        <button
          onClick={onSave}
          disabled={saving}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border",
            saving
              ? "bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border)] opacity-60 cursor-not-allowed"
              : "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30 hover:bg-[var(--success)]/20",
          )}
        >
          <Save size={11} />
          {saving ? "جارٍ الحفظ..." : "حفظ"}
        </button>
      )}
    </div>
  );
}
