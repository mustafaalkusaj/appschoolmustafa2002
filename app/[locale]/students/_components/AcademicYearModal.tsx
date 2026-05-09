"use client";

import { useCallback, useEffect, useState } from "react";
import { GraduationCap, ArrowRight, CheckCircle, AlertCircle, Users, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/brand/brand-utils";

interface PromotionGroup {
  from: string;
  to: string;
  count: number;
  students: { id: string; full_name: string }[];
}

interface StudentEntry {
  id: string;
  full_name: string;
  class_name: string;
  reason?: string;
}

interface PreviewData {
  summary: {
    promotedCount: number;
    skippedCount: number;
    terminalCount: number;
    unrecognizedCount: number;
    missingCount: number;
  };
  promotableGroups: PromotionGroup[];
  terminalStudents: StudentEntry[];
  unrecognizedStudents: StudentEntry[];
  totalActive: number;
}

interface AcademicYearModalProps {
  isOpen: boolean;
  schoolId: string;
  branchId?: string | null;
  onClose: () => void;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<{ response: Response; payload: unknown }>;
}

export function AcademicYearModal({
  isOpen,
  schoolId,
  branchId,
  onClose,
  fetchWithAuth,
}: AcademicYearModalProps) {
  const [step, setStep] = useState<"preview" | "confirm" | "done">("preview");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ promoted: number; graduated: number; feesReset: number; skipped: number } | null>(null);
  const [graduateTerminal, setGraduateTerminal] = useState(true);
  const [resetPaidFee, setResetPaidFee] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState(false);
  const [expandedTerminal, setExpandedTerminal] = useState(false);

  const loadPreview = useCallback(async () => {
    if (!schoolId) return;
    setLoadingPreview(true);
    setError("");
    try {
      const params = new URLSearchParams({ school_id: schoolId });
      if (branchId) params.set("branch_id", branchId);
      const { response, payload } = await fetchWithAuth(`/api/web/students/promote-year?${params.toString()}`);
      const data = payload as Record<string, unknown>;
      if (!response.ok) {
        setError((data?.error as Record<string, unknown>)?.message as string ?? "تعذر تحميل معاينة الترحيل.");
        return;
      }
      setPreview(data as unknown as PreviewData);
    } catch {
      setError("حدث خطأ أثناء تحميل المعاينة.");
    } finally {
      setLoadingPreview(false);
    }
  }, [schoolId, branchId, fetchWithAuth]);

  useEffect(() => {
    if (isOpen) {
      setStep("preview");
      setPreview(null);
      setResult(null);
      setError("");
      setGraduateTerminal(true);
      setResetPaidFee(true);
      setExpandedGroups(false);
      setExpandedTerminal(false);
      void loadPreview();
    }
  }, [isOpen, loadPreview]);

  const handleExecute = async () => {
    setExecuting(true);
    setError("");
    try {
      const { response, payload } = await fetchWithAuth("/api/web/students/promote-year", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_id: schoolId,
          ...(branchId ? { branch_id: branchId } : {}),
          graduate_terminal: graduateTerminal,
          reset_paid_fee: resetPaidFee,
        }),
      });
      const data = payload as Record<string, unknown>;
      if (!response.ok) {
        setError((data?.error as Record<string, unknown>)?.message as string ?? "تعذر تنفيذ الترحيل.");
        return;
      }
      setResult({
        promoted: Number(data.promoted ?? 0),
        graduated: Number(data.graduated ?? 0),
        feesReset: Number(data.feesReset ?? 0),
        skipped: Number(data.skipped ?? 0),
      });
      setStep("done");
    } catch {
      setError("حدث خطأ أثناء تنفيذ الترحيل.");
    } finally {
      setExecuting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-[var(--border)]">
          <div className="p-2.5 rounded-2xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)]">
            <GraduationCap className="h-5 w-5 text-[var(--primary)]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black text-[var(--text-primary)]">ترحيل السنة الدراسية</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {step === "done" ? "تم تنفيذ الترحيل بنجاح" : step === "confirm" ? "مراجعة الخيارات قبل التنفيذ" : "معاينة خطة الترحيل"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-xl font-black px-2"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-[color-mix(in_srgb,var(--danger)_6%,transparent)] border border-[color-mix(in_srgb,var(--danger)_20%,transparent)] text-[var(--danger)] text-sm font-bold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Step: DONE */}
          {step === "done" && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[var(--success)]">
                <CheckCircle className="h-5 w-5" />
                <span className="font-black text-base">تم تنفيذ ترحيل السنة الدراسية</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <ResultCard label="طالب تم ترحيله" value={result.promoted} color="blue" />
                {graduateTerminal && <ResultCard label="طالب تخرج" value={result.graduated} color="green" />}
                {resetPaidFee && <ResultCard label="طالب تم تصفير أقساطهم" value={result.feesReset} color="amber" />}
                {result.skipped > 0 && <ResultCard label="طالب لم يتم ترحيله" value={result.skipped} color="muted" />}
              </div>
              <Button variant="primary" className="w-full" onClick={onClose}>
                إغلاق
              </Button>
            </div>
          )}

          {/* Step: PREVIEW */}
          {step === "preview" && (
            <>
              {loadingPreview ? (
                <div className="flex items-center justify-center gap-2 py-8 text-[var(--text-muted)]">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span className="text-sm font-bold">جاري تحميل المعاينة...</span>
                </div>
              ) : preview ? (
                <div className="space-y-4">
                  {/* Summary cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <SummaryCard label="سيترحل" value={preview.summary.promotedCount} color="blue" icon="→" />
                    <SummaryCard label="سيتخرج (12)" value={preview.summary.terminalCount} color="green" icon="🎓" />
                    <SummaryCard label="غير معروف" value={preview.summary.unrecognizedCount} color="muted" icon="?" />
                  </div>

                  {/* Promotable groups */}
                  {preview.promotableGroups.length > 0 && (
                    <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-4 py-3 bg-[var(--surface-muted)] hover:bg-[var(--surface)] transition-colors"
                        onClick={() => setExpandedGroups((v) => !v)}
                      >
                        <span className="text-sm font-black text-[var(--text-primary)] flex items-center gap-2">
                          <Users className="h-4 w-4 text-[var(--primary)]" />
                          {preview.promotableGroups.length} مجموعة ترحيل ({preview.summary.promotedCount} طالب)
                        </span>
                        {expandedGroups ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      {expandedGroups && (
                        <div className="divide-y divide-[var(--border)]">
                          {preview.promotableGroups.map((group, i) => (
                            <div key={i} className="px-4 py-3 flex items-center gap-3">
                              <span className="text-sm font-bold text-[var(--text-primary)]">{group.from}</span>
                              <ArrowRight className="h-3 w-3 text-[var(--primary)] shrink-0" />
                              <span className="text-sm font-bold text-[var(--primary)]">{group.to}</span>
                              <span className="ms-auto text-xs font-black px-2 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
                                {group.count} طالب
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Terminal students */}
                  {preview.terminalStudents.length > 0 && (
                    <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-4 py-3 bg-[var(--surface-muted)] hover:bg-[var(--surface)] transition-colors"
                        onClick={() => setExpandedTerminal((v) => !v)}
                      >
                        <span className="text-sm font-black text-[var(--text-primary)] flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-emerald-600" />
                          طلاب الصف الثاني عشر ({preview.terminalStudents.length} طالب)
                        </span>
                        {expandedTerminal ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      {expandedTerminal && (
                        <div className="px-4 py-3 flex flex-wrap gap-2">
                          {preview.terminalStudents.slice(0, 20).map((s) => (
                            <span key={s.id} className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {s.full_name}
                            </span>
                          ))}
                          {preview.terminalStudents.length > 20 && (
                            <span className="text-xs text-[var(--text-muted)] font-bold self-center">
                              +{preview.terminalStudents.length - 20} آخرين
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Unrecognized warning */}
                  {preview.unrecognizedStudents.length > 0 && (
                    <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>
                        {preview.unrecognizedStudents.length} طالب بأسماء صفوف غير معروفة لن يتم ترحيلهم تلقائياً. يمكنك تعديل أسماء صفوفهم يدوياً.
                      </span>
                    </div>
                  )}

                  <Button variant="primary" className="w-full" onClick={() => setStep("confirm")}>
                    متابعة إلى الخيارات
                  </Button>
                </div>
              ) : null}
            </>
          )}

          {/* Step: CONFIRM */}
          {step === "confirm" && preview && (
            <div className="space-y-4">
              {/* Options */}
              <div className="space-y-3">
                <h3 className="text-sm font-black text-[var(--text-primary)]">خيارات الترحيل</h3>

                <OptionToggle
                  checked={graduateTerminal}
                  onChange={setGraduateTerminal}
                  label="تعيين طلاب الصف الثاني عشر كـ «خريج»"
                  description={`${preview.terminalStudents.length} طالب سيتغير وضعهم إلى خريج`}
                  color="green"
                />

                <OptionToggle
                  checked={resetPaidFee}
                  onChange={setResetPaidFee}
                  label="تصفير المبالغ المدفوعة للسنة الجديدة"
                  description="يتم إعادة paid_fee إلى صفر لجميع الطلاب النشطين"
                  color="amber"
                />
              </div>

              {/* Warning */}
              <div className="p-3 rounded-2xl bg-[color-mix(in_srgb,var(--danger)_5%,transparent)] border border-[color-mix(in_srgb,var(--danger)_20%,transparent)] text-[var(--danger)] text-xs font-bold flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>هذا الإجراء لا يمكن التراجع عنه. تأكد من أرشفة المدفوعات الحالية أولاً قبل التنفيذ.</span>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep("preview")}>
                  رجوع
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => void handleExecute()}
                  disabled={executing}
                >
                  {executing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      جاري التنفيذ...
                    </>
                  ) : (
                    <>
                      <GraduationCap className="h-4 w-4" />
                      تنفيذ الترحيل
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    green: "bg-emerald-50 border-emerald-200 text-emerald-700",
    muted: "bg-[var(--surface-muted)] border-[var(--border)] text-[var(--text-muted)]",
  };
  return (
    <div className={cn("rounded-2xl border p-3 text-center", colorMap[color] ?? colorMap.muted)}>
      <div className="text-lg font-black">{value}</div>
      <div className="text-xs font-bold mt-0.5 flex items-center justify-center gap-1">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
    </div>
  );
}

function ResultCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    green: "bg-emerald-50 border-emerald-200 text-emerald-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    muted: "bg-[var(--surface-muted)] border-[var(--border)] text-[var(--text-muted)]",
  };
  return (
    <div className={cn("rounded-2xl border p-4 text-center", colorMap[color] ?? colorMap.muted)}>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-xs font-bold mt-1">{label}</div>
    </div>
  );
}

function OptionToggle({
  checked,
  onChange,
  label,
  description,
  color,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
  color: string;
}) {
  const activeColor = color === "green"
    ? "border-emerald-300 bg-emerald-50"
    : color === "amber"
      ? "border-amber-300 bg-amber-50"
      : "border-[var(--primary)]/30 bg-[color-mix(in_srgb,var(--primary)_5%,transparent)]";

  return (
    <label
      className={cn(
        "flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-colors",
        checked ? activeColor : "border-[var(--border)] bg-[var(--surface-muted)]",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded accent-[var(--primary)]"
      />
      <div>
        <div className="text-sm font-black text-[var(--text-primary)]">{label}</div>
        <div className="text-xs font-bold text-[var(--text-muted)] mt-0.5">{description}</div>
      </div>
    </label>
  );
}
