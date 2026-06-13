"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import type { TeacherLeave } from "../../../_hooks/useTeacherProfile";

interface Props {
  teacherId: string;
  schoolId: string | null;
  leaves: TeacherLeave[];
  leavesLoading: boolean;
  fetchLeaves: () => Promise<void>;
  canManage: boolean;
  locale: "ar" | "en";
}

const LEAVE_TYPES = [
  { value: "sick", labelAr: "مرضية", labelEn: "Sick" },
  { value: "annual", labelAr: "سنوية", labelEn: "Annual" },
  { value: "emergency", labelAr: "طارئة", labelEn: "Emergency" },
  { value: "unpaid", labelAr: "بدون راتب", labelEn: "Unpaid" },
  { value: "other", labelAr: "أخرى", labelEn: "Other" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  pending: { ar: "قيد المراجعة", en: "Pending" },
  approved: { ar: "موافق عليها", en: "Approved" },
  rejected: { ar: "مرفوضة", en: "Rejected" },
};

const EMPTY_FORM = {
  leave_type: "annual",
  start_date: "",
  end_date: "",
  days_count: 1,
  reason: "",
};

export function LeavesTab({ teacherId, schoolId, leaves, leavesLoading, fetchLeaves, canManage, locale }: Props) {
  const isEn = locale === "en";
  const fetchedRef = useRef(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      void fetchLeaves();
    }
  }, [fetchLeaves]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;
    setSaving(true);
    setFormError("");
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; message?: string }>(
        `/api/web/teachers/${teacherId}/leaves?schoolId=${schoolId}`,
        {
          method: "POST",
          headers: withJsonHeaders(),
          body: JSON.stringify({ ...form, school_id: schoolId }),
        }
      );
      if (response.ok && payload?.ok) {
        setShowForm(false);
        setForm(EMPTY_FORM);
        await fetchLeaves();
      } else {
        setFormError(payload?.message || (isEn ? "Failed to add leave" : "تعذر إضافة الإجازة"));
      }
    } catch {
      setFormError(isEn ? "Error adding leave" : "خطأ في الإضافة");
    } finally {
      setSaving(false);
    }
  };

  const getLeaveTypeLabel = (value: string) => {
    const t = LEAVE_TYPES.find((lt) => lt.value === value);
    return t ? (isEn ? t.labelEn : t.labelAr) : value;
  };

  if (leavesLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-[var(--text-muted)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">{isEn ? "Loading leaves..." : "جاري تحميل الإجازات..."}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[var(--text-primary)]">
          {isEn ? "Leave Records" : "سجل الإجازات"}
        </h3>
        {canManage && (
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? (isEn ? "Cancel" : "إلغاء") : (isEn ? "Add Leave" : "إضافة إجازة")}
          </Button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] shadow-sm p-5 flex flex-col gap-4"
        >
          <h4 className="font-semibold text-[var(--text-primary)] text-sm">
            {isEn ? "New Leave Request" : "طلب إجازة جديد"}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted)]">{isEn ? "Leave Type" : "نوع الإجازة"}</label>
              <select
                className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text-primary)]"
                value={form.leave_type}
                onChange={(e) => setForm((f) => ({ ...f, leave_type: e.target.value }))}
              >
                {LEAVE_TYPES.map((lt) => (
                  <option key={lt.value} value={lt.value}>
                    {isEn ? lt.labelEn : lt.labelAr}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted)]">{isEn ? "Days Count" : "عدد الأيام"}</label>
              <input
                type="number"
                min={1}
                className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text-primary)]"
                value={form.days_count}
                onChange={(e) => setForm((f) => ({ ...f, days_count: Number(e.target.value) }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted)]">{isEn ? "Start Date" : "تاريخ البداية"}</label>
              <DatePicker value={form.start_date || undefined} onChange={(v) => setForm((f) => ({ ...f, start_date: v ?? "" }))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted)]">{isEn ? "End Date" : "تاريخ النهاية"}</label>
              <DatePicker value={form.end_date || undefined} onChange={(v) => setForm((f) => ({ ...f, end_date: v ?? "" }))} />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs text-[var(--text-muted)]">{isEn ? "Reason (optional)" : "السبب (اختياري)"}</label>
              <input
                type="text"
                className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text-primary)]"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              />
            </div>
          </div>
          {formError && <p className="text-sm text-[var(--danger)]">{formError}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? (isEn ? "Saving..." : "جاري الحفظ...") : (isEn ? "Save" : "حفظ")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
              {isEn ? "Cancel" : "إلغاء"}
            </Button>
          </div>
        </form>
      )}

      {leaves.length === 0 ? (
        <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] shadow-sm p-8 flex flex-col items-center gap-3">
          <span className="text-4xl">🏖️</span>
          <p className="text-[var(--text-muted)] text-sm">
            {isEn ? "No leave records found." : "لا توجد سجلات إجازات."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {leaves.map((leave) => {
            const statusColor = STATUS_COLORS[leave.status] ?? "bg-gray-100 text-gray-600 border-gray-200";
            const statusLabel = STATUS_LABELS[leave.status]
              ? (isEn ? STATUS_LABELS[leave.status].en : STATUS_LABELS[leave.status].ar)
              : leave.status;
            return (
              <div
                key={leave.id}
                className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-[var(--text-primary)]">
                      {getLeaveTypeLabel(leave.leave_type)}
                    </span>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusColor}`}>
                      {statusLabel}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {leave.days_count} {isEn ? "days" : "يوم"}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {leave.start_date} → {leave.end_date}
                  </div>
                  {leave.reason && (
                    <div className="text-xs text-[var(--text-muted)] mt-1">{leave.reason}</div>
                  )}
                </div>
                <div className="text-xs text-[var(--text-muted)] flex-shrink-0">
                  {new Date(leave.created_at).toLocaleDateString(isEn ? "en-GB" : "ar-IQ-u-nu-latn")}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
