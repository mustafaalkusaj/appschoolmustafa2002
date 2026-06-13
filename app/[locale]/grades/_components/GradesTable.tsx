"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Trash2, Pencil, ChevronRight, ChevronLeft } from "lucide-react";
import { formatDate } from "@/lib/formatting";
import type { GradeEntry } from "../_types";
import { GRADE_LABELS } from "@/lib/grades/types";

interface GradesTableProps {
  entries: GradeEntry[];
  loading: boolean;
  selectedIds: Set<string>;
  onSelect: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onRowClick: (entry: GradeEntry) => void;
  onConfirm: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (entry: GradeEntry) => void;
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

function getPercentageColor(pct: number): string {
  for (const g of GRADE_LABELS) {
    if (pct >= g.minPercent && pct <= g.maxPercent) return g.color;
  }
  return "text-[var(--text-muted)]";
}

function getGradeLabelAr(pct: number): string {
  for (const g of GRADE_LABELS) {
    if (pct >= g.minPercent && pct <= g.maxPercent) return g.labelAr;
  }
  return "—";
}

function StatusBadge({ status }: { status: GradeEntry["status"] }) {
  if (status === "draft") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">
        مسودة
      </span>
    );
  }
  if (status === "confirmed") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-950 dark:text-blue-300">
        <CheckCircle2 size={10} />
        مؤكد
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950 dark:text-amber-300">
      🔒 مقفول
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-[var(--border)]">
      {[...Array(9)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-[var(--surface-soft)] animate-pulse" style={{ width: i === 0 ? "24px" : "80%", animationDelay: `${i * 30}ms` }} />
        </td>
      ))}
    </tr>
  );
}

export function GradesTable({
  entries,
  loading,
  selectedIds,
  onSelect,
  onSelectAll,
  onRowClick,
  onConfirm,
  onDelete,
  onEdit,
  page,
  totalPages,
  totalCount,
  onPageChange,
}: GradesTableProps) {
  const allSelected = entries.length > 0 && entries.every((e) => selectedIds.has(e.id));
  const someSelected = entries.some((e) => selectedIds.has(e.id));

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-soft)]">
              <th className="px-4 py-3 text-start w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)] cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 text-start font-bold text-[var(--text-muted)] text-xs uppercase tracking-wider whitespace-nowrap">الطالب</th>
              <th className="px-4 py-3 text-start font-bold text-[var(--text-muted)] text-xs uppercase tracking-wider whitespace-nowrap">المادة</th>
              <th className="px-4 py-3 text-start font-bold text-[var(--text-muted)] text-xs uppercase tracking-wider whitespace-nowrap">النوع</th>
              <th className="px-4 py-3 text-start font-bold text-[var(--text-muted)] text-xs uppercase tracking-wider whitespace-nowrap">الدرجة</th>
              <th className="px-4 py-3 text-start font-bold text-[var(--text-muted)] text-xs uppercase tracking-wider whitespace-nowrap">النسبة%</th>
              <th className="px-4 py-3 text-start font-bold text-[var(--text-muted)] text-xs uppercase tracking-wider whitespace-nowrap">التقدير</th>
              <th className="px-4 py-3 text-start font-bold text-[var(--text-muted)] text-xs uppercase tracking-wider whitespace-nowrap">الحالة</th>
              <th className="px-4 py-3 text-start font-bold text-[var(--text-muted)] text-xs uppercase tracking-wider whitespace-nowrap">تاريخ الإدخال</th>
              <th className="px-4 py-3 text-start font-bold text-[var(--text-muted)] text-xs uppercase tracking-wider whitespace-nowrap">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {loading ? (
              [...Array(8)].map((_, i) => <SkeletonRow key={i} />)
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-14 w-14 rounded-2xl bg-[var(--surface-soft)] flex items-center justify-center">
                      <span className="text-2xl">📊</span>
                    </div>
                    <p className="font-bold text-[var(--text-primary)]">اختر الصف والمادة لعرض الدرجات</p>
                    <p className="text-xs text-[var(--text-muted)]">حدد فلتر الصف أو المادة من الأعلى لتحميل سجلات الدرجات</p>
                  </div>
                </td>
              </tr>
            ) : (
              <AnimatePresence>
                {entries.map((entry, i) => {
                  const pct = Math.round(entry.percentage ?? 0);
                  const pctColor = getPercentageColor(pct);
                  const labelAr = getGradeLabelAr(pct);
                  const isSelected = selectedIds.has(entry.id);
                  return (
                    <motion.tr
                      key={entry.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => onRowClick(entry)}
                      className={`cursor-pointer transition-colors hover:bg-[var(--surface-soft)] ${isSelected ? "bg-[var(--primary)]/5" : ""}`}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => onSelect(entry.id, e.target.checked)}
                          className="h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)] cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[var(--text-primary)] whitespace-nowrap">
                          {entry.student_name ?? "—"}
                        </p>
                        {entry.class_name && (
                          <p className="text-[10px] text-[var(--text-muted)]">{entry.class_name}{entry.section_name ? ` / ${entry.section_name}` : ""}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-primary)] whitespace-nowrap">
                        {entry.subject_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)] whitespace-nowrap text-xs">
                        {entry.grade_type_name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-black tabular-nums text-[var(--text-primary)]">{entry.score}</span>
                        <span className="text-[var(--text-muted)] text-xs"> / {entry.max_score}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-black tabular-nums text-sm ${pctColor}`}>
                          {pct}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-bold text-xs ${pctColor}`}>{labelAr}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={entry.status} />
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)] text-xs whitespace-nowrap">
                        {entry.created_at ? formatDate(entry.created_at) : "—"}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {entry.status !== "locked" && (
                            <button
                              onClick={() => onEdit(entry)}
                              title="تعديل الدرجة"
                              className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          {entry.status === "draft" && (
                            <>
                              <button
                                onClick={() => onConfirm(entry.id)}
                                title="تأكيد الدرجة"
                                className="h-8 w-8 rounded-lg flex items-center justify-center text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                              >
                                <CheckCircle2 size={15} />
                              </button>
                              <button
                                onClick={() => onDelete(entry.id)}
                                title="حذف الدرجة"
                                className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-[var(--text-muted)]">
            إجمالي: <span className="font-bold text-[var(--text-primary)]">{totalCount}</span> سجل
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="h-8 w-8 rounded-lg flex items-center justify-center border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-muted)] hover:bg-[var(--surface-soft)] disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
            {[...Array(Math.min(totalPages, 5))].map((_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`h-8 w-8 rounded-lg text-xs font-bold border transition-colors ${
                    p === page
                      ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                      : "border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="h-8 w-8 rounded-lg flex items-center justify-center border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-muted)] hover:bg-[var(--surface-soft)] disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
