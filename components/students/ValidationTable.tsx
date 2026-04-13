import React from 'react';
import { ValidationError } from '@/lib/students/import-types';
import { AlertTriangle, AlertCircle } from 'lucide-react';

interface ValidationTableProps {
  errors: ValidationError[];
}

export function ValidationTable({ errors }: ValidationTableProps) {
  if (errors.length === 0) return null;

  return (
    <div className="mt-4 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-strong)] shadow-[var(--shadow-xs)]">
      <div className="border-b border-[var(--border)] bg-[var(--danger-soft)] p-4">
        <h5 className="flex items-center gap-2 font-semibold text-[var(--danger)]">
          <AlertCircle className="h-5 w-5" />
          تم العثور على {errors.length} خطأ/تنبيه
        </h5>
      </div>
      <div className="max-h-60 overflow-y-auto custom-scrollbar">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[var(--surface-muted)]">
            <tr>
              <th className="px-4 py-2 text-start font-medium text-[var(--text-secondary)]">السطر</th>
              <th className="px-4 py-2 text-start font-medium text-[var(--text-secondary)]">الحقل</th>
              <th className="px-4 py-2 text-start font-medium text-[var(--text-secondary)]">الخطأ</th>
              <th className="px-4 py-2 text-start font-medium text-[var(--text-secondary)]">القيمة</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {errors.map((error, idx) => (
              <tr key={idx} className="hover:bg-[var(--surface-muted)]/70">
                <td className="px-4 py-2 font-mono text-[var(--text-secondary)]">{error.row}</td>
                <td className="px-4 py-2 font-medium">
                  {error.severity === 'error' ? (
                    <span className="flex items-center gap-1 text-[var(--danger)]">
                      <AlertCircle className="h-3 w-3" />
                      {error.field}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[var(--warning)]">
                      <AlertTriangle className="h-3 w-3" />
                      {error.field}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <div className="text-[var(--text-primary)]">{error.error}</div>
                  {error.suggestion && (
                    <div className="mt-1 text-xs italic text-[var(--primary)]">
                      {error.suggestion}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2 font-mono text-xs text-[var(--text-secondary)]">
                  {error.value !== undefined && error.value !== null ? String(error.value) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
