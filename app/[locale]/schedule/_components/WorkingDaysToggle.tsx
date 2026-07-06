"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/brand/brand-utils";
import { Save, Loader2 } from "@/lib/icons";

type WorkingDay = {
  day_key: string;
  name_ar: string;
  day_order: number;
  is_active: boolean;
};

interface WorkingDaysToggleProps {
  workingDays: WorkingDay[];
  canEdit: boolean;
  onToggle: (dayKey: string) => void;
  onSave: () => void;
  saving: boolean;
}

export function WorkingDaysToggle({
  workingDays,
  canEdit,
  onToggle,
  onSave,
  saving,
}: WorkingDaysToggleProps) {
  const sorted = useMemo(
    () => [...workingDays].sort((a, b) => a.day_order - b.day_order),
    [workingDays],
  );

  /* Track the initial active-state snapshot to detect dirty */
  const [initialSnapshot] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(workingDays.map((d) => [d.day_key, d.is_active])),
  );

  const isDirty = useMemo(
    () => sorted.some((d) => initialSnapshot[d.day_key] !== d.is_active),
    [sorted, initialSnapshot],
  );

  const handleToggle = useCallback(
    (dayKey: string) => {
      if (canEdit) onToggle(dayKey);
    },
    [canEdit, onToggle],
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Label */}
      <span
        className="me-1 text-[10px] font-black uppercase tracking-widest"
        style={{ color: "var(--text-muted, var(--muted-foreground))" }}
      >
        أيام الدوام
      </span>

      {/* Day pills */}
      {sorted.map((day) => {
        const isActive = day.is_active;

        return (
          <motion.button
            key={day.day_key}
            type="button"
            layout
            onClick={() => handleToggle(day.day_key)}
            disabled={!canEdit}
            whileTap={canEdit ? { scale: 0.93 } : undefined}
            animate={{
              scale: isActive ? 1 : 0.95,
              opacity: isActive ? 1 : 0.65,
            }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={cn(
              "relative h-9 rounded-xl border px-4 text-xs font-black",
              "transition-colors duration-150",
              isActive
                ? "border-[var(--primary)]/30 text-white"
                : "border-[var(--border)] bg-transparent",
              canEdit && "cursor-pointer",
              !canEdit && "cursor-default",
            )}
            style={
              isActive
                ? {
                    background:
                      "linear-gradient(135deg, var(--primary), #818cf8)",
                    boxShadow: "0 2px 8px rgba(99,102,241,0.3)",
                    color: "#fff",
                  }
                : {
                    color: "var(--text-muted, var(--muted-foreground))",
                  }
            }
          >
            {/* Active indicator dot */}
            {isActive && (
              <motion.span
                layoutId="active-day-dot"
                className="absolute -top-1 start-1/2 h-1.5 w-1.5 rounded-full"
                style={{
                  background: "#fff",
                  transform: "translateX(-50%)",
                  boxShadow: "0 1px 4px rgba(255,255,255,0.5)",
                }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              />
            )}
            {day.name_ar}
          </motion.button>
        );
      })}

      {/* Save button — only visible when changes exist */}
      {canEdit && isDirty && (
        <motion.button
          type="button"
          onClick={onSave}
          disabled={saving}
          initial={{ opacity: 0, scale: 0.9, x: -8 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.9, x: -8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "ms-auto inline-flex h-9 items-center gap-1.5 rounded-xl border px-3.5",
            "text-[10px] font-black uppercase tracking-wider",
            "transition-all",
            "disabled:opacity-50",
          )}
          style={{
            borderColor: "var(--border)",
            color: saving
              ? "var(--primary)"
              : "var(--text-muted, var(--muted-foreground))",
            background: "transparent",
          }}
        >
          {saving ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Save size={12} />
          )}
          حفظ الأيام
        </motion.button>
      )}
    </div>
  );
}

export default WorkingDaysToggle;
