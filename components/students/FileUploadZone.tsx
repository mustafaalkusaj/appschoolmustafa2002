import React, { useCallback, useState } from "react";
import { FileSpreadsheet, Info } from "lucide-react";

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

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => !isLoading && document.getElementById("bulk-file-upload")?.click()}
      className={[
        "relative rounded-2xl border-2 border-dashed p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-200",
        isLoading ? "opacity-50 cursor-not-allowed pointer-events-none" : "",
        isDragging
          ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_6%,transparent)] scale-[1.01]"
          : "border-[var(--border)] bg-[var(--surface-soft)] hover:border-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_4%,transparent)]",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <input
        id="bulk-file-upload"
        type="file"
        className="hidden"
        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
        onChange={onInputChange}
        disabled={isLoading}
      />

      <div
        className={[
          "h-16 w-16 rounded-2xl flex items-center justify-center transition-colors",
          isDragging
            ? "bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] text-[var(--primary)]"
            : "bg-[var(--border)] text-[var(--text-muted)]",
        ].join(" ")}
      >
        <FileSpreadsheet size={32} />
      </div>

      <div className="text-center space-y-1">
        <p className="text-base font-black text-[var(--text-primary)]">
          {isDragging ? "أفلت الملف هنا" : "اسحب الملف هنا أو انقر للاختيار"}
        </p>
        <p className="text-sm text-[var(--text-muted)]">
          يدعم CSV, XLSX, XLS · بحد أقصى 50,000 سطر
        </p>
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border"
        style={{
          background: "color-mix(in srgb, var(--warning) 8%, transparent)",
          borderColor: "color-mix(in srgb, var(--warning) 20%, transparent)",
          color: "var(--warning)",
        }}
      >
        <Info size={12} />
        تأكد من مطابقة أسماء الأعمدة للنموذج المطلوب
      </div>
    </div>
  );
}
