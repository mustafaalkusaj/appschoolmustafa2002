"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/brand/brand-utils";
import { X, Save, Trash2 } from "@/lib/icons";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  day: string;
  period: string;
  initialSubject: string;
  initialTeacher: string;
  onSave: (subject: string, teacher: string) => void;
  onClear: () => void;
  onClose: () => void;
};

export function ScheduleCellModal({
  open,
  day,
  period,
  initialSubject,
  initialTeacher,
  onSave,
  onClear,
  onClose,
}: Props) {
  const [subject, setSubject] = useState(initialSubject);
  const [teacher, setTeacher] = useState(initialTeacher);
  const subjectRef = useRef<HTMLInputElement>(null);

  // Sync state when modal opens with new data
  useEffect(() => {
    if (open) {
      setSubject(initialSubject);
      setTeacher(initialTeacher);
      // Focus subject input after animation
      const timer = setTimeout(() => subjectRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [open, initialSubject, initialTeacher]);

  const handleSave = () => {
    onSave(subject.trim(), teacher.trim());
    onClose();
  };

  const handleClear = () => {
    onClear();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  const inputClasses =
    "w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition-all focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 placeholder:text-[var(--text-muted)]/50";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="cell-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="cell-modal"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden"
              style={{ background: "var(--card-bg)" }}
              dir="rtl"
            >
              {/* Header */}
              <div
                className="flex items-center justify-between p-5 border-b border-[var(--border)]"
                style={{
                  background:
                    "linear-gradient(135deg, color-mix(in srgb, var(--primary) 8%, transparent), transparent)",
                }}
              >
                <div>
                  <h3 className="text-base font-black text-[var(--text-primary)]">
                    تعديل الحصة
                  </h3>
                  <p className="text-xs font-bold text-[var(--text-muted)] mt-0.5">
                    {day} — {period}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-soft)] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                    المادة
                  </label>
                  <input
                    ref={subjectRef}
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="مثال: رياضيات، علوم، لغة عربية"
                    className={inputClasses}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                    المعلم
                  </label>
                  <input
                    type="text"
                    value={teacher}
                    onChange={(e) => setTeacher(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="اسم المعلم (اختياري)"
                    className={inputClasses}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center gap-2 p-5 border-t border-[var(--border)]">
                {(initialSubject || initialTeacher) && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-[var(--danger)]/20 text-sm font-bold text-[var(--danger)] bg-transparent hover:bg-[var(--danger)]/5 transition-colors"
                  >
                    <Trash2 size={14} />
                    مسح
                  </button>
                )}
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 px-4 rounded-xl border border-[var(--border)] text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 h-10 px-5 rounded-xl border-none text-sm font-black text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(135deg, var(--primary), #818cf8)",
                    boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
                  }}
                >
                  <Save size={14} />
                  حفظ
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ScheduleCellModal;
