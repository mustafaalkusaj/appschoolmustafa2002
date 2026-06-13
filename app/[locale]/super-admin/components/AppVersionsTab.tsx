"use client";

import { useCallback, useEffect, useState } from "react";
import { Tag, Plus, Loader2, X } from "@/lib/icons";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { useToast } from "@/components/toast";
import type { SchoolAppVersionRecord, AppPlatform } from "../_components/types";
import { SectionCard, EmptyState, cx } from "./UI";

interface SchoolOption {
  id: string;
  name: string;
}

interface AppVersionsTabProps {
  schools: SchoolOption[];
}

const PLATFORM_LABELS: Record<AppPlatform, string> = {
  ios: "iOS",
  android: "Android",
  both: "iOS + Android",
};

const PLATFORM_COLORS: Record<AppPlatform, string> = {
  ios: "text-blue-700 bg-blue-50",
  android: "text-emerald-700 bg-emerald-50",
  both: "text-purple-700 bg-purple-50",
};

export function AppVersionsTab({ schools }: AppVersionsTabProps) {
  const toast = useToast();
  const [versions, setVersions] = useState<SchoolAppVersionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterSchool, setFilterSchool] = useState("");
  const [form, setForm] = useState({
    school_id: "",
    version: "",
    platform: "both" as AppPlatform,
    changelog: "",
    build_number: "",
    is_mandatory: false,
  });

  const loadVersions = useCallback(async () => {
    setLoading(true);
    try {
      const url = filterSchool
        ? `/api/web/super-admin/app-versions?school_id=${filterSchool}`
        : "/api/web/super-admin/app-versions";
      const { payload } = await fetchJsonWithAuthorizedSession<{ versions?: SchoolAppVersionRecord[]; tableMissing?: boolean }>(url);
      setVersions(payload?.versions ?? []);
      setTableMissing(payload?.tableMissing === true);
    } catch { toast.error("تعذر تحميل الإصدارات."); }
    finally { setLoading(false); }
  }, [toast, filterSchool]);

  useEffect(() => { void loadVersions(); }, [loadVersions]);

  const handleSave = useCallback(async () => {
    if (!form.school_id || !form.version.trim()) { toast.error("المدرسة والنسخة مطلوبان."); return; }
    setSaving(true);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ error?: { message?: string } }>("/api/web/super-admin/app-versions", {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify({
          ...form,
          changelog: form.changelog || null,
          build_number: form.build_number || null,
        }),
      });
      if (!response.ok) throw new Error(payload?.error?.message || "تعذر الحفظ.");
      toast.success("تم نشر الإصدار ✓");
      setShowForm(false);
      setForm({ school_id: "", version: "", platform: "both", changelog: "", build_number: "", is_mandatory: false });
      await loadVersions();
    } catch (e) { toast.error(e instanceof Error ? e.message : "تعذر الحفظ."); }
    finally { setSaving(false); }
  }, [form, loadVersions, toast]);

  if (tableMissing) {
    return (
      <SectionCard title="إصدارات التطبيقات" description="سجل الإصدارات والتحديثات">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-sm font-bold text-amber-800">جدول school_app_versions غير موجود. شغّل migration أولاً.</p>
          <code className="mt-2 block text-xs text-amber-600">migrations/20260602_000000_super_admin_app_management.sql</code>
        </div>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="سجل الإصدارات"
        description="تاريخ تحديثات التطبيقات لكل مدرسة"
        actions={
          <div className="flex items-center gap-2">
            <select
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold"
              value={filterSchool}
              onChange={(e) => setFilterSchool(e.target.value)}
            >
              <option value="">كل المدارس</option>
              {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button
              className="flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-[var(--primary)]/20 transition hover:scale-[1.02]"
              onClick={() => setShowForm(true)}
            >
              <Plus size={16} /> نشر إصدار
            </button>
          </div>
        }
      >
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-[var(--primary)] opacity-30" /></div>
        ) : versions.length === 0 ? (
          <EmptyState icon={Tag} title="لا توجد إصدارات" description="انشر أول إصدار لتطبيق" actionLabel="نشر إصدار" onAction={() => setShowForm(true)} />
        ) : (
          <div className="space-y-3">
            {versions.map((v) => {
              const schoolName = Array.isArray(v.schools) ? v.schools[0]?.name : v.schools?.name;
              return (
                <div key={v.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4 transition hover:shadow-md">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                        <Tag size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-black text-[var(--text-primary)]">v{v.version}</span>
                          <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black", PLATFORM_COLORS[v.platform])}>
                            {PLATFORM_LABELS[v.platform]}
                          </span>
                          {v.is_mandatory && (
                            <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-700">إجباري</span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-[var(--text-muted)]">
                          {schoolName || "—"} {v.build_number ? `• Build ${v.build_number}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-[var(--text-muted)]">
                      {v.published_at ? new Date(v.published_at).toLocaleDateString("ar-IQ", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                    </div>
                  </div>
                  {v.changelog && (
                    <div className="mt-3 rounded-xl bg-[var(--surface-muted)] p-3">
                      <p className="text-xs font-bold text-[var(--text-secondary)] whitespace-pre-wrap">{v.changelog}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {showForm && (
        <div className="ui-backdrop flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="ui-dialog w-full max-w-lg max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
              <h2 className="text-xl font-black text-[var(--text-primary)]">نشر إصدار جديد</h2>
              <button className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--surface)]" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-black text-[var(--text-secondary)]">المدرسة *</label>
                <select className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold" value={form.school_id} onChange={(e) => setForm({ ...form, school_id: e.target.value })}>
                  <option value="">— اختر —</option>
                  {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-black text-[var(--text-secondary)]">رقم النسخة *</label>
                  <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold font-mono" dir="ltr" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="2.1.0" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-black text-[var(--text-secondary)]">Build Number</label>
                  <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold font-mono" dir="ltr" value={form.build_number} onChange={(e) => setForm({ ...form, build_number: e.target.value })} placeholder="150" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-black text-[var(--text-secondary)]">المنصة</label>
                <select className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value as AppPlatform })}>
                  <option value="both">iOS + Android</option>
                  <option value="ios">iOS فقط</option>
                  <option value="android">Android فقط</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-black text-[var(--text-secondary)]">ملاحظات التحديث</label>
                <textarea className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold resize-none" rows={3} value={form.changelog} onChange={(e) => setForm({ ...form, changelog: e.target.value })} placeholder="ما الجديد في هذا الإصدار..." />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="is_mandatory_v" checked={form.is_mandatory} onChange={(e) => setForm({ ...form, is_mandatory: e.target.checked })} className="h-4 w-4 rounded border-[var(--border)]" />
                <label htmlFor="is_mandatory_v" className="text-sm font-black text-[var(--text-secondary)]">تحديث إجباري</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button className="ui-button ui-button--secondary flex-1" onClick={() => setShowForm(false)}>إلغاء</button>
                <button className="ui-button ui-button--primary flex-1" disabled={saving} onClick={() => void handleSave()}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : "نشر"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
