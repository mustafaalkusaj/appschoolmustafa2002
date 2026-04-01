"use client";

import { AppIcon } from "@/components/AppIcon";
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
      className="dropdown-menu"
      style={{ top: menuPos.top, left: menuPos.left }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {getActions(selectedStudent).map((a, i) =>
        "sep" in a ? (
          <div key={i} className="d-sep" />
        ) : (
          <div
            key={i}
            className={`d-item${a.danger ? " danger" : ""}`}
            onClick={a.fn}
          >
            <AppIcon token={a.icon} size={14} />
            {a.label}
          </div>
        ),
      )}
    </div>
  );
}
