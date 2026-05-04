"use client";

import { useRef, useState } from "react";
import { Upload, Download, CheckCircle2, AlertTriangle, Loader2 } from "@/lib/icons";
import { useToast } from "@/components/toast";

interface ImportResult {
  successful: number;
  failed: number;
  errors: string[];
}

export function BulkOperationsTab() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("يجب أن يكون الملف بصيغة CSV");
      return;
    }

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/web/super-admin/bulk-import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || "فشل الاستيراد");
      }

      setResult(data);
      toast.success(
        `تم استيراد ${data.successful} سجل بنجاح${
          data.failed > 0 ? ` و فشل ${data.failed} سجل` : ""
        }`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "حدث خطأ أثناء الاستيراد"
      );
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const downloadTemplate = () => {
    const csv =
      "الاسم,البريد الإلكتروني,الهاتف,المدينة,الخطة,الحالة\nمدرسة 1,school1@example.com,+966123456789,الرياض,basic,active\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "template_schools.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Import Section */}
      <div>
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">
          استيراد جماعي
        </h3>
        <div className="rounded-[24px] border-2 border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-8">
          <div className="text-center">
            <Upload className="mx-auto mb-4 text-[var(--text-tertiary)]" size={32} />
            <h4 className="font-bold text-[var(--text-primary)] mb-2">
              استيراد بيانات المدارس
            </h4>
            <p className="text-sm text-[var(--text-tertiary)] mb-6">
              قم بتحميل ملف CSV يحتوي على بيانات المدارس
            </p>

            <div className="flex flex-col gap-3 items-center justify-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 rounded-[18px] border border-blue-500 bg-blue-50 px-6 py-3 font-bold text-blue-600 transition hover:bg-blue-100 disabled:opacity-60"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    جاري المعالجة...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    اختر ملف
                  </>
                )}
              </button>

              <button
                onClick={downloadTemplate}
                className="inline-flex items-center gap-2 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
              >
                <Download size={14} />
                تحميل نموذج
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="flex items-start gap-4">
            {result.failed === 0 ? (
              <CheckCircle2 className="mt-1 text-green-600 flex-shrink-0" size={24} />
            ) : (
              <AlertTriangle className="mt-1 text-yellow-600 flex-shrink-0" size={24} />
            )}
            <div className="flex-1">
              <h4 className="font-bold text-[var(--text-primary)] mb-3">
                نتائج الاستيراد
              </h4>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    السجلات الناجحة
                  </p>
                  <p className="text-2xl font-black text-green-600">
                    {result.successful}
                  </p>
                </div>
                {result.failed > 0 && (
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      السجلات الفاشلة
                    </p>
                    <p className="text-2xl font-black text-red-600">
                      {result.failed}
                    </p>
                  </div>
                )}
              </div>

              {result.errors.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-bold text-[var(--text-secondary)] mb-2">
                    الأخطاء:
                  </p>
                  <ul className="space-y-1 text-xs text-[var(--text-tertiary)]">
                    {result.errors.slice(0, 5).map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                    {result.errors.length > 5 && (
                      <li>• و {result.errors.length - 5} أخطاء أخرى...</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-[24px] border border-blue-200 bg-blue-50 p-6">
        <h4 className="font-bold text-blue-900 mb-3">تنسيق الملف</h4>
        <div className="space-y-2 text-sm text-blue-800">
          <p>يجب أن يحتوي ملف CSV على الأعمدة التالية:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>الاسم (مطلوب)</li>
            <li>البريد الإلكتروني (اختياري)</li>
            <li>الهاتف (اختياري)</li>
            <li>المدينة (اختياري)</li>
            <li>الخطة (basic, premium, enterprise)</li>
            <li>الحالة (active, inactive)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
