"use client";

// Teachers actions section - create, import, export buttons

import { BookOpen, Download, FileSpreadsheet, Sparkles, Upload } from "@/lib/icons";

type TeachersActionsProps = {
  onAddTeacher: () => void;
  onImport: () => void;
  onExport: () => void;
  onDownloadTemplate: () => void;
};

export function TeachersActions({
  onAddTeacher,
  onImport,
  onExport,
  onDownloadTemplate,
}: TeachersActionsProps) {
  return (
    <section className="ui-surface rounded-[30px] p-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-sm font-black text-[var(--text-primary)]">
            <Sparkles size={15} />
            إجراءات حسابات الأساتذة
          </div>
          <h2 className="text-xl font-black text-[var(--text-primary)]">أنشئ حساب الأستاذ الصحيح من البداية</h2>
          <p className="text-sm leading-7 text-[var(--text-secondary)]">
            هذه الصفحة مخصصة لبيانات دخول الأساتذة فقط، مع ربط المادة والصف والشعبة، حتى تبقى الإدارة واضحة وسريعة.
          </p>
        </div>

        <div className="grid w-full gap-3 xl:max-w-[740px] xl:grid-cols-1">
          <button
            type="button"
            className="ui-button ui-button--primary inline-flex min-h-[78px] items-center justify-between gap-3 px-5 text-right"
            onClick={onAddTeacher}
          >
            <span className="space-y-1">
              <span className="block text-base font-black">إضافة أستاذ</span>
              <span className="block text-xs font-semibold text-white/85">
                الاسم والهاتف ومعرّف الدخول مع المادة والصف والشعبة
              </span>
            </span>
            <BookOpen size={18} className="shrink-0" />
          </button>

          <div className="grid gap-2 rounded-[20px] border border-[var(--border)] bg-[var(--surface-soft)] p-3 xl:col-span-2 sm:grid-cols-3">
            <button
              type="button"
              className="ui-button ui-button--secondary inline-flex items-center justify-center gap-2 px-4 text-sm"
              onClick={onImport}
            >
              <Upload size={15} />
              استيراد إكسل
            </button>
            <button
              type="button"
              className="ui-button ui-button--secondary inline-flex items-center justify-center gap-2 px-4 text-sm"
              onClick={onExport}
            >
              <Download size={15} />
              تصدير إكسل
            </button>
            <button
              type="button"
              className="ui-button ui-button--secondary inline-flex items-center justify-center gap-2 px-4 text-sm"
              onClick={onDownloadTemplate}
            >
              <FileSpreadsheet size={15} />
              نموذج إكسل
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
