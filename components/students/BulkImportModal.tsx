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
          setAvailableClasses(payload?.classes || []);
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
        setProgress(prev => ({
          ...prev,
          status: 'importing',
          errors: data.errors,
          errorCount: data.errors.length,
        }));
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
          <ImportSummary 
            success={progress.successCount}
            errors={progress.errorCount}
            onClose={onClose}
            onReset={handleReset}
          />
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
