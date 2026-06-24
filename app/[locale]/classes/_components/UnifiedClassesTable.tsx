"use client";

import { useTranslations } from "next-intl";
import { School, Pencil, Trash2, Check, X, Banknote } from "@/lib/icons";
import { formatNumber } from "@/lib/formatting";
import type { ClassItem, SectionItem, ClassFee } from "../../dashboard/_components/types";

interface UnifiedClassesTableProps {
  classes: ClassItem[];
  sections: SectionItem[];
  classFees: ClassFee[];
  canManage: boolean;
  selectedClassId: string | null;
  confirmDeleteClassId: string | null;
  confirmDeleteFeeId: string | null;
  getClassStats: (cf: ClassFee) => {
    count: number;
    activeCount: number;
    transferredCount: number;
    totalExpected: number;
    totalPaid: number;
    totalRemaining: number;
    transferredPaid: number;
    paidPct: number;
  };
  onSelectClass: (cls: ClassItem) => void;
  onEditClass: (cls: ClassItem) => void;
  onDeleteClass: (id: string) => void;
  onConfirmDeleteClass: (id: string) => void;
  onCancelDeleteClass: () => void;
  onEditFee: (cf: ClassFee) => void;
  onDeleteFee: (id: string) => void;
  onConfirmDeleteFee: (id: string) => void;
  onCancelDeleteFee: () => void;
  locale: "ar" | "en";
}

export function UnifiedClassesTable({
  classes,
  sections,
  classFees,
  canManage,
  selectedClassId,
  confirmDeleteClassId,
  confirmDeleteFeeId,
  getClassStats,
  onSelectClass,
  onEditClass,
  onDeleteClass,
  onConfirmDeleteClass,
  onCancelDeleteClass,
  onEditFee,
  onDeleteFee,
  onConfirmDeleteFee,
  onCancelDeleteFee,
  locale,
}: UnifiedClassesTableProps) {
  const isEn = locale === "en";
  const commonT = useTranslations("common");

  const feeByClassName = new Map(classFees.map((cf) => [cf.class_name, cf]));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--surface-soft)] text-[var(--text-muted)]">
            <th className="px-3 py-3 text-start font-bold w-8">#</th>
            <th className="px-3 py-3 text-start font-bold">{isEn ? "Class" : "الصف"}</th>
            <th className="px-3 py-3 text-start font-bold">{isEn ? "Sections" : "الشعب"}</th>
            <th className="px-3 py-3 text-center font-bold">{isEn ? "Students" : "الطلاب"}</th>
            <th className="px-3 py-3 text-end font-bold">{isEn ? "Fee" : "الرسوم"}</th>
            <th className="px-3 py-3 text-end font-bold">{isEn ? "Collected" : "المحصّل"}</th>
            <th className="px-3 py-3 text-end font-bold">{isEn ? "Remaining" : "المتبقي"}</th>
            <th className="px-3 py-3 text-center font-bold">{isEn ? "Rate" : "النسبة"}</th>
            {canManage && (
              <th className="px-3 py-3 text-center font-bold">{isEn ? "Actions" : "الإجراءات"}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {classes.map((cls, idx) => {
            const clsSections = sections.filter((s) => s.class_id === cls.id);
            const fee = feeByClassName.get(cls.name);
            const stats = fee ? getClassStats(fee) : null;
            const isSelected = selectedClassId === cls.id;
            const totalPaid = stats ? stats.totalPaid + stats.transferredPaid : 0;
            const totalExpected = stats && fee ? stats.activeCount * fee.total_fee : 0;
            const remaining = totalExpected - (stats?.totalPaid ?? 0);
            const pct = stats?.paidPct ?? 0;

            return (
              <tr
                key={cls.id}
                className={`border-b border-[var(--border)] transition-colors cursor-pointer group ${
                  isSelected
                    ? "bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]"
                    : "hover:bg-[var(--surface-soft)]"
                }`}
                onClick={() => onSelectClass(cls)}
              >
                <td className="px-3 py-3 text-[var(--text-muted)]">{idx + 1}</td>

                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] flex items-center justify-center text-[var(--primary)]">
                      <School size={14} />
                    </div>
                    <span className="font-bold text-[var(--text-primary)]">{cls.name}</span>
                  </div>
                </td>

                <td className="px-3 py-3">
                  {clsSections.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {clsSections.map((sec) => (
                        <span
                          key={sec.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]"
                        >
                          {sec.name}
                          {(sec.studentCount ?? 0) > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[1rem] h-4 rounded-full bg-[var(--primary)] text-white text-[9px] font-bold px-0.5">
                              {sec.studentCount}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[var(--text-muted)] text-xs">{isEn ? "No sections" : "بدون شعب"}</span>
                  )}
                </td>

                <td className="px-3 py-3 text-center">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)] font-bold text-sm">
                    {cls.studentCount ?? 0}
                  </span>
                </td>

                <td className="px-3 py-3 text-end whitespace-nowrap">
                  {fee ? (
                    <span className="font-bold text-[var(--text-primary)]">
                      {commonT("currency")} {formatNumber(fee.total_fee)}
                    </span>
                  ) : (
                    <span className="text-[var(--text-muted)] text-xs">{isEn ? "No fee" : "بدون رسوم"}</span>
                  )}
                </td>

                <td className="px-3 py-3 text-end whitespace-nowrap">
                  {stats ? (
                    <span className="font-bold text-[var(--success)]">
                      {commonT("currency")} {formatNumber(totalPaid)}
                    </span>
                  ) : (
                    <span className="text-[var(--text-muted)]">—</span>
                  )}
                </td>

                <td className="px-3 py-3 text-end whitespace-nowrap">
                  {stats ? (
                    <span className={`font-bold ${remaining > 0 ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
                      {commonT("currency")} {formatNumber(Math.max(0, remaining))}
                    </span>
                  ) : (
                    <span className="text-[var(--text-muted)]">—</span>
                  )}
                </td>

                <td className="px-3 py-3 text-center">
                  {stats ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className={`text-xs font-black ${pct >= 80 ? "text-[var(--success)]" : pct >= 40 ? "text-[var(--warning)]" : "text-[var(--danger)]"}`}>
                        {pct}%
                      </span>
                      <div className="w-10 h-1.5 rounded-full bg-[var(--surface-muted)] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(pct, 100)}%`,
                            background: pct >= 80 ? "var(--success)" : pct >= 40 ? "var(--warning)" : "var(--danger)",
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-[var(--text-muted)]">—</span>
                  )}
                </td>

                {canManage && (
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        className="h-7 w-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--primary)] transition-colors"
                        onClick={() => onEditClass(cls)}
                        title={isEn ? "Edit class" : "تعديل الصف"}
                      >
                        <Pencil size={14} />
                      </button>

                      {fee && (
                        <button
                          className="h-7 w-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[color-mix(in_srgb,var(--success)_10%,transparent)] hover:text-[var(--success)] transition-colors"
                          onClick={() => onEditFee(fee)}
                          title={isEn ? "Edit fee" : "تعديل الرسوم"}
                        >
                          <Banknote size={14} />
                        </button>
                      )}

                      {confirmDeleteClassId === cls.id ? (
                        <div className="flex gap-1">
                          <button
                            className="h-7 w-7 flex items-center justify-center rounded-lg bg-[var(--danger)] text-white"
                            onClick={() => onDeleteClass(cls.id)}
                            aria-label={isEn ? "Confirm class deletion" : "تأكيد حذف الصف"}
                            title={isEn ? "Confirm deletion" : "تأكيد الحذف"}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            className="h-7 w-7 flex items-center justify-center rounded-lg border border-[var(--border)]"
                            onClick={onCancelDeleteClass}
                            aria-label={isEn ? "Cancel class deletion" : "إلغاء حذف الصف"}
                            title={isEn ? "Cancel deletion" : "إلغاء الحذف"}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          className="h-7 w-7 flex items-center justify-center rounded-lg text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] transition-colors"
                          onClick={() => onConfirmDeleteClass(cls.id)}
                          title={isEn ? "Delete" : "حذف"}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
