"use client";

import { useTranslations } from "next-intl";
import { Upload, Download, FileSpreadsheet, AlertCircle } from "lucide-react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/brand/brand-utils";

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

  if (isReadOnlyView || !canManageStudentAccounts) return null;

  const requiredColumns = [
    { name: t("columns.name"), required: true },
    { name: t("columns.class"), required: true },
    { name: t("columns.address"), required: false },
    { name: t("columns.phone"), required: false },
    { name: t("columns.parentPhone"), required: false },
    { name: t("columns.totalFee"), required: false },
    { name: t("columns.paidFee"), required: false },
  ];

  return (
    <Modal open={show} onClose={onClose} size="xl">
      <ModalHeader title={t("title")} onClose={onClose} />

      <ModalBody>
        {/* Required Columns Info */}
        <div className="mb-4 p-4 rounded-[var(--radius-lg)] bg-[var(--surface-soft)]">
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">
            {t("columnsTitle")}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {requiredColumns.map((col) => (
              <div key={col.name} className="flex items-center gap-1.5 text-xs">
                <span className={col.required ? "text-[var(--danger)]" : "text-[var(--text-muted)]"}>
                  {col.required ? "*" : "○"}
                </span>
                <span className="text-[var(--text-secondary)]">{col.name}</span>
                {col.required && (
                  <span className="text-[var(--text-muted)]">({t("required")})</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Download Template Button */}
        <Button variant="outline" size="sm" onClick={onDownloadTemplate} className="mb-4">
          <Download className="h-4 w-4" />
          {t("downloadTemplate")}
        </Button>

        {/* Upload Area */}
        <div
          className={cn(
            "border-2 border-dashed border-[var(--border)] rounded-[var(--radius-lg)] p-8",
            "flex flex-col items-center justify-center cursor-pointer",
            "hover:border-[var(--primary)] hover:bg-[var(--surface-hover)]",
            "transition-colors"
          )}
          onClick={() => fileRef.current?.click()}
        >
          <FileSpreadsheet className="h-12 w-12 text-[var(--text-muted)] mb-3" />
          <p className="font-semibold text-[var(--text-primary)]">{t("uploadPrompt")}</p>
          <p className="text-sm text-[var(--text-muted)]">{t("uploadHint")}</p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={onFileChange}
          />
        </div>

        {/* Error */}
        {importError && (
          <div className="mt-4 p-3 rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)] text-sm font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {importError}
          </div>
        )}

        {/* Preview Table */}
        {importPreview.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">
              {t("previewTitle", { count: importPreview.length })}
            </p>
            <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border)]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[var(--surface-soft)]">
                    {Object.keys(importPreview[0]).map((k, i) => (
                      <th
                        key={i}
                        className="px-3 py-2 text-start font-semibold text-[var(--text-muted)]"
                      >
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {importPreview.map((row, i) => (
                    <tr key={i} className="hover:bg-[var(--surface-hover)]">
                      {Object.values(row).map((v: unknown, j) => (
                        <td key={j} className="px-3 py-2 text-[var(--text-secondary)]">
                          {String(v)}
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
