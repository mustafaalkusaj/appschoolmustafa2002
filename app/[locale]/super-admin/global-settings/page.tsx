"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Settings, Loader2, Save, Shield, Bell, Palette, CreditCard } from "@/lib/icons";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { useToast } from "@/components/toast";
import { SectionCard } from "../_components/ui";
import { cn } from "@/lib/brand/brand-utils";
import type { LucideIcon } from "@/lib/icons";

type SettingsCategory = "general" | "security" | "notifications" | "appearance" | "billing" | "maintenance";
type ValueType = "string" | "number" | "boolean" | "json";
interface SettingRecord { id: string; key: string; value: string | null; category: SettingsCategory; description: string | null; value_type: ValueType; }

const CAT_LABELS: Record<SettingsCategory, string> = { general: "عام", security: "الأمان", notifications: "الإشعارات", appearance: "المظهر", billing: "الفوترة", maintenance: "الصيانة" };
const CAT_ICONS: Record<SettingsCategory, LucideIcon> = { general: Settings, security: Shield, notifications: Bell, appearance: Palette, billing: CreditCard, maintenance: Settings };

export default function GlobalSettingsPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<SettingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [activeCat, setActiveCat] = useState<SettingsCategory | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { payload } = await fetchJsonWithAuthorizedSession<{ settings?: SettingRecord[]; tableMissing?: boolean }>("/api/web/super-admin/global-settings");
      setSettings(payload?.settings ?? []); setTableMissing(payload?.tableMissing === true);
    } catch { toast.error("تعذر تحميل الإعدادات."); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const categories = useMemo(() => Array.from(new Set(settings.map((s) => s.category))) as SettingsCategory[], [settings]);
  const filtered = useMemo(() => activeCat === "all" ? settings : settings.filter((s) => s.category === activeCat), [settings, activeCat]);
  const pendingCount = Object.keys(edited).length;

  const save = useCallback(async () => {
    if (!pendingCount) return; setSaving(true);
    try {
      const updates = Object.entries(edited).map(([key, value]) => ({ key, value }));
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ succeeded?: number; error?: { message?: string } }>("/api/web/super-admin/global-settings", { method: "PATCH", headers: withJsonHeaders(), body: JSON.stringify({ updates }) });
      if (!response.ok) throw new Error(payload?.error?.message || "تعذر الحفظ.");
      toast.success(`تم حفظ ${payload?.succeeded ?? 0} إعداد ✓`); setEdited({}); await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "تعذر الحفظ."); } finally { setSaving(false); }
  }, [edited, pendingCount, load, toast]);

  if (tableMissing) return (
    <SectionCard title="الإعدادات العامة"><div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6 text-center"><p className="text-sm font-bold text-amber-300">جدول global_settings غير موجود. شغّل migration أولاً.</p><code className="mt-2 block text-xs text-amber-400">migrations/20260602_000000_super_admin_app_management.sql</code></div></SectionCard>
  );

  return (
    <div className="space-y-6">
      <SectionCard title="الإعدادات العامة" description="إعدادات النظام والأمان والإشعارات والمظهر"
        actions={pendingCount > 0 ? <button className="flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-[var(--primary)]/20 transition hover:scale-[1.02]" disabled={saving} onClick={() => void save()}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} حفظ {pendingCount} تغيير</button> : undefined}
      >
        <div className="mb-5 flex flex-wrap gap-2">
          <button className={cn("rounded-xl px-3 py-1.5 text-xs font-black transition", activeCat === "all" ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--border)]")} onClick={() => setActiveCat("all")}>الكل ({settings.length})</button>
          {categories.map((cat) => { const Icon = CAT_ICONS[cat]; return (
            <button key={cat} className={cn("rounded-xl px-3 py-1.5 text-xs font-black transition flex items-center gap-1.5", activeCat === cat ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--border)]")} onClick={() => setActiveCat(cat)}><Icon size={12} />{CAT_LABELS[cat]}</button>
          ); })}
        </div>

        {loading ? <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-[var(--primary)] opacity-30" /></div>
        : filtered.length === 0 ? <p className="py-8 text-center text-sm font-bold text-[var(--text-muted)]">لا توجد إعدادات</p>
        : (
          <div className="space-y-3">
            {filtered.map((s) => {
              const val = edited[s.key] ?? s.value ?? "";
              const isEdited = s.key in edited;
              const Icon = CAT_ICONS[s.category];
              return (
                <div key={s.id} className={cn("rounded-2xl border p-4 transition", isEdited ? "border-[var(--primary)]/30 bg-[var(--primary)]/5" : "border-[var(--border)] bg-[var(--surface-strong)]")}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--text-muted)]"><Icon size={14} /></div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2"><code className="text-xs font-bold text-[var(--text-primary)]">{s.key}</code><span className="rounded-md bg-[var(--surface-muted)] px-1.5 py-0.5 text-[9px] font-black text-[var(--text-muted)]">{s.value_type}</span></div>
                        {s.description && <p className="mt-0.5 text-xs font-bold text-[var(--text-muted)]">{s.description}</p>}
                      </div>
                    </div>
                    <div className="w-full sm:w-64 shrink-0">
                      {s.value_type === "boolean" ? (
                        <select className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold" value={val} onChange={(e) => setEdited({ ...edited, [s.key]: e.target.value })}><option value="true">مفعّل</option><option value="false">معطّل</option></select>
                      ) : s.value_type === "json" ? (
                        <textarea className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold font-mono resize-none" dir="ltr" rows={2} value={val} onChange={(e) => setEdited({ ...edited, [s.key]: e.target.value })} />
                      ) : (
                        <input type={s.value_type === "number" ? "number" : "text"} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold" dir={s.value_type === "number" ? "ltr" : undefined} value={val} onChange={(e) => setEdited({ ...edited, [s.key]: e.target.value })} />
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
