"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Plus } from "lucide-react";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";

interface GradeTypeAddModalProps {
  show: boolean;
  schoolId: string;
  onClose: () => void;
  onCreated: (gradeType: { id: string; name: string; max_score: number }) => void;
}

const fieldClasses =
  "h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition";

export function GradeTypeAddModal({ show, schoolId, onClose, onCreated }: GradeTypeAddModalProps) {
  const [name, setName] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [passScore, setPassScore] = useState("50");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("اسم النوع مطلوب."); return; }
    const max = parseFloat(maxScore);
    const pass = parseFloat(passScore);
    if (isNaN(max) || max <= 0) { setError("الدرجة الكاملة يجب أن تكون أكبر من 0."); return; }
    if (isNaN(pass) || pass < 0 || pass > max) { setError("درجة النجاح يجب أن تكون بين 0 والدرجة الكاملة."); return; }

    setSaving(true);
    setError("");
    try {
      const { payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; gradeType?: { id: string; name: string; max_score: number }; error?: { message?: string } }>(
        `/api/web/grades/schemes?schoolId=${schoolId}`,
        {
          method: "POST",
          headers: withJsonHeaders(),
          body: JSON.stringify({
            school_id: schoolId,
            name: name.trim(),
            max_score: max,
            pass_score: pass,
          }),
        }
      );
      if (payload?.ok && payload.gradeType) {
        onCreated(payload.gradeType);
        setName("");
        setMaxScore("100");
        setPassScore("50");
        onClose();
      } else {
        setError(payload?.error?.message ?? "تعذر إنشاء نوع الامتحان.");
      }
    } catch {
      setError("حدث خطأ غير متوقع.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative z-10 w-full max-w-sm rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] flex items-center justify-center">
                  <Plus size={15} className="text-[var(--primary)]" />
                </div>
                <h2 className="text-sm font-bold text-[var(--text-primary)]">إضافة نوع امتحان</h2>
              </div>
              <button onClick={onClose} className="h-7 w-7 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-soft)] transition-colors">
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">اسم النوع</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: امتحان شهري، واجب، نشاط..."
                  className={fieldClasses}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">الدرجة الكاملة</label>
                  <input type="number" min={1} step="0.5" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} className={fieldClasses} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">درجة النجاح</label>
                  <input type="number" min={0} step="0.5" value={passScore} onChange={(e) => setPassScore(e.target.value)} className={fieldClasses} />
                </div>
              </div>

              {error && <p className="text-xs text-[var(--danger)] bg-[var(--danger)]/8 rounded-xl px-3 py-2">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl border border-[var(--border)] text-sm text-[var(--text-muted)] hover:bg-[var(--surface-soft)] transition-colors">
                  إلغاء
                </button>
                <button type="submit" disabled={saving || !name.trim()} className="flex-1 h-10 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Loader2 size={13} className="animate-spin" />}
                  إضافة
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
