"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Settings, Loader2, Save, Shield, Bell, Palette, CreditCard } from "@/lib/icons";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { useToast } from "@/components/toast";
import {
  type GlobalSettingRecord,
  type SettingsCategory,
  SETTINGS_CATEGORY_LABELS,
} from "../_components/types";
import { SectionCard, cx } from "./UI";
import type { LucideIcon } from "@/lib/icons";

const CATEGORY_ICONS: Record<SettingsCategory, LucideIcon> = {
  general: Settings,
  security: Shield,
  notifications: Bell,
  appearance: Palette,
  billing: CreditCard,
  maintenance: Settings,
};

export function GlobalSettingsTab() {
  const toast = useToast();
  const [settings, setSettings] = useState<GlobalSettingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [activeCategory, setActiveCategory] = useState<SettingsCategory | "all">("all");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { payload } = await fetchJsonWithAuthorizedSession<{ settings?: GlobalSettingRecord[]; tableMissing?: boolean }>("/api/web/super-admin/global-settings");
      setSettings(payload?.settings ?? []);
      setTableMissing(payload?.tableMissing === true);
    } catch { toast.error("تعذر تحميل الإعدادات."); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { void loadSettings(); }, [loadSettings]);

  const categories = useMemo(() => {
    const cats = new Set(settings.map((s) => s.category));
    return Array.from(cats) as SettingsCategory[];
  }, [settings]);

  const filteredSettings = useMemo(() => {
    if (activeCategory === "all") return settings;
    return settings.filter((s) => s.category === activeCategory);
  }, [settings, activeCategory]);

  const handleValueChange = useCallback((key: string, value: string) => {
    setEditedValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const pendingCount = Object.keys(editedValues).length;

  const handleSave = useCallback(async () => {
    if (pendingCount === 0) return;
    setSaving(true);
    try {
      const updates = Object.entries(editedValues).map(([key, value]) => ({ key, value }));
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ succeeded?: number; error?: { message?: string } }>("/api/web/super-admin/global-settings", {
        method: "PATCH",
        headers: withJsonHeaders(),
        body: JSON.stringify({ updates }),
      });
      if (!response.ok) throw new Error(payload?.error?.message || "تعذر الحفظ.");
      toast.success(`تم حفظ ${payload?.succeeded ?? 0} إعداد ✓`);
      setEditedValues({});
      await loadSettings();
    } catch (e) { toast.error(e instanceof Error ? e.message : "تعذر الحفظ."); }
    finally { setSaving(false); }
  }, [editedValues, pendingCount, loadSettings, toast]);

  if (tableMissing) {
    return (
      <SectionCard title="الإعدادات العامة" description="إعدادات النظام">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-sm font-bold text-amber-800">جدول global_settings غير موجود. شغّل migration أولاً.</p>
          <code className="mt-2 block text-xs text-amber-600">migrations/20260602_000000_super_admin_app_management.sql</code>
        </div>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="الإعدادات العامة"
        description="إعدادات النظام والأمان والإشعارات والمظهر"
        actions={
          pendingCount > 0 ? (
            <button
              className="flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-[var(--primary)]/20 transition hover:scale-[1.02]"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              حفظ {pendingCount} تغيير
            </button>
          ) : undefined
        }
      >
        <div className="mb-5 flex flex-wrap gap-2">
          <button
            className={cx("rounded-xl px-3 py-1.5 text-xs font-black transition", activeCategory === "all" ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--border)]")}
            onClick={() => setActiveCategory("all")}
          >
            الكل ({settings.length})
          </button>
          {categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat];
            return (
              <button
                key={cat}
                className={cx("rounded-xl px-3 py-1.5 text-xs font-black transition flex items-center gap-1.5", activeCategory === cat ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--border)]")}
                onClick={() => setActiveCategory(cat)}
              >
                <Icon size={12} />
                {SETTINGS_CATEGORY_LABELS[cat]}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-[var(--primary)] opacity-30" /></div>
        ) : filteredSettings.length === 0 ? (
          <p className="py-8 text-center text-sm font-bold text-[var(--text-muted)]">لا توجد إعدادات</p>
        ) : (
          <div className="space-y-3">
            {filteredSettings.map((setting) => {
              const currentVal = editedValues[setting.key] ?? setting.value ?? "";
              const isEdited = setting.key in editedValues;
              const Icon = CATEGORY_ICONS[setting.category];

              return (
                <div
                  key={setting.id}
                  className={cx(
                    "rounded-2xl border p-4 transition",
                    isEdited ? "border-[var(--primary)]/30 bg-[var(--primary)]/5" : "border-[var(--border)] bg-[var(--surface-strong)]"
                  )}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--text-muted)]">
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-bold text-[var(--text-primary)]">{setting.key}</code>
                          <span className="rounded-md bg-[var(--surface-muted)] px-1.5 py-0.5 text-[9px] font-black text-[var(--text-muted)]">{setting.value_type}</span>
                        </div>
                        {setting.description && (
                          <p className="mt-0.5 text-xs font-bold text-[var(--text-muted)]">{setting.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="w-full sm:w-64 shrink-0">
                      {setting.value_type === "boolean" ? (
                        <select
                          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold"
                          value={currentVal}
                          onChange={(e) => handleValueChange(setting.key, e.target.value)}
                        >
                          <option value="true">مفعّل</option>
                          <option value="false">معطّل</option>
                        </select>
                      ) : setting.value_type === "json" ? (
                        <textarea
                          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold font-mono resize-none"
                          dir="ltr"
                          rows={2}
                          value={currentVal}
                          onChange={(e) => handleValueChange(setting.key, e.target.value)}
                        />
                      ) : (
                        <input
                          type={setting.value_type === "number" ? "number" : "text"}
                          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold"
                          dir={setting.value_type === "number" ? "ltr" : undefined}
                          value={currentVal}
                          onChange={(e) => handleValueChange(setting.key, e.target.value)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
