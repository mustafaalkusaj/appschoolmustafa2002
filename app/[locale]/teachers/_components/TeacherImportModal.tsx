"use client";

// Teacher import modal component

import { useRef } from "react";
import { CircleOff, FileSpreadsheet, Loader2, Upload } from "@/lib/icons";
import { normalizeExcelCell } from "../_utils";
import type { ImportPayload } from "../_types";

type TeacherImportModalProps = {
  showing: boolean;
  importing: boolean;
  importPreview: Array<Record<string, unknown>>;
  importPayloads: ImportPayload[];
  importErrors: string[];
  onClose: () => void;
  onImport: () => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadTemplate: () => void;
};

export function TeacherImportModal({
  showing,
  importing,
  importPreview,
  importPayloads,
  importErrors,
  onClose,
  onImport,
  onFileChange,
  onDownloadTemplate,
}: TeacherImportModalProps) {
  const importFileRef = useRef<HTMLInputElement>(null);

  if (!showing) return null;

  return (
    <div
      className="ui-backdrop flex items-center justify-center p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="ui-dialog w-full max-w-[860px] overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-sm font-black text-[var(--text-primary)]">
                <Upload size={15} />
                استيراد حسابات الأساتذة من إكسل
              </div>
              <h2 className="text-xl font-black text-[var(--text-primary)]">استيراد آمن مع التحقق قبل الحفظ</h2>
              <p className="text-sm leading-7 text-[var(--text-secondary)]">
                يتم فحص كل سطر قبل الإرسال. السطور الخاطئة تُعرض برسائل واضحة ولن يتم حفظها.
              </p>
            </div>

            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
              onClick={onClose}
              aria-label="إغلاق"
            >
              <CircleOff size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-7 sm:py-6">
          <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold text-[var(--text-secondary)]">
                الأعمدة المقترحة: الدور، الاسم الكامل، الهاتف، معرّف الدخول، الصف، الشعبة، المادة، الحالة
              </p>
              <button
                type="button"
                className="ui-button ui-button--secondary inline-flex items-center gap-2 px-4 text-sm"
                onClick={onDownloadTemplate}
              >
                <FileSpreadsheet size={15} />
                تحميل نموذج جاهز
              </button>
            </div>

            <label className="block cursor-pointer rounded-[16px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-strong)] p-4 text-center transition hover:border-[var(--primary)]">
              <input
                ref={importFileRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={onFileChange}
              />
              <div className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-[14px] border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-primary)]">
                <Upload size={18} />
              </div>
              <p className="text-sm font-black text-[var(--text-primary)]">اضغط لاختيار ملف Excel</p>
              <p className="text-xs text-[var(--text-secondary)]">سيتم عرض معاينة وفحص السطور قبل الاستيراد</p>
            </label>
          </div>

          {importErrors.length ? (
            <div className="space-y-2 rounded-[20px] border border-[rgba(240,90,90,0.22)] bg-[rgba(240,90,90,0.08)] p-4">
              <p className="text-sm font-black text-[var(--danger)]">أخطاء التحقق</p>
              <ul className="max-h-44 space-y-1 overflow-y-auto pe-5 text-sm leading-7 text-[var(--danger)]">
                {importErrors.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {importPreview.length ? (
            <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-strong)] p-4">
              <p className="mb-3 text-sm font-black text-[var(--text-primary)]">معاينة أول 6 صفوف من الملف</p>
              <div className="overflow-x-auto rounded-[14px] border border-[var(--border)]">
                <table className="ui-table min-w-[780px]">
                  <thead>
                    <tr>
                      {Object.keys(importPreview[0] ?? {}).map((column) => (
                        <th key={column}>{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.map((row, rowIndex) => (
                      <tr key={`preview-row-${rowIndex}`}>
                        {Object.keys(importPreview[0] ?? {}).map((column) => (
                          <td key={`${column}-${rowIndex}`}>{normalizeExcelCell(row[column]) || "—"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" className="ui-button ui-button--secondary" onClick={onClose}>
              إلغاء
            </button>
            <button
              type="button"
              className="ui-button ui-button--primary inline-flex items-center gap-2"
              onClick={onImport}
              disabled={importing || importPayloads.length === 0}
            >
              {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {importing ? "جارٍ الاستيراد..." : `استيراد (${importPayloads.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
