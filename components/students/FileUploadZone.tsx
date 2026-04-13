import React, { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/brand/brand-utils';

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
}

export function FileUploadZone({ onFileSelect, isLoading }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelect(file);
  }, [onFileSelect]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  }, [onFileSelect]);

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "relative border-2 border-dashed rounded-xl p-12 transition-all cursor-pointer group flex flex-col items-center justify-center text-center",
        isDragging 
          ? "border-purple-500 bg-purple-50 dark:bg-purple-900/10" 
          : "border-gray-300 dark:border-gray-700 hover:border-purple-400 hover:bg-gray-50 dark:hover:bg-gray-800/50",
        isLoading && "opacity-50 cursor-not-allowed pointer-events-none"
      )}
      onClick={() => !isLoading && document.getElementById('file-upload')?.click()}
    >
      <input
        id="file-upload"
        type="file"
        className="hidden"
        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
        onChange={onInputChange}
        disabled={isLoading}
      />

      <div className={cn(
        "h-16 w-16 rounded-full flex items-center justify-center mb-4 transition-colors",
        isDragging ? "bg-purple-100 text-purple-600" : "bg-gray-100 dark:bg-gray-800 text-gray-400 group-hover:bg-purple-50 group-hover:text-purple-500"
      )}>
        <FileSpreadsheet className="h-8 w-8" />
      </div>

      <div className="space-y-2">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
          اسحب الملف هنا أو انقر للاختيار
        </h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          يدعم الملفات بتنسيق CSV, XLSX, XLS (بحد أقصى 50,000 سطر)
        </p>
      </div>

      <div className="mt-6 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full border border-amber-100 dark:border-amber-800">
        <AlertCircle className="h-3 w-3" />
        تأكد من مطابقة أسماء الأعمدة للنموذج المطلوب
      </div>
      
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-black/50 rounded-xl flex items-center justify-center backdrop-blur-sm">
          <Upload className="h-8 w-8 text-purple-600 animate-bounce" />
        </div>
      )}
    </div>
  );
}
