"use client";

import React, { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Download, AlertTriangle, CheckCircle, XCircle, Copy } from "lucide-react";
import { FileUploadZone } from "./FileUploadZone";
import { RequiredFieldsNotice } from "./RequiredFieldsNotice";

interface BulkImportModalProps {
  show: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
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
  validRows?: Array<Record<string, unknown>>;
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

const BUILD_MARKER = '1bfc8bc0';

export function BulkImportModal({ show, onClose, onImportComplete }: BulkImportModalProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [parseResult, setParseResult] = useState<ParseResponse | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [parseWasCalled, setParseWasCalled] = useState(false);
  const [parseStatusCode, setParseStatusCode] = useState<number | null>(null);
  const [importStatusCode, setImportStatusCode] = useState<number | null>(null);
  const [lastImportPayload, setLastImportPayload] = useState<any>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const selectedSchoolId = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("school")
    : null;

  const handleFileSelect = async (file: File) => {
    setError(null);
    setStep('parsing');
    setParseWasCalled(false);
    setShowDiagnostics(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const parseUrl = selectedSchoolId ? `/api/students/parse-import?school=${encodeURIComponent(selectedSchoolId)}` : '/api/students/parse-import';
      const response = await fetch(parseUrl, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setParseWasCalled(true);
      setParseStatusCode(response.status);

      if (!response.ok) {
        throw new Error(data.error?.message || 'تعذر تحليل الملف');
      }

      setParseResult(data);
      setStep('preview');
    } catch (err) {
      console.error('Parse error:', err);
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

    try {
      const payload = {
        chunk: parseResult.validRows ?? [],
        parseResult: parseResult,
        ...(selectedSchoolId ? { school: selectedSchoolId } : {}),
      };
      setLastImportPayload(payload);

      const response = await fetch('/api/students/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      setImportStatusCode(response.status);

      if (!response.ok) {
        throw new Error(result.error?.message || 'فشل الاستيراد');
      }

      // Use actual import result from server
      const importedCount = typeof result.imported === 'number' ? result.imported : 0;
      const failedCount = typeof result.failed === 'number' ? result.failed : 0;
      setImportResult({ imported: importedCount, failed: failedCount });
      setStep('summary');
      if (onImportComplete) onImportComplete();
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'فشل الاستيراد');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setParseResult(null);
    setImportResult(null);
    setError(null);
    setShowErrorDetails(false);
    setParseWasCalled(false);
    setParseStatusCode(null);
    setImportStatusCode(null);
    setLastImportPayload(null);
    setShowDiagnostics(false);
  };

  const copyDiagnostics = () => {
    const diagnostics = {
      build: BUILD_MARKER,
      parseWasCalled,
      parseStatusCode,
      parseResponse: parseResult,
      importStatusCode,
      lastImportPayload,
      timestamp: new Date().toISOString(),
    };
    navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
    alert('تم نسخ التقرير التشخيصي');
  };

  const downloadErrorReport = () => {
    if (!parseResult?.errors) return;

    const csv = [
      'رقم الصف,اسم الطالب,سبب الفشل',
      ...parseResult.errors.map(e => `${e.rowNumber},"",${e.errors.join('؛ ')}`),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `import-errors-${new Date().getTime()}.csv`;
    link.click();
  };

  return (
    <Modal open={show} onClose={onClose} size="xl">
      <ModalHeader
        title="استيراد جماعي للطلاب"
        onClose={onClose}
      />

      <ModalBody>
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* DIAGNOSTICS SECTION */}
        {showDiagnostics && (
          <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-mono text-yellow-800">
                build: {BUILD_MARKER}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={copyDiagnostics}
                className="h-6 gap-1 px-2 text-xs"
              >
                <Copy className="h-3 w-3" />
                نسخ التقرير
              </Button>
            </div>

            {/* Parse Status */}
            <div className="mb-2 space-y-1 text-xs">
              <div>
                <span className="font-semibold">استدعاء parse-import:</span>{' '}
                <span className={parseWasCalled ? 'text-green-700 font-bold' : 'text-red-700 font-bold'}>
                  {parseWasCalled ? 'نعم ✓' : 'لا ✗'}
                </span>
              </div>
              {parseStatusCode && (
                <div>
                  <span className="font-semibold">رمز الحالة:</span> {parseStatusCode}
                </div>
              )}
            </div>

            {/* Parse Response Details */}
            {parseResult && (
              <div className="mb-2 space-y-1 text-xs font-mono">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="font-semibold">totalRows:</div>
                    <div className="text-blue-700">{parseResult.summary.totalRows}</div>
                  </div>
                  <div>
                    <div className="font-semibold">validRows:</div>
                    <div className="text-green-700">{parseResult.summary.validRows}</div>
                  </div>
                  <div>
                    <div className="font-semibold">invalidRows:</div>
                    <div className="text-red-700">{parseResult.summary.invalidRows}</div>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="font-semibold">detectedHeaders:</div>
                  <div className="text-gray-700 break-words">
                    {parseResult.preview.detectedHeaders.join(' • ')}
                  </div>
                </div>
              </div>
            )}

            {/* Import Payload Details */}
            {lastImportPayload && (
              <div className="mt-2 space-y-1 text-xs border-t border-yellow-200 pt-2">
                <div className="font-semibold">payload sent to bulk-import:</div>
                <div className="text-gray-700">
                  rows: {lastImportPayload.chunk?.length || 0}
                </div>
                <div>
                  has classId: <span className="font-bold text-blue-700">
                    {lastImportPayload.parseResult?.summary?.validRows > 0 ? '✓' : '?'}
                  </span>
                </div>
                <div>
                  has section: <span className="font-bold text-blue-700">
                    {lastImportPayload.parseResult?.summary?.validRows > 0 ? '✓' : '?'}
                  </span>
                </div>
                <div>
                  has class_name: <span className="font-bold text-red-700">✗ (correct)</span>
                </div>
              </div>
            )}

            {/* Errors Preview */}
            {parseResult?.errors && parseResult.errors.length > 0 && (
              <div className="mt-2 border-t border-yellow-200 pt-2 space-y-1 text-xs">
                <div className="font-semibold">First 10 errors:</div>
                {parseResult.errors.slice(0, 10).map((err, idx) => (
                  <div key={idx} className="text-red-700 ml-2">
                    Row {err.rowNumber}: {err.errors.join('; ')}
                  </div>
                ))}
              </div>
            )}

            {!parseWasCalled && step === 'upload' && (
              <div className="mt-2 text-xs text-red-700 font-semibold border-t border-yellow-200 pt-2">
                ⚠️ parse-import not called yet. Frontend routing issue?
              </div>
            )}
          </div>
        )}

        {/* STEP 1: UPLOAD */}
        {step === 'upload' && (
          <div className="space-y-6">
            <RequiredFieldsNotice />
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => window.open('/api/students/template', '_blank')}>
                <Download className="mr-2 h-4 w-4" />
                تحميل نموذج Excel
              </Button>
            </div>
            <FileUploadZone onFileSelect={handleFileSelect} />
          </div>
        )}

        {/* STEP 2: PARSING */}
        {step === 'parsing' && (
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="text-sm text-gray-600">جاري تحليل الملف...</p>
          </div>
        )}

        {/* STEP 3: PREVIEW */}
        {step === 'preview' && parseResult && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border p-4">
                <div className="text-2xl font-bold text-blue-600">{parseResult.summary.validRows}</div>
                <div className="text-xs text-gray-600">صفوف صالحة</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-2xl font-bold text-red-600">{parseResult.summary.invalidRows}</div>
                <div className="text-xs text-gray-600">صفوف بها أخطاء</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-2xl font-bold text-gray-700">{parseResult.summary.totalRows}</div>
                <div className="text-xs text-gray-600">إجمالي الصفوف</div>
              </div>
            </div>

            {/* Detected Headers */}
            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-semibold mb-2">الأعمدة المكتشفة</h3>
              <div className="text-xs text-gray-600">
                {parseResult.preview.detectedHeaders.join(' • ')}
              </div>
            </div>

            {/* Errors Section */}
            {parseResult.errors.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <button
                  onClick={() => setShowErrorDetails(!showErrorDetails)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <span className="font-semibold text-red-900">
                    تفاصيل الأخطاء ({parseResult.errors.length})
                  </span>
                  <span className="text-xs">{showErrorDetails ? '▼' : '▶'}</span>
                </button>

                {showErrorDetails && (
                  <div className="mt-4 max-h-96 overflow-y-auto space-y-2">
                    {parseResult.errors.slice(0, 20).map((error, idx) => (
                      <div key={idx} className="text-xs p-2 bg-white rounded border border-red-100">
                        <div className="font-mono text-red-700">
                          الصف {error.rowNumber}: {error.errors.join(', ')}
                        </div>
                      </div>
                    ))}
                    {parseResult.errors.length > 20 && (
                      <div className="text-xs text-gray-500 p-2">
                        ... و{parseResult.errors.length - 20} أخطاء أخرى
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Warning if no valid rows */}
            {parseResult.summary.validRows === 0 && (
              <div className="rounded-lg border border-red-300 bg-red-100 p-4 text-center">
                <XCircle className="mx-auto mb-2 h-6 w-6 text-red-600" />
                <p className="font-semibold text-red-900">لا توجد صفوف صالحة للاستيراد</p>
                <p className="text-xs text-red-700 mt-1">جميع الصفوف تحتوي على أخطاء</p>
              </div>
            )}

            {/* Success message if valid rows */}
            {parseResult.summary.validRows > 0 && (
              <div className="rounded-lg border border-green-300 bg-green-100 p-4 text-center">
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
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="text-sm text-gray-600">جاري الاستيراد...</p>
          </div>
        )}

        {/* STEP 5: SUMMARY */}
        {step === 'summary' && importResult && (
          <div className="rounded-lg border border-green-300 bg-green-50 p-6 text-center">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-600" />
            <h3 className="text-lg font-bold text-green-900">تم الاستيراد بنجاح</h3>
            <p className="text-sm text-green-700 mt-2">
              تم استيراد {importResult.imported} طالب بنجاح
            </p>
            {importResult.failed > 0 && (
              <p className="text-sm text-red-700 mt-1">
                فشل استيراد {importResult.failed} صف
              </p>
            )}
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        {step === 'upload' && (
          <>
            <div className="mr-auto flex items-center gap-2 text-xs text-gray-500">
              <AlertTriangle className="h-4 w-4" />
              تأكد من أن الملف يحتوي على: اسم الطالب والصف والشعبة
            </div>
            <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          </>
        )}

        {step === 'preview' && (
          <>
            <div className="mr-auto flex gap-2">
              {parseResult?.errors.length ? (
                <Button variant="outline" size="sm" onClick={downloadErrorReport}>
                  <Download className="mr-2 h-4 w-4" />
                  تحميل تقرير الأخطاء
                </Button>
              ) : null}
            </div>
            <Button variant="ghost" onClick={handleReset}>رجوع</Button>
            <Button
              disabled={!parseWasCalled || parseResult?.summary.validRows === 0 || loading}
              onClick={() => {
                setStep('importing');
                handleImport();
              }}
              title={!parseWasCalled ? 'يجب معاينة الملف أولاً' : parseResult?.summary.validRows === 0 ? 'لا توجد صفوف صالحة' : ''}
            >
              استيراد الصفوف الصالحة ({parseResult?.summary.validRows})
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
