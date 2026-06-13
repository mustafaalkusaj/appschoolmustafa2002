"use client";

import { useState } from "react";
import { CalendarEvent, EVENT_TYPE_CONFIG } from "../_hooks/useCalendarEvents";
import { X, Plus, Loader2 } from "@/lib/icons";
import { DatePicker } from "@/components/ui/date-picker";
import {
  fetchJsonWithAuthorizedSession,
  withJsonHeaders,
} from "@/lib/authorized-api";

type Props = {
  date: string | null;
  events: CalendarEvent[];
  canManage: boolean;
  schoolId: string | null | undefined;
  onClose: () => void;
  onCreated: () => void;
};

const EVENT_TYPES = [
  { value: "holiday", label: "عطلة رسمية" },
  { value: "religious", label: "مناسبة دينية" },
  { value: "national", label: "يوم وطني" },
  { value: "exam", label: "امتحانات" },
  { value: "vacation", label: "إجازة مدرسية" },
  { value: "school", label: "حدث مدرسي" },
  { value: "custom", label: "مخصص" },
];

type FormState = {
  title: string;
  end_date: string;
  type: string;
  hijri_date: string;
  description: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  end_date: "",
  type: "school",
  hijri_date: "",
  description: "",
};

export function EventModal({
  date,
  events,
  canManage,
  schoolId,
  onClose,
  onCreated,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const dateLabel = date
    ? new Date(date).toLocaleDateString("ar-IQ-u-nu-latn", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !form.title.trim() || !form.type) return;
    setSaving(true);
    setError("");

    const { response, payload } = await fetchJsonWithAuthorizedSession<{
      ok: boolean;
      error?: { message: string };
    }>("/api/web/calendar/events", {
      method: "POST",
      headers: withJsonHeaders(),
      body: JSON.stringify({
        title: form.title.trim(),
        end_date: form.end_date || undefined,
        type: form.type,
        hijri_date: form.hijri_date || undefined,
        description: form.description || undefined,
        date,
        school_id: schoolId,
      }),
    });

    setSaving(false);

    if (!response.ok) {
      setError(
        (payload as { error?: { message: string } })?.error?.message ??
          "خطأ في حفظ الحدث",
      );
      return;
    }

    setForm(EMPTY_FORM);
    setShowForm(false);
    onCreated();
  }

  function updateForm(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-[var(--card-bg)] rounded-2xl shadow-2xl border border-[var(--border)] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h3 className="font-black text-[var(--text-primary)]">
              أحداث اليوم
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {dateLabel}
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[var(--surface-soft)] transition text-[var(--text-muted)]"
            aria-label="إغلاق"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3 custom-scrollbar">
          {events.length === 0 && !showForm && (
            <p className="text-center text-sm text-[var(--text-muted)] py-8 font-bold">
              لا توجد أحداث في هذا اليوم
            </p>
          )}

          {events.map((ev) => {
            const cfg = EVENT_TYPE_CONFIG[ev.type];
            return (
              <div
                key={ev.id}
                className="rounded-xl p-3.5 border"
                style={{
                  backgroundColor: cfg.bg,
                  borderColor: cfg.border,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p
                      className="font-black text-sm"
                      style={{ color: cfg.color }}
                    >
                      {ev.title}
                    </p>
                    {ev.hijri_date && (
                      <p
                        className="text-[11px] mt-0.5"
                        style={{ color: cfg.color, opacity: 0.7 }}
                      >
                        {ev.hijri_date}
                      </p>
                    )}
                    {ev.description && (
                      <p
                        className="text-xs mt-1.5 leading-relaxed"
                        style={{ color: cfg.color, opacity: 0.85 }}
                      >
                        {ev.description}
                      </p>
                    )}
                  </div>
                  <span
                    className="text-[10px] font-black px-2 py-0.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: cfg.color + "20",
                      color: cfg.color,
                    }}
                  >
                    {cfg.label}
                  </span>
                </div>
                {ev.end_date && ev.end_date !== ev.date && (
                  <p
                    className="text-[10px] mt-2 font-bold"
                    style={{ color: cfg.color, opacity: 0.6 }}
                  >
                    حتى: {new Date(ev.end_date).toLocaleDateString("ar-IQ-u-nu-latn")}
                  </p>
                )}
                {ev.is_global && (
                  <p
                    className="text-[10px] mt-1 font-bold"
                    style={{ color: cfg.color, opacity: 0.5 }}
                  >
                    🇮🇶 حدث وطني عراقي
                  </p>
                )}
              </div>
            );
          })}

          {showForm && (
            <form
              onSubmit={(e) => void handleCreate(e)}
              className="space-y-3 pt-3 border-t border-[var(--border)]"
            >
              <p className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">
                إضافة حدث جديد
              </p>
              <input
                required
                placeholder="عنوان الحدث *"
                className="w-full h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 text-sm outline-none focus:border-[var(--primary)] transition"
                value={form.title}
                onChange={(e) => updateForm("title", e.target.value)}
              />
              <select
                className="w-full h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 text-sm outline-none focus:border-[var(--primary)] transition"
                value={form.type}
                onChange={(e) => updateForm("type", e.target.value)}
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <DatePicker value={form.end_date || undefined} onChange={(v) => updateForm("end_date", v ?? "")} />
              <input
                placeholder="التاريخ الهجري (اختياري)"
                className="w-full h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 text-sm outline-none focus:border-[var(--primary)] transition"
                value={form.hijri_date}
                onChange={(e) => updateForm("hijri_date", e.target.value)}
              />
              <textarea
                placeholder="الوصف (اختياري)"
                rows={2}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] transition resize-none"
                value={form.description}
                onChange={(e) => updateForm("description", e.target.value)}
              />
              {error && (
                <p className="text-xs text-[var(--danger)] font-bold">{error}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 h-10 rounded-xl font-black text-sm text-white disabled:opacity-50 transition flex items-center justify-center gap-2"
                  style={{ background: "var(--primary)" }}
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    "حفظ الحدث"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setError("");
                  }}
                  className="px-4 h-10 rounded-xl bg-[var(--surface-soft)] text-[var(--text-secondary)] font-black text-sm transition hover:bg-[var(--surface-muted)]"
                >
                  إلغاء
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer: Add button */}
        {canManage && !showForm && (
          <div className="px-5 pb-5">
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border-2 border-dashed border-[var(--border)] text-sm font-black text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition"
            >
              <Plus size={15} />
              إضافة حدث في هذا اليوم
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
