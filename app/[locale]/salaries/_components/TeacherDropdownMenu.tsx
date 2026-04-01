"use client";

import { AppIcon } from "@/components/AppIcon";
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
      className="dropdown-menu"
      style={{ top: position.top, left: position.left }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="d-item" onClick={() => { onShowDetail(); onClose(); }}>
        <AppIcon token="📋" size={14} />
        التفاصيل
      </div>
      <div className="d-item" onClick={() => { onPaySalary(); onClose(); }}>
        <AppIcon token="💰" size={14} />
        دفع الراتب
      </div>
      <div className="d-item" onClick={() => { onEdit(); onClose(); }}>
        <AppIcon token="✏️" size={14} />
        تعديل البيانات
      </div>
    </div>
  );
}
