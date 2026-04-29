"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Download, AlertTriangle } from "lucide-react";
import { FileUploadZone } from "./FileUploadZone";
import { ProgressTracker } from "./ProgressTracker";
import { ValidationTable } from "./ValidationTable";
import { ImportSummary } from "./ImportSummary";
import { RequiredFieldsNotice } from "./RequiredFieldsNotice";
import { ImportProgress, Class, IMPORT_COLUMN_MAPPING } from "@/lib/students/import-types";
import { loadXLSX } from "@/lib/xlsx-loader";
import { chunkArray } from "@/lib/students/import-processor";

interface BulkImportModalProps {
  show: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

export function BulkImportModal({ show, onClose, onImportComplete }: BulkImportModalProps) {
  const [step, setStep] = useState<'upload' | 'processing' | 'summary'>('upload');
  const [progress, setProgress] = useState<ImportProgress>({
    totalRows: 0,
    processedRows: 0,
    successCount: 0,
    errorCount: 0,
    estimatedTimeRemaining: 0,
    status: 'idle',
    errors: [],
  });

  const [availableClasses, setAvailableClasses] = useState<Class[]>([]);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any[]>([]);
  const [showDebugDetails, setShowDebugDetails] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  // 1. Fetch validation data (Classes & Sections)
  useEffect(() => {
    if (show) {
      setRequestError(null);
      fetch('/api/students/validate')
        .then(async (res) => {
          const payload = await res.json().catch(() => null);
          if (!res.ok) {
            throw new Error(payload?.error?.message || payload?.error || 'تعذر تحميل بيانات الصفوف والشعب');
          }
          const classes = payload?.classes || [];
          console.log(`[Modal] Loaded ${classes.length} classes:`,
            classes.map((c: any) => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn, sections: c.sections?.length || 0 })));
          setAvailableClasses(classes);
        })
        .catch((err) => {
          console.error('Failed to fetch validation data', err);
          setAvailableClasses([]);
          setRequestError(err instanceof Error ? err.message : 'تعذر تحميل بيانات الصفوف والشعب');
        });
    }
  }, [show]);

  const startBulkImport = useCallback(async (rows: Record<string, unknown>[]) => {
    if (rows.length === 0) {
      setStep('summary');
      setProgress(prev => ({ ...prev, status: 'completed' }));
      return;
    }

    const chunks = chunkArray(rows, 1000);
    let successCount = 0;
    let failedCount = 0;

    setProgress(prev => ({ ...prev, status: 'importing', processedRows: 0, successCount: 0, errorCount: prev.errors.length }));

    for (let i = 0; i < chunks.length; i++) {
      try {
        const response = await fetch('/api/students/bulk-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chunk: chunks[i] }),
        });

        const result = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(result?.error?.message || result?.error || 'Failed to import chunk');
        }

        successCount += result.imported;

        setProgress(prev => ({
          ...prev,
          processedRows: Math.min(rows.length, prev.processedRows + chunks[i].length),
          successCount,
        }));
      } catch (error) {
        console.error('Chunk import error:', error);
        failedCount += chunks[i].length;
        setRequestError(error instanceof Error ? error.message : 'تعذر استيراد جزء من الملف');
        setProgress(prev => ({
          ...prev,
          processedRows: Math.min(rows.length, prev.processedRows + chunks[i].length),
          errorCount: prev.errorCount + chunks[i].length,
        }));
      }
    }

    setStep('summary');
    setProgress(prev => ({
      ...prev,
      status: 'completed',
      processedRows: rows.length,
      successCount,
      errorCount: prev.errors.length + failedCount,
    }));
    if (failedCount === 0 && onImportComplete) onImportComplete();
  }, [onImportComplete]);

  // 2. Initialize Web Worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('../../workers/import-worker.ts', import.meta.url));

    workerRef.current.onmessage = (e) => {
      const { action, data } = e.data;
      if (action === 'PROGRESS') {
        setProgress(prev => ({
          ...prev,
          processedRows: data.processedRows,
          totalRows: data.totalRows,
          errorCount: data.errorCount,
          successCount: data.successCount,
        }));
      } else if (action === 'COMPLETED') {
        console.log(`[Modal] Worker completed:`, {
          totalRows: data.totalRows,
          validRows: data.validRows.length,
          errors: data.errors.length,
          debugInfo: data.debugInfo?.slice(0, 5),
          firstErrors: data.errors.slice(0, 5)
        });
        setProgress(prev => ({
          ...prev,
          status: 'importing',
          errors: data.errors,
          errorCount: data.errors.length,
        }));
        setDebugInfo(data.debugInfo || []);
        startBulkImport(data.validRows);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [startBulkImport]);

  const handleFileSelect = async (file: File) => {
    setStep('processing');
    setRequestError(null);
    setProgress(prev => ({ ...prev, status: 'parsing', totalRows: 0, processedRows: 0 }));

    try {
      const XLSX = await loadXLSX();
      const buffer = await file.arrayBuffer();
      const wb = await XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);

      if (rows.length === 0) {
        throw new Error('الملف فارغ');
      }

      setProgress(prev => ({ ...prev, status: 'validating', totalRows: rows.length }));

      workerRef.current?.postMessage({
        action: 'PROCESS_DATA',
        data: {
          rows,
          availableClasses,
          columnMapping: IMPORT_COLUMN_MAPPING
        }
      });

    } catch (error: unknown) {
      console.error('File parsing error:', error);
      setProgress(prev => ({ ...prev, status: 'failed' }));
    }
  };

  const downloadTemplate = () => {
    window.open('/api/students/template', '_blank');
  };

  const handleReset = () => {
    setStep('upload');
    setProgress({
      totalRows: 0,
      processedRows: 0,
      successCount: 0,
      errorCount: 0,
      estimatedTimeRemaining: 0,
      status: 'idle',
      errors: [],
    });
    setDebugInfo([]);
    setShowDebugDetails(false);
  };

  return (
    <Modal open={show} onClose={onClose} size="xl">
      <ModalHeader 
        title="استيراد جماعي للطلاب" 
        onClose={onClose} 
      />

      <ModalBody>
        {requestError && (
          <div className="mb-4 rounded-[var(--radius-lg)] border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
            {requestError}
          </div>
        )}

        {step === 'upload' && (
          <div className="space-y-6">
            <RequiredFieldsNotice />
            
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 ml-2" />
                تحميل نموذج Excel المعتمد
              </Button>
            </div>

            <FileUploadZone onFileSelect={handleFileSelect} />
          </div>
        )}

        {step === 'processing' && (
          <div className="space-y-6">
            <ProgressTracker 
              processed={progress.processedRows}
              total={progress.totalRows}
              success={progress.successCount}
              errors={progress.errorCount}
              status={progress.status}
              onCancel={handleReset}
            />

            {progress.errors.length > 0 && (
              <ValidationTable errors={progress.errors} />
            )}
          </div>
        )}

        {step === 'summary' && (
          <div className="space-y-6">
            <ImportSummary
              success={progress.successCount}
              errors={progress.errorCount}
              onClose={onClose}
              onReset={handleReset}
            />

            {debugInfo.length > 0 && (
              <div className="border border-[var(--border)] rounded-lg p-4">
                <button
                  onClick={() => setShowDebugDetails(!showDebugDetails)}
                  className="flex items-center justify-between w-full text-left font-medium hover:bg-[var(--background-secondary)] p-2 rounded transition-colors"
                >
                  <span>تفاصيل الأخطاء ({debugInfo.length} صف)</span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {showDebugDetails ? '▼' : '▶'}
                  </span>
                </button>

                {showDebugDetails && (
                  <div className="mt-4 space-y-4 max-h-96 overflow-y-auto">
                    {debugInfo.map((item, idx) => (
                      <div key={idx} className="p-3 bg-[var(--background-secondary)] rounded border border-[var(--border)] text-sm">
                        <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                          <div><span className="font-semibold">الصف:</span> {item.rowNumber}</div>
                          <div><span className="font-semibold">الاسم:</span> {item.fullName || '—'}</div>
                          <div><span className="font-semibold">الصف (خام):</span> {item.rawClassName || '—'}</div>
                          <div><span className="font-semibold">الصف (معياري):</span> {item.normalizedClassName || '—'}</div>
                          <div><span className="font-semibold">معرف الصف:</span> {item.matchedClassId || '—'}</div>
                          <div><span className="font-semibold">الشعبة (خام):</span> {item.rawSectionName || '—'}</div>
                          <div><span className="font-semibold">الشعبة (معياري):</span> {item.normalizedSectionName || '—'}</div>
                          <div><span className="font-semibold">معرف الشعبة:</span> {item.matchedSectionId || '—'}</div>
                        </div>
                        <div className="mt-2 p-2 bg-[var(--danger-soft)] rounded border border-[var(--danger)]/20 text-[var(--danger)] text-xs">
                          <span className="font-semibold">السبب:</span> {item.failureReason}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </ModalBody>

      {step === 'upload' && (
        <ModalFooter>
          <div className="mr-auto flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />
            تأكد من صحة البيانات قبل الرفع لتجنب الأخطاء
          </div>
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
        </ModalFooter>
      )}
    </Modal>
  );
}
