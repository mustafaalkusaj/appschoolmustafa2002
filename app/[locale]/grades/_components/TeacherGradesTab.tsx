"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Pencil, CheckCircle2, Trash2, GraduationCap, Image } from "lucide-react";
import { formatDate } from "@/lib/formatting";
import type { GradeEntry } from "../_types";
import { GRADE_LABELS } from "@/lib/grades/types";

interface TeacherGradesTabProps {
  entries: GradeEntry[];
  loading: boolean;
  canEdit: boolean;
  canConfirm: boolean;
  onEdit: (entry: GradeEntry) => void;
  onConfirm: (id: string) => void;
  onDelete: (id: string) => void;
}

function getPctColor(pct: number) {
  for (const g of GRADE_LABELS) {
    if (pct >= g.minPercent && pct <= g.maxPercent) return g.color;
  }
  return "text-[var(--text-muted)]";
}

function StatusBadge({ status }: { status: GradeEntry["status"] }) {
  if (status === "draft") return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">مسودة</span>;
  if (status === "confirmed") return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1"><CheckCircle2 size={9} />مؤكد</span>;
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">مقفول</span>;
}

interface TeacherGroup {
  name: string;
  entries: GradeEntry[];
  avgPct: number;
  draft: number;
  confirmed: number;
  locked: number;
}

export function TeacherGradesTab({ entries, loading, canEdit, canConfirm, onEdit, onConfirm, onDelete }: TeacherGradesTabProps) {
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);

  const groups = useMemo<TeacherGroup[]>(() => {
    const map = new Map<string, GradeEntry[]>();
    for (const e of entries) {
      const key = e.teacher_name?.trim() || "غير محدد";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries()).map(([name, grps]) => ({
      name,
      entries: grps,
      avgPct: Math.round(grps.reduce((s, e) => s + (e.percentage ?? 0), 0) / grps.length),
      draft: grps.filter((e) => e.status === "draft").length,
      confirmed: grps.filter((e) => e.status === "confirmed").length,
      locked: grps.filter((e) => e.status === "locked").length,
    })).sort((a, b) => b.entries.length - a.entries.length);
  }, [entries]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-[var(--surface-soft)] animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
        <GraduationCap size={40} className="mb-3 opacity-30" />
        <p className="text-sm">لا توجد درجات مُدخلة بعد</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const isOpen = expandedTeacher === group.name;
        const initials = group.name.split(" ").map((w) => w[0]).join("").slice(0, 2);
        return (
          <div key={group.name} className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
            {/* Teacher header row */}
            <button
              type="button"
              onClick={() => setExpandedTeacher(isOpen ? null : group.name)}
              className="w-full flex items-center gap-3 p-4 hover:bg-[var(--surface-soft)] transition-colors text-start"
            >
              {/* Avatar */}
              <div className="h-10 w-10 rounded-xl bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-[var(--primary)]">{initials}</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[var(--text-primary)] truncate">{group.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-[var(--text-muted)]">{group.entries.length} درجة</span>
                  {group.draft > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-bold">{group.draft} مسودة</span>}
                  {group.confirmed > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-bold">{group.confirmed} مؤكد</span>}
                  {group.locked > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-bold">{group.locked} مقفول</span>}
                </div>
              </div>

              <span className={`text-lg font-black tabular-nums ml-2 ${getPctColor(group.avgPct)}`}>{group.avgPct}%</span>
              <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={16} className="text-[var(--text-muted)]" />
              </motion.div>
            </button>

            {/* Expanded entries */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-[var(--border)] divide-y divide-[var(--border)]">
                    {group.entries.map((entry) => {
                      const pct = entry.percentage ?? (entry.score != null && entry.max_score ? Math.round((entry.score / entry.max_score) * 100) : null);
                      const hasPhotos = Array.isArray((entry as GradeEntry & { exam_photos?: string[] }).exam_photos) && ((entry as GradeEntry & { exam_photos?: string[] }).exam_photos?.length ?? 0) > 0;
                      return (
                        <div key={entry.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-soft)] transition-colors">
                          {/* Student + subject */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{entry.student_name ?? "—"}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[11px] text-[var(--text-muted)]">{entry.subject_name ?? "—"}</span>
                              {entry.grade_type_name && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--surface-soft)] text-[var(--text-muted)] border border-[var(--border)]">{entry.grade_type_name}</span>}
                              {hasPhotos && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-100 flex items-center gap-0.5"><Image size={9} />{(entry as GradeEntry & { exam_photos?: string[] }).exam_photos?.length} صور</span>}
                            </div>
                            {entry.created_at && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{formatDate(entry.created_at)}</p>}
                          </div>

                          {/* Score */}
                          <div className="text-center flex-shrink-0">
                            <p className={`text-base font-black tabular-nums ${pct != null ? getPctColor(pct) : "text-[var(--text-muted)]"}`}>
                              {entry.score ?? "—"}
                              <span className="text-xs font-normal text-[var(--text-muted)]">/{entry.max_score ?? 100}</span>
                            </p>
                            {pct != null && <p className="text-[10px] text-[var(--text-muted)]">{pct}%</p>}
                          </div>

                          {/* Status */}
                          <div className="flex-shrink-0">
                            <StatusBadge status={entry.status} />
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            {entry.status !== "locked" && canEdit && (
                              <button onClick={() => onEdit(entry)} title="تعديل" className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors">
                                <Pencil size={14} />
                              </button>
                            )}
                            {entry.status === "draft" && canConfirm && (
                              <button onClick={() => onConfirm(entry.id)} title="تأكيد" className="h-8 w-8 rounded-lg flex items-center justify-center text-blue-500 hover:bg-blue-50 transition-colors">
                                <CheckCircle2 size={14} />
                              </button>
                            )}
                            {entry.status === "draft" && canEdit && (
                              <button onClick={() => onDelete(entry.id)} title="حذف" className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
