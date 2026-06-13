"use client";

import { useRef, useState } from "react";
import { Upload, Download, CheckCircle2, AlertTriangle, Loader2, FileDown } from "@/lib/icons";
import { useToast } from "@/components/toast";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";

interface ImportResult {
  successful: number;
  failed: number;
  errors: string[];
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function BulkOperationsTab() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [exportingSchools, setExportingSchools] = useState(false);
  const [exportingUsers, setExportingUsers] = useState(false);

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
    downloadCSV(
      "الاسم,البريد الإلكتروني,الهاتف,المدينة,الخطة,الحالة\nمدرسة 1,school1@example.com,+966123456789,الرياض,basic,active\n",
      "template_schools.csv",
    );
  };

  const downloadUsersTemplate = () => {
    downloadCSV(
      "الاسم الكامل,البريد الإلكتروني,الهاتف,الدور,معرف المدرسة\nاسم المستخدم,user@school.com,+9641234567,admin,\n",
      "template_users.csv",
    );
  };

  const exportSchools = async () => {
    setExportingSchools(true);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        schools?: Array<Record<string, unknown>>;
        error?: { message?: string };
      }>("/api/web/super-admin/schools");
      if (!response.ok) throw new Error(payload?.error?.message ?? "تعذر التصدير.");
      const schools = (payload?.schools ?? []) as Array<Record<string, string>>;
      const headers = ["id", "name", "city", "phone", "owner_email", "plan", "is_active", "created_at"];
      const rows = schools.map((s) => headers.map((h) => JSON.stringify(s[h] ?? "")).join(","));
      downloadCSV([headers.join(","), ...rows].join("\n"), `schools-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success(`تم تصدير ${schools.length} مدرسة ✓`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر التصدير.");
    } finally {
      setExportingSchools(false);
    }
  };

  const exportUsers = async () => {
    setExportingUsers(true);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        users?: Array<Record<string, unknown>>;
        error?: { message?: string };
      }>("/api/web/super-admin/overview");
      if (!response.ok) throw new Error(payload?.error?.message ?? "تعذر التصدير.");
      const users = (payload?.users ?? []) as Array<Record<string, string>>;
      const headers = ["id", "full_name", "email", "role", "school_id", "is_active", "created_at"];
      const rows = users.map((u) => headers.map((h) => JSON.stringify(u[h] ?? "")).join(","));
      downloadCSV([headers.join(","), ...rows].join("\n"), `users-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success(`تم تصدير ${users.length} مستخدم ✓`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر التصدير.");
    } finally {
      setExportingUsers(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Export section ────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 mb-3">
          <FileDown size={13} className="text-[var(--text-muted)]" />
          <span className="text-xs font-black text-[var(--text-primary)]">تصدير البيانات</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => void exportSchools()}
            disabled={exportingSchools}
            className="flex items-center gap-2 rounded border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-[11px] font-black text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] disabled:opacity-50"
          >
            {exportingSchools ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            تصدير المدارس CSV
          </button>
          <button
            onClick={() => void exportUsers()}
            disabled={exportingUsers}
            className="flex items-center gap-2 rounded border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-[11px] font-black text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] disabled:opacity-50"
          >
            {exportingUsers ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            تصدير المستخدمين CSV
          </button>
        </div>
      </div>

      {/* ── Import section ────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border)] mb-3">
          <span className="text-xs font-black text-[var(--text-primary)]">استيراد جماعي للمدارس</span>
        </div>

      {/* Upload area — compact flat */}
      <div className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-4">
        <div className="flex items-center gap-3">
          <Upload size={16} className="text-[var(--text-muted)] shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-black text-[var(--text-primary)]">استيراد بيانات المدارس من CSV</p>
            <p className="text-[11px] text-[var(--text-muted)]">أعمدة مطلوبة: الاسم، الخطة (basic/premium/enterprise)، الحالة (active/inactive)</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-1 text-[11px] font-black text-[var(--text-muted)] hover:text-[var(--primary)]"
            >
              <Download size={12} />
              نموذج
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex items-center gap-1 rounded border border-[var(--primary)] bg-[var(--primary)]/10 px-3 py-1.5 text-[11px] font-black text-[var(--primary)] hover:bg-[var(--primary)]/20 disabled:opacity-60"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  جاري المعالجة...
                </>
              ) : (
                <>
                  <Upload size={12} />
                  اختر ملف
                </>
              )}
            </button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Format info */}
      <div className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
        <p className="text-[11px] font-black text-[var(--text-secondary)] mb-1">تنسيق الملف</p>
        <div className="grid grid-cols-2 gap-x-4 text-[10px] text-[var(--text-muted)]">
          <span>• الاسم (مطلوب)</span>
          <span>• البريد الإلكتروني (اختياري)</span>
          <span>• الهاتف (اختياري)</span>
          <span>• المدينة (اختياري)</span>
          <span>• الخطة: basic / premium / enterprise</span>
          <span>• الحالة: active / inactive</span>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="rounded-md border border-[var(--border)] p-3">
          <div className="flex items-center gap-2 mb-2">
            {result.failed === 0
              ? <CheckCircle2 size={14} className="text-green-600 shrink-0" />
              : <AlertTriangle size={14} className="text-yellow-600 shrink-0" />}
            <span className="text-xs font-black text-[var(--text-primary)]">نتائج الاستيراد</span>
          </div>
          <div className="flex items-center gap-4 text-xs mb-2">
            <span>
              ناجح: <span className="font-black text-green-600">{result.successful}</span>
            </span>
            {result.failed > 0 && (
              <span>
                فاشل: <span className="font-black text-red-600">{result.failed}</span>
              </span>
            )}
          </div>
          {result.errors.length > 0 && (
            <div>
              <p className="text-[11px] font-black text-[var(--text-secondary)] mb-1">الأخطاء:</p>
              <ul className="space-y-0.5 text-[10px] text-[var(--text-muted)]">
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
      )}
      </div>{/* close import section div */}

      {/* ── Users template section ─────────────────────── */}
      <div>
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border)] mb-3">
          <span className="text-xs font-black text-[var(--text-primary)]">نموذج استيراد المستخدمين</span>
        </div>
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-4">
          <div className="flex items-center gap-3">
            <Upload size={16} className="text-[var(--text-muted)] shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-black text-[var(--text-primary)]">تحميل نموذج CSV للمستخدمين</p>
              <p className="text-[11px] text-[var(--text-muted)]">أعمدة: الاسم الكامل، البريد، الهاتف، الدور، معرف المدرسة</p>
            </div>
            <button
              onClick={downloadUsersTemplate}
              className="flex items-center gap-1 text-[11px] font-black text-[var(--text-muted)] hover:text-[var(--primary)]"
            >
              <Download size={12} />
              نموذج
            </button>
          </div>
        </div>
        <div className="mt-2 rounded-md border border-[var(--warning)]/20 bg-[var(--warning)]/5 px-3 py-2">
          <p className="text-[10px] text-[var(--warning)] font-bold">
            ملاحظة: استيراد المستخدمين يتطلب إنشاء حسابات Supabase Auth — يُنجز يدوياً عبر لوحة Supabase أو بواسطة الدعم التقني.
          </p>
        </div>
      </div>
    </div>
  );
}
