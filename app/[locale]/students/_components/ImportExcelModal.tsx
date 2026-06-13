"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  FileCheck,
  X,
} from "lucide-react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface ImportExcelModalProps {
  show: boolean;
  isReadOnlyView: boolean;
  canManageStudentAccounts: boolean;
  importPreview: Record<string, unknown>[];
  importError: string;
  importing: boolean;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImport: () => void;
  onDownloadTemplate: () => void;
  onClose: () => void;
}

export function ImportExcelModal({
  show,
  isReadOnlyView,
  canManageStudentAccounts,
  importPreview,
  importError,
  importing,
  fileRef,
  onFileChange,
  onImport,
  onDownloadTemplate,
  onClose,
}: ImportExcelModalProps) {
  const t = useTranslations("students.modals.import");
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  if (isReadOnlyView || !canManageStudentAccounts) return null;

  const requiredCols = [
    t("columns.name"),
    t("columns.class"),
  ];

  const optionalCols = [
    t("columns.address"),
    t("columns.phone"),
    t("columns.parentPhone"),
    t("columns.totalFee"),
    t("columns.paidFee"),
  ];

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setSelectedFileName(file ? file.name : null);
    onFileChange(e);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !fileRef.current) return;
    // Transfer to the hidden input via DataTransfer
    try {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileRef.current.files = dt.files;
      setSelectedFileName(file.name);
      const syntheticEvent = {
        target: fileRef.current,
      } as React.ChangeEvent<HTMLInputElement>;
      onFileChange(syntheticEvent);
    } catch {
      // Fallback: just trigger click
      fileRef.current.click();
    }
  }

  function clearFile() {
    setSelectedFileName(null);
    if (fileRef.current) fileRef.current.value = "";
    // Reset parent preview — trigger with empty
    const syntheticEvent = {
      target: { files: null },
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    onFileChange(syntheticEvent);
  }

  const hasFile = !!selectedFileName && importPreview.length > 0;
  const hasFileSelected = !!selectedFileName;

  return (
    <Modal open={show} onClose={onClose} size="xl">
      <ModalHeader title={t("title")} onClose={onClose} />

      <ModalBody className="space-y-5">

        {/* ── Steps ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {/* Step 1 */}
          <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] text-center">
            <div className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-black bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] text-[var(--primary)]">
              1
            </div>
            <p className="text-xs font-bold text-[var(--text-primary)] leading-snug">تحميل النموذج</p>
            <button
              type="button"
              onClick={onDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--primary)] text-white hover:opacity-90 transition-opacity active:scale-95"
            >
              <Download size={13} />
              {t("downloadTemplate")}
            </button>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] text-center">
            <div className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-black bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]">
              2
            </div>
            <p className="text-xs font-bold text-[var(--text-primary)] leading-snug">تعبئة البيانات</p>
            <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">أدخل بيانات الطلاب في النموذج المحمّل</p>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] text-center">
            <div className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-black bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)]">
              3
            </div>
            <p className="text-xs font-bold text-[var(--text-primary)] leading-snug">رفع الملف</p>
            <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">ارفع الملف المكتمل للاستيراد</p>
          </div>
        </div>

        {/* ── Column requirements ───────────────────────────────── */}
        <div className="rounded-xl border border-[var(--border)] overflow-hidden">
          {/* Required */}
          <div className="p-3 border-b border-[var(--border)]">
            <p className="text-[11px] font-black text-[var(--danger)] mb-2 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--danger)] inline-block" />
              الحقول الإلزامية
            </p>
            <div className="flex flex-wrap gap-1.5">
              {requiredCols.map((col) => (
                <span
                  key={col}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold"
                  style={{
                    background: "color-mix(in srgb, var(--danger) 10%, transparent)",
                    color: "var(--danger)",
                  }}
                >
                  <CheckCircle2 size={11} />
                  {col}
                </span>
              ))}
            </div>
          </div>

          {/* Optional */}
          <div className="p-3 bg-[var(--surface-soft)]">
            <p className="text-[11px] font-black text-[var(--text-muted)] mb-2 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-muted)] inline-block" />
              الحقول الاختيارية
            </p>
            <div className="flex flex-wrap gap-1.5">
              {optionalCols.map((col) => (
                <span
                  key={col}
                  className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--border)] text-[var(--text-muted)]"
                >
                  {col}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Upload zone ───────────────────────────────────────── */}
        {!hasFileSelected ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={[
              "relative rounded-2xl border-2 border-dashed p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200",
              isDragOver
                ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_6%,transparent)] scale-[1.01]"
                : "border-[var(--border)] bg-[var(--surface-soft)] hover:border-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_4%,transparent)]",
            ].join(" ")}
          >
            <div className={[
              "h-14 w-14 rounded-2xl flex items-center justify-center transition-colors",
              isDragOver
                ? "bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] text-[var(--primary)]"
                : "bg-[var(--border)] text-[var(--text-muted)]",
            ].join(" ")}>
              <FileSpreadsheet size={28} />
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-[var(--text-primary)]">
                {isDragOver ? "أفلت الملف هنا" : t("uploadPrompt")}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                يدعم XLSX · بحد أقصى 50,000 سطر
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          /* File selected state */
          <div className={[
            "rounded-2xl border-2 p-4 flex items-center gap-4 transition-colors",
            hasFile
              ? "border-[var(--success)] bg-[color-mix(in_srgb,var(--success)_6%,transparent)]"
              : "border-[var(--warning)] bg-[color-mix(in_srgb,var(--warning)_6%,transparent)]",
          ].join(" ")}>
            <div className={[
              "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0",
              hasFile
                ? "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)]"
                : "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]",
            ].join(" ")}>
              <FileCheck size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-[var(--text-primary)] truncate">{selectedFileName}</p>
              {hasFile && (
                <p className="text-xs text-[var(--success)] font-bold mt-0.5">
                  {importPreview.length} صف جاهز للاستيراد
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={clearFile}
              className="shrink-0 h-8 w-8 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--border)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="إزالة الملف"
            >
              <X size={16} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────── */}
        {importError && (
          <div className="p-3.5 rounded-xl bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] border border-[color-mix(in_srgb,var(--danger)_20%,transparent)] text-[var(--danger)] text-sm font-semibold flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{importError}</span>
          </div>
        )}

        {/* ── Preview table ─────────────────────────────────────── */}
        {importPreview.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm font-black text-[var(--text-primary)]">
                {t("previewTitle", { count: Math.min(importPreview.length, 5) })}
              </p>
              <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]">
                {importPreview.length} سجل
              </span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[var(--surface-soft)] border-b border-[var(--border)]">
                    {Object.keys(importPreview[0]).map((k, i) => (
                      <th key={i} className="px-3 py-2.5 text-start font-black text-[var(--text-muted)] whitespace-nowrap">
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {importPreview.slice(0, 5).map((row, i) => (
                    <tr key={i} className="hover:bg-[var(--surface-soft)] transition-colors">
                      {Object.values(row).map((v: unknown, j) => (
                        <td key={j} className="px-3 py-2 text-[var(--text-secondary)] whitespace-nowrap">
                          {String(v ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Button
          variant="primary"
          onClick={onImport}
          disabled={importing || importPreview.length === 0}
          loading={importing}
        >
          <Upload className="h-4 w-4" />
          {importing ? t("importing") : t("importButton")}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          {t("cancel")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
