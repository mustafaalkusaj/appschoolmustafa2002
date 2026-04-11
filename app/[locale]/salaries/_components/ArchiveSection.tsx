"use client";

import { AppIcon } from "@/components/AppIcon";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatNumber, formatDate } from "@/lib/formatting";
import type { SalaryArchive } from "../_types";

interface ArchiveSectionProps {
  archives: SalaryArchive[];
  currentMonth: string;
  onArchive: () => void;
}

export function ArchiveSection({
  archives,
  currentMonth: _currentMonth,
  onArchive,
}: ArchiveSectionProps) {
  return (
    <div className="space-y-6">
      {/* Archive Action Card */}
      <div className="rounded-xl bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] p-6">
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--warning)] mb-2">
          <AppIcon token="⚠️" size={16} />
          إجراء نهاية الشهر
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          عند الضغط على "أرشفة الشهر الحالي"، سيتم حفظ نسخة من جميع البيانات الحالية وتفريغ العدادات لبدء شهر جديد.
        </p>
        <Button className="bg-[var(--warning)] text-white hover:brightness-110" onClick={onArchive}>
          <AppIcon token="🗄️" size={14} />
          أرشفة الشهر الحالي وتصفير العدادات
        </Button>
      </div>

      {/* Archive List */}
      <div className="text-sm font-bold text-[var(--text-primary)]">
        الأرشيفات السابقة
      </div>

      {archives.length === 0 ? (
        <EmptyState
          title="لا يوجد أرشيف محفوظ"
          description="لم يتم أرشفة أي شهر بعد"
        />
      ) : (
        <div className="space-y-3">
          {archives.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--card-bg)]"
            >
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
                  <AppIcon token="📅" size={14} />
                  {a.month}
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-1">
                  {a.total_teachers} أستاذ • تاريخ الأرشفة: {formatDate(a.archive_date)}
                </div>
              </div>
              <div className="text-start">
                <div className="text-sm font-bold text-[var(--primary)]">
                  د.ع {formatNumber(a.total_amount || 0)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
