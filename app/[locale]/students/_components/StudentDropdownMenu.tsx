"use client";

import { AppIcon } from "@/components/AppIcon";
import { cn } from "@/lib/brand/brand-utils";
import type { StudentWithFees, StudentActionItem } from "../_types";

interface StudentDropdownMenuProps {
  activeMenu: string | null;
  selectedStudent: StudentWithFees | null;
  menuPos: { top: number; left: number };
  getActions: (s: StudentWithFees) => StudentActionItem[];
}

export function StudentDropdownMenu({
  activeMenu,
  selectedStudent,
  menuPos,
  getActions,
}: StudentDropdownMenuProps) {
  if (!activeMenu || !selectedStudent) return null;

  return (
    <div
      className={cn(
        "fixed z-[var(--z-dropdown)]",
        "min-w-[180px]",
        "rounded-[var(--radius-lg)]",
        "bg-[var(--card-bg)]",
        "border border-[var(--card-border)]",
        "shadow-lg",
        "overflow-hidden"
      )}
      style={{ top: menuPos.top, left: menuPos.left }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {getActions(selectedStudent).map((a, i) =>
        "sep" in a ? (
          <div key={i} className="h-px bg-[var(--border)]" />
        ) : (
          <button
            key={i}
            type="button"
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-start",
              "transition-colors",
              a.danger
                ? "text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)]"
                : "text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
            )}
            onClick={a.fn}
          >
            <AppIcon token={a.icon} size={14} />
            {a.label}
          </button>
        )
      )}
    </div>
  );
}
