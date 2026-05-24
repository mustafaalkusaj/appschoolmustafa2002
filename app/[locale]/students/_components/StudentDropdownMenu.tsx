"use client";

import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AppIcon } from "@/components/AppIcon";
import { cn } from "@/lib/brand/brand-utils";
import {
  slideDownVariants,
  containerVariants,
  itemVariants,
  usePrefersReducedMotion,
  getVariants,
} from "@/lib/motion-variants";
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
  const reduced = usePrefersReducedMotion();
  const isOpen = !!activeMenu && !!selectedStudent;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          data-student-dropdown-menu
          variants={getVariants(reduced, slideDownVariants)}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={cn(
            "fixed z-[var(--z-dropdown)]",
            "min-w-[200px]",
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
          {/* Student header */}
          <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface-soft)]">
            <p className="text-sm font-black text-[var(--text-primary)] leading-tight truncate">
              {selectedStudent!.full_name}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              {selectedStudent!.class_name}
              {selectedStudent!.section ? ` · ${selectedStudent!.section}` : ""}
            </p>
          </div>

          {/* Actions */}
          <motion.div
            variants={getVariants(reduced, containerVariants(0.05))}
            initial="hidden"
            animate="visible"
          >
            {getActions(selectedStudent!).map((a, i) =>
              "sep" in a ? (
                <motion.div
                  key={i}
                  variants={getVariants(reduced, itemVariants)}
                  className="h-px bg-[var(--border)]"
                />
              ) : (
                <motion.button
                  key={i}
                  type="button"
                  data-student-dropdown-action
                  variants={getVariants(reduced, itemVariants)}
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
                </motion.button>
              )
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : null;
}
