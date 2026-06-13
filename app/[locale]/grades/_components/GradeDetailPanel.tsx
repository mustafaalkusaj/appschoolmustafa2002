"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  BookOpen,
  CheckCircle2,
  Trash2,
  Calendar,
  FileText,
  TrendingUp,
  Lock,
} from "lucide-react";
import { formatDate } from "@/lib/formatting";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import type { GradeEntry } from "../_types";
import { GRADE_LABELS } from "@/lib/grades/types";

interface GradeDetailPanelProps {
  entry: GradeEntry | null;
  show: boolean;
  onClose: () => void;
  onEdit?: (entry: GradeEntry) => void;
  onConfirm: (id: string) => void;
  onDelete: (id: string) => void;
  canEnterGrades: boolean;
  schoolId: string;
}

function getGradeMeta(pct: number) {
  for (const g of GRADE_LABELS) {
    if (pct >= g.minPercent && pct <= g.maxPercent) {
      return g;
    }
  }
  return GRADE_LABELS[GRADE_LABELS.length - 1];
}

function StatusBadge({ status }: { status: GradeEntry["status"] }) {
  if (status === "draft") {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
        مسودة
      </span>
    );
  }
  if (status === "confirmed") {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
        <CheckCircle2 size={11} /> مؤكد
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
      <Lock size={11} /> مقفول
    </span>
  );
}

export function GradeDetailPanel({
  entry,
  show,
  onClose,
  onConfirm,
  onDelete,
  canEnterGrades,
  schoolId,
}: GradeDetailPanelProps) {
  const [studentGrades, setStudentGrades] = useState<GradeEntry[]>([]);
  const [loadingStudentGrades, setLoadingStudentGrades] = useState(false);

  // Load student's other grades when entry changes
  useEffect(() => {
    if (!entry || !schoolId) return;
    setStudentGrades([]);
    setLoadingStudentGrades(true);
    fetchJsonWithAuthorizedSession<{ ok: boolean; entries: GradeEntry[] }>(
      `/api/web/grades/student/${entry.student_id}?schoolId=${schoolId}`
    )
      .then(({ payload }) => {
        if (payload?.ok) {
          // Exclude current entry
          setStudentGrades((payload.entries ?? []).filter((e) => e.id !== entry.id));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingStudentGrades(false));
  }, [entry?.id, entry?.student_id, schoolId]);

  const pct = entry ? Math.round(entry.percentage ?? 0) : 0;
  const gradeMeta = getGradeMeta(pct);

  return (
    <AnimatePresence>
      {show && entry && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto flex flex-col w-full max-w-xl max-h-[90vh] rounded-2xl bg-[var(--surface-soft)] shadow-2xl overflow-hidden">
              {/* Header */}
              <div
                className="relative flex-shrink-0 px-6 py-5 overflow-hidden"
                style={{ background: "linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 60%, var(--success)) 100%)" }}
              >
                <div className="absolute top-0 end-0 w-40 h-40 rounded-full opacity-[0.08] pointer-events-none" style={{ background: "white", transform: "translate(40%, -40%)" }} />
                <div className="absolute bottom-0 start-8 w-24 h-24 rounded-full opacity-[0.06] pointer-events-none" style={{ background: "white", transform: "translateY(60%)" }} />

                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)" }}>
                      <User size={22} className="text-white" />
                    </div>
                    <div>
                      <p className="text-white/60 text-[10px] font-medium tracking-widest uppercase mb-0.5">
                        تفاصيل الدرجة
                      </p>
                      <h2 className="text-lg font-black text-white leading-tight">{entry.student_name ?? "—"}</h2>
                      <p className="text-white/70 text-xs mt-0.5 font-medium">
                        {entry.subject_name ?? "—"}
                        {entry.class_name ? ` · ${entry.class_name}` : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="flex-shrink-0 h-8 w-8 rounded-xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-colors mt-0.5"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-5 space-y-4">

                  {/* Big percentage display */}
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 text-center relative overflow-hidden">
                    <div
                      className="absolute inset-0 pointer-events-none rounded-2xl opacity-40"
                      style={{ background: `radial-gradient(ellipse at center, color-mix(in srgb, var(--primary) 8%, transparent), transparent 70%)` }}
                    />
                    <div className="relative">
                      <div className="text-5xl font-black tabular-nums mb-1" style={{ color: "var(--primary)" }}>
                        {entry.score}
                        <span className="text-2xl text-[var(--text-muted)] font-bold"> / {entry.max_score}</span>
                      </div>
                      <div className={`text-2xl font-black mb-2 ${gradeMeta.color}`}>
                        {pct}% — {gradeMeta.labelAr} {gradeMeta.badge}
                      </div>
                      {/* Progress bar */}
                      <div className="h-2.5 bg-[var(--surface-soft)] rounded-full overflow-hidden mx-4">
                        <motion.div
                          className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
                          style={{ background: "linear-gradient(90deg, var(--primary), var(--success))" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-7 w-7 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                        <FileText size={13} />
                      </div>
                      <span className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                        تفاصيل السجل
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <BookOpen size={13} className="text-[var(--text-muted)] flex-shrink-0" />
                        <div>
                          <p className="text-[10px] text-[var(--text-muted)]">المادة</p>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{entry.subject_name ?? "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp size={13} className="text-[var(--text-muted)] flex-shrink-0" />
                        <div>
                          <p className="text-[10px] text-[var(--text-muted)]">نوع الدرجة</p>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{entry.grade_type_name ?? "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={13} className="text-[var(--text-muted)] flex-shrink-0" />
                        <div>
                          <p className="text-[10px] text-[var(--text-muted)]">السنة الدراسية</p>
                          <p className="text-sm font-semibold text-[var(--text-primary)]" dir="ltr">{entry.academic_year} — الفصل {entry.semester}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={13} className="text-[var(--text-muted)] flex-shrink-0" />
                        <div>
                          <p className="text-[10px] text-[var(--text-muted)]">تاريخ الإدخال</p>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{entry.created_at ? formatDate(entry.created_at) : "—"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status + Note */}
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">الحالة</span>
                      <StatusBadge status={entry.status} />
                    </div>
                    {entry.note && (
                      <div className="border-t border-[var(--border)] pt-3">
                        <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider mb-1">ملاحظة</p>
                        <p className="text-sm text-[var(--text-primary)]">{entry.note}</p>
                      </div>
                    )}
                  </div>

                  {/* Student's other grades */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                        <TrendingUp size={13} />
                      </div>
                      <span className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                        درجات الطالب الأخرى
                      </span>
                    </div>

                    {loadingStudentGrades ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
                      </div>
                    ) : studentGrades.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card-bg)] p-6 text-center">
                        <p className="text-sm text-[var(--text-muted)]">لا توجد درجات أخرى لهذا الطالب</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {studentGrades.slice(0, 6).map((g, i) => {
                          const gPct = Math.round(g.percentage ?? 0);
                          const gMeta = getGradeMeta(gPct);
                          return (
                            <motion.div
                              key={g.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-4 py-2.5"
                            >
                              <div>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">{g.subject_name ?? "—"}</p>
                                <p className="text-[10px] text-[var(--text-muted)]">{g.grade_type_name ?? ""} · {g.academic_year} ف{g.semester}</p>
                              </div>
                              <div className="text-end">
                                <p className={`text-sm font-black tabular-nums ${gMeta.color}`}>{gPct}%</p>
                                <p className="text-[10px] text-[var(--text-muted)]">{g.score}/{g.max_score}</p>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 border-t border-[var(--border)] bg-[var(--card-bg)] px-5 py-4 flex items-center justify-between gap-3">
                <button
                  onClick={onClose}
                  className="h-10 px-5 rounded-xl text-sm font-bold text-[var(--text-secondary)] bg-[var(--surface-soft)] border border-[var(--border)] hover:bg-[var(--surface-muted)] transition-colors"
                >
                  إغلاق
                </button>
                {canEnterGrades && entry.status === "draft" && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onDelete(entry.id)}
                      className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-sm font-bold text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/20 hover:bg-[var(--danger)]/15 transition-colors"
                    >
                      <Trash2 size={14} />
                      حذف
                    </button>
                    <button
                      onClick={() => onConfirm(entry.id)}
                      className="inline-flex items-center gap-1.5 h-10 px-5 rounded-xl text-sm font-black text-white bg-[var(--primary)] shadow-md shadow-[var(--primary)]/25 hover:opacity-90 transition-all"
                    >
                      <CheckCircle2 size={14} />
                      تأكيد الدرجة
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
