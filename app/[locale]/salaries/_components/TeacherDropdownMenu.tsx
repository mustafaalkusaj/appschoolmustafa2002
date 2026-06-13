"use client";

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
  const reduced = usePrefersReducedMotion();

  return (
    <AnimatePresence>
      {show && teacher && (
        <motion.div
          variants={getVariants(reduced, slideDownVariants)}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={cn(
            "fixed z-[9999] min-w-[180px]",
            "rounded-2xl",
            "bg-[var(--card-bg)]",
            "border border-[var(--border)]",
            "shadow-xl shadow-[var(--shadow-color,rgba(0,0,0,0.1))]",
            "overflow-hidden"
          )}
          style={{ top: position.top, left: position.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
            variants={getVariants(reduced, containerVariants(0.05))}
            initial="hidden"
            animate="visible"
          >
            <motion.button
              variants={getVariants(reduced, itemVariants)}
              onClick={() => { onShowDetail(); onClose(); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3",
                "text-sm font-semibold text-[var(--text-primary)]",
                "hover:bg-[var(--surface-soft)]",
                "transition-colors"
              )}
            >
              <AppIcon token="📋" size={14} />
              التفاصيل
            </motion.button>
            <motion.button
              variants={getVariants(reduced, itemVariants)}
              onClick={() => { onPaySalary(); onClose(); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3",
                "text-sm font-semibold text-[var(--text-primary)]",
                "hover:bg-[var(--surface-soft)]",
                "transition-colors"
              )}
            >
              <AppIcon token="💰" size={14} />
              دفع الراتب
            </motion.button>
            <motion.button
              variants={getVariants(reduced, itemVariants)}
              onClick={() => { onEdit(); onClose(); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3",
                "text-sm font-semibold text-[var(--text-primary)]",
                "hover:bg-[var(--surface-soft)]",
                "transition-colors"
              )}
            >
              <AppIcon token="✏️" size={14} />
              تعديل البيانات
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
