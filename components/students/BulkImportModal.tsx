"use client";

import { useState } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import {
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  FileSpreadsheet,
  Info,
  Check,
} from "lucide-react";
import { RequiredFieldsNotice } from "./RequiredFieldsNotice";

interface BulkImportModalProps {
  show: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
  schoolId?: string | null;
  branchId?: string | null;
}

interface ParsedStudentRow {
  fullName?: string;
  className?: string;
  sectionName?: string | null;
  [key: string]: unknown;
}

interface ParseResponse {
  success: boolean;
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
  };
  preview: {
    headerRowIndex: number;
    detectedHeaders: string[];
    columnMapping: Record<string, number>;
  };
  validRows?: ParsedStudentRow[];
  errors: Array<{
    rowNumber: number;
    errors: string[];
  }>;
  debug: {
    timestamp: string;
    classesLoaded: number;
    matchedClassesCount: number;
  };
}

type ImportStep = "upload" | "parsing" | "preview" | "importing" | "summary";

const IMPORT_CHUNK_SIZE = 1000;
const PREVIEW_ROWS = 10;

// ── Inline upload zone (no separate file) ─────────────────────────────────

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
}

function UploadZone({ onFileSelect }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelect(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => document.getElementById("bulk-upload-input")?.click()}
      className={[
        "relative rounded-2xl border-2 border-dashed p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200 text-center",
        isDragging
          ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] scale-[1.01]"
          : "border-[var(--border)] bg-[var(--surface-soft)] hover:border-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_4%,transparent)]",
      ].join(" ")}
    >
      <input
        id="bulk-upload-input"
        type="file"
        className="hidden"
        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
        onChange={handleChange}
      />

      {/* Animated icon */}
      <div className={[
        "h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-200",
        isDragging
          ? "bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] text-[var(--primary)] scale-110"
          : "bg-[var(--border)] text-[var(--text-muted)]",
      ].join(" ")}>
        <FileSpreadsheet size={28} />
      </div>

      <div>
        <p className={[
          "text-sm font-black transition-colors",
          isDragging ? "text-[var(--primary)]" : "text-[var(--text-primary)]",
        ].join(" ")}>
          {isDragging ? "أفلت الملف هنا" : "اسحب الملف أو انقر للاختيار"}
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">CSV · XLSX · XLS · حد 50,000 سطر</p>
      </div>

      {/* Warning pill */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border"
        style={{
          background: "color-mix(in srgb, var(--warning) 8%, transparent)",
          borderColor: "color-mix(in srgb, var(--warning) 22%, transparent)",
          color: "var(--warning)",
        }}>
        <Info size={11} />
        تأكد من مطابقة أسماء الأعمدة للنموذج
      </div>
    </div>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────

const STEPS = [
  { key: "upload",    label: "رفع الملف",  num: "1" },
  { key: "parsing",   label: "تحليل",       num: "2" },
  { key: "preview",   label: "مراجعة",      num: "3" },
  { key: "importing", label: "استيراد",     num: "4" },
  { key: "summary",   label: "النتيجة",     num: "5" },
] as const;

function StepBar({ current }: { current: ImportStep }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center">
      {STEPS.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const last = i === STEPS.length - 1;
        return (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            {/* Circle */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className={[
                "h-7 w-7 rounded-full flex items-center justify-center text-xs font-black transition-all",
                done
                  ? "bg-[var(--success)] text-white"
                  : active
                  ? "bg-[var(--primary)] text-white ring-4 ring-[color-mix(in_srgb,var(--primary)_20%,transparent)]"
                  : "bg-[var(--border)] text-[var(--text-muted)]",
              ].join(" ")}>
                {done ? <Check size={13} /> : s.num}
              </div>
              <span className={[
                "text-[9px] font-bold whitespace-nowrap",
                active ? "text-[var(--primary)]" : done ? "text-[var(--text-secondary)]" : "text-[var(--text-muted)]",
              ].join(" ")}>
                {s.label}
              </span>
            </div>
            {/* Connector */}
            {!last && (
              <div className={[
                "h-0.5 flex-1 mx-1 mb-4 rounded-full transition-colors",
                i < currentIdx ? "bg-[var(--success)]" : "bg-[var(--border)]",
              ].join(" ")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export function BulkImportModal({
  show,
  onClose,
  onImportComplete,
  schoolId,
  branchId,
}: BulkImportModalProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [parseResult, setParseResult] = useState<ParseResponse | null>(null);
  const [importResult, setImportResult] = useState<{
    imported: number;
    failed: number;
    partialFailure: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [showPreviewTable, setShowPreviewTable] = useState(false);
  const [parseWasCalled, setParseWasCalled] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const resolvedSchoolId =
    schoolId ??
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("school")
      : null);

  const buildApiParams = (extra?: Record<string, string>) => {
    const params = new URLSearchParams();
    if (resolvedSchoolId) params.set("school", resolvedSchoolId);
    if (branchId) params.set("branchId", branchId);
    if (extra) Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    return params.toString();
  };

  const handleFileSelect = async (file: File) => {
    setError(null);
    setStep("parsing");
    setParseWasCalled(false);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const qs = buildApiParams();
      const response = await fetch(
        `/api/students/parse-import${qs ? `?${qs}` : ""}`,
        { method: "POST", body: formData }
      );
      const data = await response.json();
      setParseWasCalled(true);
      if (!response.ok) throw new Error(data.error?.message || "تعذر تحليل الملف");
      setParseResult(data);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحليل الملف");
      setStep("upload");
    }
  };

  const handleImport = async () => {
    if (!parseResult || !parseWasCalled) {
      setError("يجب معاينة الملف أولاً قبل الاستيراد");
      return;
    }
    if (parseResult.summary.validRows === 0) {
      setError("لا توجد صفوف صالحة للاستيراد");
      return;
    }
    setLoading(true);
    setError(null);
    const allValidRows = parseResult.validRows ?? [];
    const chunks: typeof allValidRows[] = [];
    for (let i = 0; i < allValidRows.length; i += IMPORT_CHUNK_SIZE) {
      chunks.push(allValidRows.slice(i, i + IMPORT_CHUNK_SIZE));
    }
    setImportProgress({ current: 0, total: chunks.length });
    let totalImported = 0;
    let totalFailed = 0;
    let partialFailure = false;
    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const payload: Record<string, unknown> = { chunk };
        if (resolvedSchoolId) payload.school = resolvedSchoolId;
        if (branchId) payload.branch_id = branchId;
        const response = await fetch("/api/students/bulk-import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok) {
          if (totalImported > 0) {
            partialFailure = true;
            totalFailed += chunk.length;
          } else {
            throw new Error(result.error?.message || "فشل الاستيراد");
          }
        } else {
          totalImported += typeof result.imported === "number" ? result.imported : 0;
          totalFailed += typeof result.failed === "number" ? result.failed : 0;
        }
        setImportProgress({ current: i + 1, total: chunks.length });
      }
      setImportResult({ imported: totalImported, failed: totalFailed, partialFailure });
      setStep("summary");
      if (onImportComplete) onImportComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الاستيراد");
      setStep("preview");
    } finally {
      setLoading(false);
      setImportProgress(null);
    }
  };

  const handleReset = () => {
    setStep("upload");
    setParseResult(null);
    setImportResult(null);
    setError(null);
    setShowErrorDetails(false);
    setShowPreviewTable(false);
    setParseWasCalled(false);
    setImportProgress(null);
  };

  const downloadErrorReport = () => {
    if (!parseResult?.errors) return;
    const csv = [
      "رقم الصف,سبب الفشل",
      ...parseResult.errors.map((e) => `${e.rowNumber},${e.errors.join("؛ ")}`),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `import-errors-${Date.now()}.csv`;
    link.click();
  };

  const templateUrl = `/api/students/template${
    resolvedSchoolId ? `?school=${encodeURIComponent(resolvedSchoolId)}` : ""
  }`;

  const previewRows = parseResult?.validRows?.slice(0, PREVIEW_ROWS) ?? [];

  return (
    <Modal open={show} onClose={onClose} size="xl">
      <ModalHeader title="استيراد جماعي للطلاب" onClose={onClose} />

      <ModalBody className="space-y-5">

        {/* ── Step indicator ────────────────────────────────────── */}
        <StepBar current={step} />

        {/* ── Error banner ──────────────────────────────────────── */}
        {error && (
          <div className="p-3.5 rounded-xl bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] border border-[color-mix(in_srgb,var(--danger)_20%,transparent)] text-[var(--danger)] text-sm font-semibold flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* ── STEP: upload ──────────────────────────────────────── */}
        {step === "upload" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Left: requirements */}
            <div className="flex flex-col gap-3">
              <RequiredFieldsNotice />
              {/* Download template */}
              <a
                href={templateUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 border-dashed border-[var(--border)] hover:border-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_4%,transparent)] transition-all group"
              >
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)] group-hover:scale-110 transition-transform">
                  <Download size={18} />
                </div>
                <div>
                  <p className="text-sm font-black text-[var(--text-primary)]">تحميل نموذج Excel</p>
                  <p className="text-[10px] text-[var(--text-muted)]">جاهز مع أسماء الأعمدة الصحيحة</p>
                </div>
              </a>
            </div>

            {/* Right: upload zone */}
            <UploadZone onFileSelect={handleFileSelect} />
          </div>
        )}

        {/* ── STEP: parsing ─────────────────────────────────────── */}
        {step === "parsing" && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative h-16 w-16">
              <div className="absolute inset-0 rounded-full border-4 border-[var(--border)]" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[var(--primary)] animate-spin" />
              <div className="absolute inset-2 rounded-full bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] flex items-center justify-center">
                <FileSpreadsheet size={20} className="text-[var(--primary)]" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-[var(--text-primary)]">جاري تحليل الملف</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">يتم التحقق من الأعمدة ومطابقة الصفوف...</p>
            </div>
          </div>
        )}

        {/* ── STEP: preview ─────────────────────────────────────── */}
        {step === "preview" && parseResult && (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "صفوف صالحة", value: parseResult.summary.validRows, color: "var(--success)" },
                { label: "صفوف بأخطاء", value: parseResult.summary.invalidRows, color: "var(--danger)" },
                { label: "إجمالي الصفوف", value: parseResult.summary.totalRows, color: "var(--text-primary)" },
              ].map((card) => (
                <div key={card.label} className="rounded-xl border border-[var(--border)] p-4 text-center bg-[var(--surface-soft)]">
                  <div className="text-2xl font-black tabular-nums" style={{ color: card.color }}>
                    {card.value}
                  </div>
                  <div className="text-xs font-bold text-[var(--text-muted)] mt-1">{card.label}</div>
                </div>
              ))}
            </div>

            {/* Detected headers */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 flex items-start gap-2">
              <span className="text-xs font-black text-[var(--text-secondary)] shrink-0 mt-0.5">الأعمدة المكتشفة:</span>
              <div className="flex flex-wrap gap-1">
                {parseResult.preview.detectedHeaders.map((h, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[var(--border)] text-[var(--text-secondary)]">
                    {h}
                  </span>
                ))}
              </div>
            </div>

            {/* Preview table toggle */}
            {previewRows.length > 0 && (
              <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                <button
                  onClick={() => setShowPreviewTable(!showPreviewTable)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[var(--surface-soft)] hover:bg-[var(--border)] transition-colors text-sm font-black text-[var(--text-primary)]"
                >
                  <span>معاينة أول {Math.min(PREVIEW_ROWS, previewRows.length)} طلاب</span>
                  {showPreviewTable ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {showPreviewTable && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-[var(--surface-soft)] border-b border-[var(--border)]">
                          {["#", "الاسم", "الصف", "الشعبة"].map((h) => (
                            <th key={h} className="px-3 py-2.5 text-start font-black text-[var(--text-muted)]">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {previewRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-[var(--surface-soft)] transition-colors">
                            <td className="px-3 py-2 text-[var(--text-muted)]">{idx + 1}</td>
                            <td className="px-3 py-2 font-bold text-[var(--text-primary)]">{row.fullName || "—"}</td>
                            <td className="px-3 py-2 text-[var(--text-secondary)]">{row.className || "—"}</td>
                            <td className="px-3 py-2 text-[var(--text-muted)]">{row.sectionName || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(parseResult.validRows?.length ?? 0) > PREVIEW_ROWS && (
                      <div className="px-3 py-2 text-center text-xs text-[var(--text-muted)] border-t border-[var(--border)] bg-[var(--surface-soft)]">
                        ... و{(parseResult.validRows?.length ?? 0) - PREVIEW_ROWS} طالب إضافي
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Errors accordion */}
            {parseResult.errors.length > 0 && (
              <div className="rounded-xl overflow-hidden border"
                style={{ borderColor: "color-mix(in srgb, var(--danger) 25%, transparent)" }}>
                <button
                  onClick={() => setShowErrorDetails(!showErrorDetails)}
                  className="w-full flex items-center justify-between px-4 py-3 transition-colors"
                  style={{ background: "color-mix(in srgb, var(--danger) 6%, transparent)" }}
                >
                  <span className="font-black text-[var(--danger)] text-sm">
                    {parseResult.errors.length} صف بها أخطاء
                  </span>
                  {showErrorDetails
                    ? <ChevronUp size={16} className="text-[var(--danger)]" />
                    : <ChevronDown size={16} className="text-[var(--danger)]" />}
                </button>
                {showErrorDetails && (
                  <div className="px-4 pb-3 max-h-56 overflow-y-auto space-y-1.5 pt-2 bg-[var(--card-bg)]">
                    {parseResult.errors.map((err, idx) => (
                      <div key={idx} className="flex gap-2 text-xs p-2 rounded-lg border border-[var(--border)]">
                        <span className="shrink-0 font-mono font-black text-[var(--danger)] tabular-nums">
                          صف {err.rowNumber}
                        </span>
                        <span className="text-[var(--text-secondary)]">{err.errors.join(" · ")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Status banner */}
            {parseResult.summary.validRows === 0 ? (
              <div className="rounded-xl border p-5 text-center"
                style={{
                  borderColor: "color-mix(in srgb, var(--danger) 25%, transparent)",
                  background: "color-mix(in srgb, var(--danger) 6%, transparent)",
                }}>
                <XCircle className="mx-auto mb-2 h-8 w-8 text-[var(--danger)]" />
                <p className="font-black text-[var(--danger)]">لا توجد صفوف صالحة</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">جميع الصفوف تحتوي على أخطاء</p>
              </div>
            ) : (
              <div className="rounded-xl border p-4 flex items-center gap-4"
                style={{
                  borderColor: "color-mix(in srgb, var(--success) 25%, transparent)",
                  background: "color-mix(in srgb, var(--success) 6%, transparent)",
                }}>
                <CheckCircle2 className="h-8 w-8 shrink-0 text-[var(--success)]" />
                <div>
                  <p className="font-black text-[var(--success)] text-base">
                    {parseResult.summary.validRows} طالب جاهز للاستيراد
                  </p>
                  {parseResult.summary.invalidRows > 0 && (
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      سيتم تخطي {parseResult.summary.invalidRows} صف تحتوي على أخطاء
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP: importing ───────────────────────────────────── */}
        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-20 gap-5">
            <div className="relative h-16 w-16">
              <div className="absolute inset-0 rounded-full border-4 border-[var(--border)]" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[var(--primary)] animate-spin" />
            </div>
            {importProgress && importProgress.total > 1 ? (
              <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between text-xs font-bold text-[var(--text-muted)]">
                  <span>جاري الاستيراد...</span>
                  <span className="tabular-nums">{importProgress.current} / {importProgress.total}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--border)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm font-bold text-[var(--text-muted)]">جاري الاستيراد...</p>
            )}
          </div>
        )}

        {/* ── STEP: summary ─────────────────────────────────────── */}
        {step === "summary" && importResult && (
          <div className="space-y-4">
            {importResult.partialFailure && (
              <div className="p-4 rounded-xl border flex gap-3"
                style={{
                  borderColor: "color-mix(in srgb, var(--warning) 25%, transparent)",
                  background: "color-mix(in srgb, var(--warning) 8%, transparent)",
                }}>
                <AlertCircle className="h-5 w-5 text-[var(--warning)] shrink-0 mt-0.5" />
                <div>
                  <p className="font-black text-[var(--warning)] text-sm">اكتمال جزئي</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    تم استيراد بعض الطلاب لكن فشل جزء منهم. يُنصح بمراجعة القائمة.
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-2xl border p-8 text-center"
              style={importResult.partialFailure
                ? { borderColor: "color-mix(in srgb, var(--warning) 25%, transparent)", background: "color-mix(in srgb, var(--warning) 6%, transparent)" }
                : { borderColor: "color-mix(in srgb, var(--success) 25%, transparent)", background: "color-mix(in srgb, var(--success) 6%, transparent)" }}>
              <div className="h-16 w-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: importResult.partialFailure ? "color-mix(in srgb, var(--warning) 14%, transparent)" : "color-mix(in srgb, var(--success) 14%, transparent)" }}>
                <CheckCircle2 className="h-9 w-9" style={{ color: importResult.partialFailure ? "var(--warning)" : "var(--success)" }} />
              </div>
              <h3 className="text-lg font-black" style={{ color: importResult.partialFailure ? "var(--warning)" : "var(--success)" }}>
                {importResult.partialFailure ? "تم الاستيراد جزئياً" : "تم الاستيراد بنجاح!"}
              </h3>
              <p className="text-sm font-bold text-[var(--text-secondary)] mt-2">
                تم استيراد <span className="font-black text-[var(--success)]">{importResult.imported}</span> طالب بنجاح
              </p>
              {importResult.failed > 0 && (
                <p className="text-sm font-bold text-[var(--danger)] mt-1">
                  فشل استيراد <span className="font-black">{importResult.failed}</span> طالب
                </p>
              )}
            </div>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        {step === "upload" && (
          <>
            <div className="mr-auto flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)]">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              يجب توفر: اسم الطالب والصف في الملف
            </div>
            <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          </>
        )}

        {step === "preview" && (
          <>
            <div className="mr-auto">
              {(parseResult?.errors.length ?? 0) > 0 && (
                <Button variant="outline" size="sm" onClick={downloadErrorReport}>
                  <Download className="h-4 w-4" />
                  تحميل تقرير الأخطاء
                </Button>
              )}
            </div>
            <Button variant="ghost" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
              رجوع
            </Button>
            <Button
              variant="primary"
              disabled={!parseWasCalled || (parseResult?.summary.validRows ?? 0) === 0 || loading}
              onClick={() => { setStep("importing"); handleImport(); }}
            >
              استيراد ({parseResult?.summary.validRows ?? 0}) طالب
            </Button>
          </>
        )}

        {step === "summary" && (
          <>
            <Button variant="ghost" onClick={onClose}>إغلاق</Button>
            <Button variant="primary" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
              استيراد ملف جديد
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
}
