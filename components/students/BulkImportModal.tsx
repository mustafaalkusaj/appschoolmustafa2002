"use client";

import { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Download, AlertTriangle, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { FileUploadZone } from "./FileUploadZone";
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

type ImportStep = 'upload' | 'parsing' | 'preview' | 'importing' | 'summary';

const IMPORT_CHUNK_SIZE = 1000;
const PREVIEW_ROWS = 10;

export function BulkImportModal({ show, onClose, onImportComplete, schoolId, branchId }: BulkImportModalProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [parseResult, setParseResult] = useState<ParseResponse | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; failed: number; partialFailure: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [showPreviewTable, setShowPreviewTable] = useState(false);
  const [parseWasCalled, setParseWasCalled] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);

  // Resolve schoolId from props or URL
  const resolvedSchoolId = schoolId ?? (
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("school")
      : null
  );

  const buildApiParams = (extra?: Record<string, string>) => {
    const params = new URLSearchParams();
    if (resolvedSchoolId) params.set('school', resolvedSchoolId);
    if (branchId) params.set('branchId', branchId);
    if (extra) Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    return params.toString();
  };

  const handleFileSelect = async (file: File) => {
    setError(null);
    setStep('parsing');
    setParseWasCalled(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const qs = buildApiParams();
      const response = await fetch(`/api/students/parse-import${qs ? `?${qs}` : ''}`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setParseWasCalled(true);

      if (!response.ok) {
        throw new Error(data.error?.message || 'تعذر تحليل الملف');
      }

      setParseResult(data);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحليل الملف');
      setStep('upload');
    }
  };

  const handleImport = async () => {
    if (!parseResult || !parseWasCalled) {
      setError('يجب معاينة الملف أولاً قبل الاستيراد');
      return;
    }
    if (parseResult.summary.validRows === 0) {
      setError('لا توجد صفوف صالحة للاستيراد');
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

        const response = await fetch('/api/students/bulk-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok) {
          if (totalImported > 0) {
            // Some chunks already imported — partial failure
            partialFailure = true;
            totalFailed += chunk.length;
          } else {
            throw new Error(result.error?.message || 'فشل الاستيراد');
          }
        } else {
          totalImported += typeof result.imported === 'number' ? result.imported : 0;
          totalFailed += typeof result.failed === 'number' ? result.failed : 0;
        }

        setImportProgress({ current: i + 1, total: chunks.length });
      }

      setImportResult({ imported: totalImported, failed: totalFailed, partialFailure });
      setStep('summary');
      if (onImportComplete) onImportComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الاستيراد');
      setStep('preview');
    } finally {
      setLoading(false);
      setImportProgress(null);
    }
  };

  const handleReset = () => {
    setStep('upload');
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
      'رقم الصف,سبب الفشل',
      ...parseResult.errors.map(e => `${e.rowNumber},${e.errors.join('؛ ')}`),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `import-errors-${Date.now()}.csv`;
    link.click();
  };

  const templateUrl = `/api/students/template${resolvedSchoolId ? `?school=${encodeURIComponent(resolvedSchoolId)}` : ''}`;

  const previewRows = parseResult?.validRows?.slice(0, PREVIEW_ROWS) ?? [];

  return (
    <Modal open={show} onClose={onClose} size="xl">
      <ModalHeader title="استيراد جماعي للطلاب" onClose={onClose} />

      <ModalBody>
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* STEP 1: UPLOAD */}
        {step === 'upload' && (
          <div className="space-y-6">
            <RequiredFieldsNotice />
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => window.open(templateUrl, '_blank')}>
                <Download className="mr-2 h-4 w-4" />
                تحميل نموذج Excel
              </Button>
            </div>
            <FileUploadZone onFileSelect={handleFileSelect} />
          </div>
        )}

        {/* STEP 2: PARSING */}
        {step === 'parsing' && (
          <div className="flex flex-col items-center justify-center space-y-4 py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            <p className="text-sm text-gray-600">جاري تحليل الملف...</p>
          </div>
        )}

        {/* STEP 3: PREVIEW */}
        {step === 'preview' && parseResult && (
          <div className="space-y-5">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{parseResult.summary.validRows}</div>
                <div className="text-xs text-gray-500 mt-1">صفوف صالحة</div>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-red-500">{parseResult.summary.invalidRows}</div>
                <div className="text-xs text-gray-500 mt-1">صفوف بها أخطاء</div>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-gray-700">{parseResult.summary.totalRows}</div>
                <div className="text-xs text-gray-500 mt-1">إجمالي الصفوف</div>
              </div>
            </div>

            {/* Detected Headers */}
            <div className="rounded-lg border bg-gray-50 px-4 py-3">
              <span className="text-xs font-semibold text-gray-600">الأعمدة المكتشفة: </span>
              <span className="text-xs text-gray-500">{parseResult.preview.detectedHeaders.join(' • ')}</span>
            </div>

            {/* Preview Table */}
            {previewRows.length > 0 && (
              <div>
                <button
                  onClick={() => setShowPreviewTable(!showPreviewTable)}
                  className="flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800"
                >
                  <span>{showPreviewTable ? '▼' : '▶'}</span>
                  معاينة أول {Math.min(PREVIEW_ROWS, previewRows.length)} طلاب
                </button>

                {showPreviewTable && (
                  <div className="mt-3 overflow-x-auto rounded-lg border">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-right font-semibold text-gray-600">#</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-600">الاسم</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-600">الصف</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-600">الشعبة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, idx) => (
                          <tr key={idx} className="border-t hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                            <td className="px-3 py-2 font-medium text-gray-800">{row.fullName || '—'}</td>
                            <td className="px-3 py-2 text-gray-600">{row.className || '—'}</td>
                            <td className="px-3 py-2 text-gray-500">{row.sectionName || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(parseResult.validRows?.length ?? 0) > PREVIEW_ROWS && (
                      <div className="px-3 py-2 text-center text-xs text-gray-400 border-t">
                        ... و{(parseResult.validRows?.length ?? 0) - PREVIEW_ROWS} طالب إضافي
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Errors Section */}
            {parseResult.errors.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <button
                  onClick={() => setShowErrorDetails(!showErrorDetails)}
                  className="flex w-full items-center justify-between"
                >
                  <span className="font-semibold text-red-900 text-sm">
                    تفاصيل الأخطاء ({parseResult.errors.length})
                  </span>
                  <span className="text-xs">{showErrorDetails ? '▼' : '▶'}</span>
                </button>

                {showErrorDetails && (
                  <div className="mt-3 max-h-72 overflow-y-auto space-y-1.5">
                    {parseResult.errors.slice(0, 20).map((err, idx) => (
                      <div key={idx} className="text-xs p-2 bg-white rounded border border-red-100">
                        <span className="font-mono text-red-700">
                          الصف {err.rowNumber}: {err.errors.join(', ')}
                        </span>
                      </div>
                    ))}
                    {parseResult.errors.length > 20 && (
                      <div className="text-xs text-gray-500 px-2">
                        ... و{parseResult.errors.length - 20} أخطاء أخرى
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* No valid rows */}
            {parseResult.summary.validRows === 0 && (
              <div className="rounded-lg border border-red-300 bg-red-100 p-4 text-center">
                <XCircle className="mx-auto mb-2 h-6 w-6 text-red-600" />
                <p className="font-semibold text-red-900">لا توجد صفوف صالحة للاستيراد</p>
                <p className="text-xs text-red-700 mt-1">جميع الصفوف تحتوي على أخطاء</p>
              </div>
            )}

            {/* Ready to import */}
            {parseResult.summary.validRows > 0 && (
              <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-center">
                <CheckCircle className="mx-auto mb-2 h-6 w-6 text-green-600" />
                <p className="font-semibold text-green-900">
                  {parseResult.summary.validRows} طالب جاهز للاستيراد
                </p>
                {parseResult.summary.invalidRows > 0 && (
                  <p className="text-xs text-green-700 mt-1">
                    سيتم تخطي {parseResult.summary.invalidRows} صف تحتوي على أخطاء
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 4: IMPORTING */}
        {step === 'importing' && (
          <div className="flex flex-col items-center justify-center space-y-5 py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            {importProgress && importProgress.total > 1 ? (
              <div className="w-full max-w-sm space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>جاري الاستيراد...</span>
                  <span>{importProgress.current} / {importProgress.total} دفعة</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600">جاري الاستيراد...</p>
            )}
          </div>
        )}

        {/* STEP 5: SUMMARY */}
        {step === 'summary' && importResult && (
          <div className="space-y-4">
            {importResult.partialFailure && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900 text-sm">اكتمال جزئي</p>
                  <p className="text-xs text-amber-700 mt-1">
                    تم استيراد بعض الطلاب لكن فشل جزء منهم. يُنصح بمراجعة القائمة والاستيراد مجدداً.
                  </p>
                </div>
              </div>
            )}
            <div className={`rounded-lg border p-6 text-center ${importResult.partialFailure ? 'border-amber-300 bg-amber-50' : 'border-green-300 bg-green-50'}`}>
              <CheckCircle className={`mx-auto mb-4 h-12 w-12 ${importResult.partialFailure ? 'text-amber-500' : 'text-green-600'}`} />
              <h3 className={`text-lg font-bold ${importResult.partialFailure ? 'text-amber-900' : 'text-green-900'}`}>
                {importResult.partialFailure ? 'تم الاستيراد جزئياً' : 'تم الاستيراد بنجاح'}
              </h3>
              <p className="text-sm text-green-700 mt-2">
                تم استيراد <span className="font-bold">{importResult.imported}</span> طالب بنجاح
              </p>
              {importResult.failed > 0 && (
                <p className="text-sm text-red-700 mt-1">
                  فشل استيراد <span className="font-bold">{importResult.failed}</span> طالب
                </p>
              )}
            </div>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        {step === 'upload' && (
          <>
            <div className="mr-auto flex items-center gap-2 text-xs text-gray-500">
              <AlertTriangle className="h-4 w-4" />
              يجب توفر: اسم الطالب والصف في الملف
            </div>
            <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          </>
        )}

        {step === 'preview' && (
          <>
            <div className="mr-auto flex gap-2">
              {(parseResult?.errors.length ?? 0) > 0 && (
                <Button variant="outline" size="sm" onClick={downloadErrorReport}>
                  <Download className="mr-2 h-4 w-4" />
                  تحميل تقرير الأخطاء
                </Button>
              )}
            </div>
            <Button variant="ghost" onClick={handleReset}>رجوع</Button>
            <Button
              disabled={!parseWasCalled || (parseResult?.summary.validRows ?? 0) === 0 || loading}
              onClick={() => {
                setStep('importing');
                handleImport();
              }}
            >
              استيراد الصفوف الصالحة ({parseResult?.summary.validRows ?? 0})
            </Button>
          </>
        )}

        {step === 'summary' && (
          <>
            <Button variant="ghost" onClick={onClose}>إغلاق</Button>
            <Button onClick={handleReset}>استيراد ملف جديد</Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
}
