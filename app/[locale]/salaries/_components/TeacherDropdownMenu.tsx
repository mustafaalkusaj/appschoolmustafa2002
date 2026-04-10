"use client";

import { AppIcon } from "@/components/AppIcon";
import { cn } from "@/lib/brand/brand-utils";
import type { Teacher } from "../_types";

interface TeacherDropdownMenuProps {
  show: boolean;
  teacher: Teacher | null;
  position: { top: number; left: number };
  onShowDetail: () => void;
  onPaySalary: () => void;
  onEdit: () => void;
  onClose: () => void;
}

export function TeacherDropdownMenu({
  show,
  teacher,
  position,
  onShowDetail,
  onPaySalary,
  onEdit,
  onClose,
}: TeacherDropdownMenuProps) {
  if (!show || !teacher) return null;

  return (
    <div
      className={cn(
        "fixed z-[9999] min-w-[180px]",
        "rounded-[var(--card-radius)]",
        "bg-[var(--card-bg)]",
        "border border-[var(--border)]",
        "shadow-xl shadow-[var(--shadow-color,rgba(0,0,0,0.1))]",
        "overflow-hidden",
        "animate-in fade-in-0 zoom-in-95"
      )}
      style={{ top: position.top, left: position.left }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => { onShowDetail(); onClose(); }}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3",
          "text-sm font-semibold text-[var(--text-primary)]",
          "hover:bg-[var(--surface-muted)]",
          "transition-colors"
        )}
      >
        <AppIcon token="📋" size={14} />
        التفاصيل
      </button>
      <button
        onClick={() => { onPaySalary(); onClose(); }}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3",
          "text-sm font-semibold text-[var(--text-primary)]",
          "hover:bg-[var(--surface-muted)]",
          "transition-colors"
        )}
      >
        <AppIcon token="💰" size={14} />
        دفع الراتب
      </button>
      <button
        onClick={() => { onEdit(); onClose(); }}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3",
          "text-sm font-semibold text-[var(--text-primary)]",
          "hover:bg-[var(--surface-muted)]",
          "transition-colors"
        )}
      >
        <AppIcon token="✏️" size={14} />
        تعديل البيانات
      </button>
    </div>
  );
}
