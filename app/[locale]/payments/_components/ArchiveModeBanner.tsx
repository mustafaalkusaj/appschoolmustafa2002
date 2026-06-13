"use client";

import { Archive, X } from "lucide-react";

interface ArchiveModeBannerProps {
  year: number;
  archiveDate: string;
  onExit: () => void;
}

export function ArchiveModeBanner({ year, archiveDate, onExit }: ArchiveModeBannerProps) {
  const formattedDate = new Date(archiveDate).toLocaleDateString("ar-IQ-u-nu-latn", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-amber-300 bg-amber-50 px-5 py-3.5 dark:border-amber-700 dark:bg-amber-950/30">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40">
          <Archive className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-black text-amber-800 dark:text-amber-300">
              وضع الأرشيف — سنة {year}
            </span>
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-700 dark:bg-amber-800/50 dark:text-amber-300">
              للقراءة فقط
            </span>
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
            تعرض الآن بيانات الأرشيف المؤرشفة بتاريخ {formattedDate} — لا يمكن تعديل أو إضافة دفعات
          </p>
        </div>
      </div>
      <button
        onClick={onExit}
        className="flex shrink-0 items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2 text-xs font-black text-amber-700 transition hover:bg-amber-50 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50"
      >
        <X className="h-3.5 w-3.5" />
        عودة للوضع الحالي
      </button>
    </div>
  );
}
