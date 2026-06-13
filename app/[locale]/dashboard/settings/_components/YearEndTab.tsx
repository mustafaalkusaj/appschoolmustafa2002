"use client";

import { useEffect, useRef, useState } from "react";
import { fetchWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { AlertTriangle, GraduationCap, Loader2 } from "@/lib/icons";

type PreviewData = {
  total_students: number;
  graduating_students: number;
  classes_list: { name: string; count: number }[];
  will_reset_fees: boolean;
};

type ExecuteResult = {
  promoted_count: number;
  graduated_count: number;
  fees_reset_count: number;
};

interface YearEndTabProps {
  schoolId: string;
}

export function YearEndTab({ schoolId }: YearEndTabProps) {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const [promoteStudents, setPromoteStudents] = useState(true);
  const [resetFees, setResetFees] = useState(true);

  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");

  const [executing, setExecuting] = useState(false);
  const [execError, setExecError] = useState("");
  const [result, setResult] = useState<ExecuteResult | null>(null);

  const confirmRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!schoolId) return;
    setPreviewLoading(true);
    setPreviewError("");
    void fetchWithAuthorizedSession(`/api/web/year-end/preview?schoolId=${schoolId}`)
      .then(async (res) => {
        const json = await res.json() as PreviewData & { error?: { message?: string } };
        if (!res.ok) {
          setPreviewError(json?.error?.message ?? "تعذر تحميل البيانات.");
        } else {
          setPreview(json);
        }
      })
      .catch(() => setPreviewError("تعذر الاتصال بالخادم."))
      .finally(() => setPreviewLoading(false));
  }, [schoolId]);

  useEffect(() => {
    if (showConfirm) {
      setConfirmInput("");
      setTimeout(() => confirmRef.current?.focus(), 50);
    }
  }, [showConfirm]);

  const handleExecute = async () => {
    if (confirmInput !== "تأكيد") return;
    setExecuting(true);
    setExecError("");
    try {
      const res = await fetchWithAuthorizedSession("/api/web/year-end/execute", {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify({
          schoolId,
          options: { promoteStudents, resetFees, notifyParents: false },
        }),
      });
      const json = await res.json() as ExecuteResult & { error?: { message?: string } };
      if (!res.ok) {
        setExecError(json?.error?.message ?? "فشلت العملية.");
      } else {
        setResult(json);
        setShowConfirm(false);
      }
    } catch {
      setExecError("تعذر الاتصال بالخادم.");
    } finally {
      setExecuting(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center space-y-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mx-auto">
            <GraduationCap size={32} className="text-green-700" />
          </div>
          <h3 className="text-lg font-black text-green-800">تمت المعالجة بنجاح</h3>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <ResultCard label="طلاب مُرفَّعون" value={result.promoted_count} color="blue" />
            <ResultCard label="طلاب مُخرَّجون" value={result.graduated_count} color="green" />
            <ResultCard label="رسوم أُعيد ضبطها" value={result.fees_reset_count} color="amber" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Warning banner */}
      <div className="flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
        <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 leading-relaxed">
          هذه العملية تؤثر على جميع الطلاب — تأكد من مراجعة البيانات قبل المتابعة
        </p>
      </div>

      {/* Preview section */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-6 space-y-4">
        <h2 className="text-base font-bold text-[var(--text-primary)]">معاينة البيانات</h2>

        {previewLoading && (
          <div className="flex items-center justify-center h-24">
            <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
          </div>
        )}

        {previewError && (
          <p className="text-sm text-[var(--danger)]">{previewError}</p>
        )}

        {!previewLoading && preview && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 text-center">
                <p className="text-2xl font-black text-[var(--primary)]">{preview.total_students}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">إجمالي الطلاب</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 text-center">
                <p className="text-2xl font-black text-green-600">{preview.graduating_students}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">طلاب مُخرَّجون</p>
              </div>
            </div>

            {preview.classes_list.length > 0 && (
              <div>
                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  توزيع الصفوف
                </p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                  {preview.classes_list.map((cls) => (
                    <div
                      key={cls.name}
                      className="flex items-center justify-between rounded-lg px-3 py-2 bg-[var(--surface-soft)]"
                    >
                      <span className="text-sm text-[var(--text-primary)]">{cls.name}</span>
                      <span className="text-sm font-bold text-[var(--text-secondary)]">{cls.count} طالب</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Options */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-6 space-y-4">
        <h2 className="text-base font-bold text-[var(--text-primary)]">خيارات المعالجة</h2>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={promoteStudents}
            onChange={(e) => setPromoteStudents(e.target.checked)}
            className="w-4 h-4 accent-[var(--primary)]"
          />
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">ترفيع جميع الطلاب للصف الأعلى</p>
            <p className="text-xs text-[var(--text-muted)]">طلاب الصف السادس سيتم تخريجهم</p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={resetFees}
            onChange={(e) => setResetFees(e.target.checked)}
            className="w-4 h-4 accent-[var(--primary)]"
          />
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">إعادة تصفير الرسوم المدفوعة</p>
            <p className="text-xs text-[var(--text-muted)]">سيتم ضبط paid_fee على صفر لجميع الطلاب النشطين</p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-not-allowed opacity-50 select-none" title="قريباً">
          <input type="checkbox" disabled className="w-4 h-4" />
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">إرسال إشعار لأولياء الأمور</p>
            <p className="text-xs text-[var(--text-muted)]">قريباً — غير متاح حالياً</p>
          </div>
        </label>
      </div>

      {/* Execute button */}
      <button
        onClick={() => setShowConfirm(true)}
        disabled={!promoteStudents && !resetFees}
        className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-white font-black text-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: "#dc2626" }}
      >
        بدء معالجة نهاية السنة
      </button>

      {/* Confirmation modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowConfirm(false); }}
        >
          <div className="w-full max-w-md bg-[var(--card-bg)] rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-100 flex-shrink-0">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-[var(--text-primary)]">هل أنت متأكد؟</h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">لا يمكن التراجع عن هذه العملية</p>
              </div>
            </div>

            <p className="text-sm text-[var(--text-secondary)]">
              اكتب <strong className="text-[var(--danger)]">تأكيد</strong> في الحقل أدناه لتفعيل زر البدء.
            </p>

            <input
              ref={confirmRef}
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="اكتب: تأكيد"
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition"
            />

            {execError && (
              <p className="text-sm text-[var(--danger)]">{execError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-xl border border-[var(--border)] py-2.5 text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] transition"
              >
                إلغاء
              </button>
              <button
                onClick={handleExecute}
                disabled={confirmInput !== "تأكيد" || executing}
                className="flex-1 rounded-xl py-2.5 text-white text-sm font-black transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: "#dc2626" }}
              >
                {executing && <Loader2 size={14} className="animate-spin" />}
                {executing ? "جاري التنفيذ..." : "بدء المعالجة"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "blue" | "green" | "amber";
}) {
  const colorMap = {
    blue: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    green: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
    amber: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  };
  const c = colorMap[color];
  return (
    <div className={`rounded-xl border p-4 text-center ${c.bg} ${c.border}`}>
      <p className={`text-2xl font-black ${c.text}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
