"use client";

import { useEffect, useState } from "react";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import type { SchoolRecord } from "./types";

type ReceiptConfig = {
  decoration_top_left: string | null;
  decoration_top_right: string | null;
  decoration_bottom_left: string | null;
  decoration_bottom_right: string | null;
  background_pattern_url: string | null;
  emblem_url: string | null;
  thank_you_text: string | null;
  footer_note: string | null;
  primary_color: string | null;
  accent_color: string | null;
};

const URL_FIELDS: Array<{ key: keyof ReceiptConfig; label: string; hint: string }> = [
  { key: "decoration_top_left",     label: "زخرفة أعلى اليسار",   hint: "صورة شفافة (PNG/SVG)" },
  { key: "decoration_top_right",    label: "زخرفة أعلى اليمين",   hint: "صورة شفافة (PNG/SVG)" },
  { key: "decoration_bottom_left",  label: "زخرفة أسفل اليسار",   hint: "كتب، ريشة، إلخ" },
  { key: "decoration_bottom_right", label: "زخرفة أسفل اليمين",   hint: "كرة أرضية، رموز" },
  { key: "background_pattern_url",  label: "خلفية مزخرفة",         hint: "نمط شفاف للخلفية" },
  { key: "emblem_url",              label: "شارة منتصف",           hint: "أيقونة تحت المبلغ (قبعة تخرج، إلخ)" },
];

const EMPTY: ReceiptConfig = {
  decoration_top_left: null,
  decoration_top_right: null,
  decoration_bottom_left: null,
  decoration_bottom_right: null,
  background_pattern_url: null,
  emblem_url: null,
  thank_you_text: null,
  footer_note: null,
  primary_color: null,
  accent_color: null,
};

interface Props {
  school: SchoolRecord;
  onClose: () => void;
}

export function ReceiptConfigModal({ school, onClose }: Props) {
  const [config, setConfig] = useState<ReceiptConfig>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        const { payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; config: ReceiptConfig | null }>(
          `/api/web/super-admin/schools/${school.id}/receipt-config`,
        );
        if (!cancelled && payload?.ok) {
          setConfig({ ...EMPTY, ...(payload.config ?? {}) });
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "تعذر تحميل الإعدادات");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [school.id]);

  const update = (key: keyof ReceiptConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value.trim() === "" ? null : value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const { payload, response } = await fetchJsonWithAuthorizedSession<{ ok: boolean; config: ReceiptConfig; error?: { message: string } }>(
        `/api/web/super-admin/schools/${school.id}/receipt-config`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        },
      );
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message || "تعذر الحفظ");
      }
      setConfig({ ...EMPTY, ...payload.config });
      setSuccess("تم حفظ الإعدادات بنجاح.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="ui-surface relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[24px] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-[var(--text-primary)]">تخصيص إيصال — {school.name}</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">روابط صور الزخارف وإعدادات الألوان للوصل المطبوع</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ui-button ui-button--secondary"
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
        )}
        {success && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">{success}</div>
        )}

        {loading ? (
          <p className="text-center text-[var(--text-secondary)] py-8">جارٍ التحميل...</p>
        ) : (
          <div className="space-y-4">
            {URL_FIELDS.map(({ key, label, hint }) => (
              <div key={key}>
                <label className="block text-sm font-bold mb-1 text-[var(--text-primary)]">{label}</label>
                <input
                  type="url"
                  value={(config[key] as string) || ""}
                  onChange={(e) => update(key, e.target.value)}
                  placeholder="https://..."
                  className="ui-input w-full"
                  dir="ltr"
                />
                <p className="text-xs text-[var(--text-tertiary)] mt-1">{hint}</p>
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold mb-1 text-[var(--text-primary)]">اللون الأساسي</label>
                <input
                  type="text"
                  value={config.primary_color || ""}
                  onChange={(e) => update("primary_color", e.target.value)}
                  placeholder="#3B2C9C"
                  className="ui-input w-full"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1 text-[var(--text-primary)]">اللون الثانوي</label>
                <input
                  type="text"
                  value={config.accent_color || ""}
                  onChange={(e) => update("accent_color", e.target.value)}
                  placeholder="#5B47C9"
                  className="ui-input w-full"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1 text-[var(--text-primary)]">نص الشكر</label>
              <input
                type="text"
                value={config.thank_you_text || ""}
                onChange={(e) => update("thank_you_text", e.target.value)}
                placeholder="شكراً لكم"
                className="ui-input w-full"
                maxLength={200}
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1 text-[var(--text-primary)]">نص التذييل</label>
              <input
                type="text"
                value={config.footer_note || ""}
                onChange={(e) => update("footer_note", e.target.value)}
                placeholder="تم إنشاء الإيصال من نظام إدارة المدرسة."
                className="ui-input w-full"
                maxLength={200}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
              <button type="button" className="ui-button ui-button--secondary" onClick={onClose}>
                إلغاء
              </button>
              <button
                type="button"
                className="ui-button ui-button--primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
