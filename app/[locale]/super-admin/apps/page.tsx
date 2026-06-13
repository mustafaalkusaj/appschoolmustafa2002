"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Phone,
  Plus,
  ExternalLink,
  Loader2,
  X,
  Download,
  RefreshCw,
} from "@/lib/icons";
import {
  fetchJsonWithAuthorizedSession,
  withJsonHeaders,
} from "@/lib/authorized-api";
import { useToast } from "@/components/toast";
import { SectionCard, StatCard, EmptyState } from "../_components/ui";
import { useSuperAdminData } from "../_hooks/useSuperAdminData";

type AppPublishStatus = "draft" | "in_review" | "published" | "rejected" | "suspended";

interface SchoolAppRecord {
  id: string;
  school_id: string;
  app_name: string;
  bundle_id_ios: string | null;
  package_name_android: string | null;
  ios_status: AppPublishStatus;
  android_status: AppPublishStatus;
  app_store_url: string | null;
  play_store_url: string | null;
  current_version: string;
  min_version: string;
  force_update: boolean;
  app_icon_url: string | null;
  splash_image_url: string | null;
  login_style: string;
  download_count_ios: number;
  download_count_android: number;
  is_active: boolean;
  schools?: { name: string | null } | Array<{ name: string | null }> | null;
}

const STATUS_LABELS: Record<AppPublishStatus, string> = {
  draft: "مسودة", in_review: "قيد المراجعة", published: "منشور", rejected: "مرفوض", suspended: "موقوف",
};
const STATUS_COLORS: Record<AppPublishStatus, string> = {
  draft: "text-[var(--text-muted)] bg-[var(--surface-muted)]",
  in_review: "text-amber-400 bg-amber-500/10",
  published: "text-emerald-400 bg-emerald-500/10",
  rejected: "text-red-400 bg-red-500/10",
  suspended: "text-orange-400 bg-orange-500/10",
};

function StatusBadge({ status }: { status: AppPublishStatus }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black ${STATUS_COLORS[status]}`}>{STATUS_LABELS[status]}</span>;
}

const EMPTY_FORM = {
  school_id: "", app_name: "", bundle_id_ios: "", package_name_android: "",
  ios_status: "draft" as AppPublishStatus, android_status: "draft" as AppPublishStatus,
  app_store_url: "", play_store_url: "", current_version: "1.0.0", min_version: "1.0.0",
  force_update: false, login_style: "default" as "default" | "minimal" | "branded" | "fullscreen",
};

export default function AppsPage() {
  const { schools } = useSuperAdminData();
  const toast = useToast();
  const [apps, setApps] = useState<SchoolAppRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const activeSchools = schools.filter((s) => !s.deleted_at);

  const loadApps = useCallback(async () => {
    setLoading(true);
    try {
      const { payload } = await fetchJsonWithAuthorizedSession<{ apps?: SchoolAppRecord[]; tableMissing?: boolean }>("/api/web/super-admin/apps");
      setApps(payload?.apps ?? []);
      setTableMissing(payload?.tableMissing === true);
    } catch { toast.error("تعذر تحميل التطبيقات."); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { void loadApps(); }, [loadApps]);

  const handleSave = useCallback(async () => {
    if (!form.school_id || !form.app_name.trim()) { toast.error("المدرسة واسم التطبيق مطلوبان."); return; }
    setSaving(true);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ error?: { message?: string } }>("/api/web/super-admin/apps", {
        method: "POST", headers: withJsonHeaders(),
        body: JSON.stringify({ ...form, bundle_id_ios: form.bundle_id_ios || null, package_name_android: form.package_name_android || null, app_store_url: form.app_store_url || null, play_store_url: form.play_store_url || null }),
      });
      if (!response.ok) throw new Error(payload?.error?.message || "تعذر الحفظ.");
      toast.success("تم حفظ التطبيق ✓");
      setShowForm(false); setForm(EMPTY_FORM); await loadApps();
    } catch (e) { toast.error(e instanceof Error ? e.message : "تعذر الحفظ."); }
    finally { setSaving(false); }
  }, [form, loadApps, toast]);

  const publishedIos = apps.filter((a) => a.ios_status === "published").length;
  const publishedAndroid = apps.filter((a) => a.android_status === "published").length;
  const inReview = apps.filter((a) => a.ios_status === "in_review" || a.android_status === "in_review").length;

  if (tableMissing) {
    return (
      <SectionCard title="التطبيقات" description="إدارة تطبيقات المدارس المنشورة">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6 text-center">
          <p className="text-sm font-bold text-amber-300">جدول school_apps غير موجود. شغّل migration أولاً.</p>
          <code className="mt-2 block text-xs text-amber-400">migrations/20260602_000000_super_admin_app_management.sql</code>
        </div>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Phone} label="إجمالي التطبيقات" value={apps.length} meta="" tint="#6366f1" />
        <StatCard icon={Phone} label="منشور iOS" value={publishedIos} meta="" tint="#0ea5e9" />
        <StatCard icon={Download} label="منشور Android" value={publishedAndroid} meta="" tint="#22c55e" />
        <StatCard icon={RefreshCw} label="قيد المراجعة" value={inReview} meta="" tint="#f59e0b" />
      </div>

      <SectionCard title="التطبيقات المنشورة" description="إدارة تطبيقات iOS و Android لكل مدرسة"
        actions={<button className="flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-[var(--primary)]/20 transition hover:scale-[1.02]" onClick={() => { setForm(EMPTY_FORM); setShowForm(true); }}><Plus size={16} /> إضافة تطبيق</button>}
      >
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-[var(--primary)] opacity-30" /></div>
        ) : apps.length === 0 ? (
          <EmptyState icon={Phone} title="لا توجد تطبيقات" description="أضف أول تطبيق لمدرسة" actionLabel="إضافة تطبيق" onAction={() => setShowForm(true)} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                <th className="py-3 pe-4 text-start font-black text-xs">التطبيق</th>
                <th className="py-3 pe-4 text-start font-black text-xs">المدرسة</th>
                <th className="py-3 pe-4 text-center font-black text-xs">iOS</th>
                <th className="py-3 pe-4 text-center font-black text-xs">Android</th>
                <th className="py-3 pe-4 text-center font-black text-xs">النسخة</th>
                <th className="py-3 pe-4 text-center font-black text-xs">التحميلات</th>
                <th className="py-3 text-center font-black text-xs">روابط</th>
              </tr></thead>
              <tbody>
                {apps.map((app) => {
                  const schoolName = Array.isArray(app.schools) ? app.schools[0]?.name : app.schools?.name;
                  return (
                    <tr key={app.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-muted)] transition">
                      <td className="py-3 pe-4"><div className="flex items-center gap-3">
                        {app.app_icon_url ? <img src={app.app_icon_url} alt="" className="h-10 w-10 rounded-xl object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]"><Phone size={18} /></div>}
                        <div><p className="font-black text-[var(--text-primary)]">{app.app_name}</p><p className="text-[10px] text-[var(--text-muted)]">{app.bundle_id_ios || app.package_name_android || "—"}</p></div>
                      </div></td>
                      <td className="py-3 pe-4 font-bold text-[var(--text-secondary)]">{schoolName || "—"}</td>
                      <td className="py-3 pe-4 text-center"><StatusBadge status={app.ios_status} /></td>
                      <td className="py-3 pe-4 text-center"><StatusBadge status={app.android_status} /></td>
                      <td className="py-3 pe-4 text-center font-mono text-xs font-bold">{app.current_version}</td>
                      <td className="py-3 pe-4 text-center"><span className="text-xs font-bold">{app.download_count_ios + app.download_count_android}</span></td>
                      <td className="py-3 text-center"><div className="flex items-center justify-center gap-1">
                        {app.app_store_url && <a href={app.app_store_url} target="_blank" rel="noopener noreferrer" className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--primary)]"><ExternalLink size={14} /></a>}
                        {app.play_store_url && <a href={app.play_store_url} target="_blank" rel="noopener noreferrer" className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-emerald-500"><ExternalLink size={14} /></a>}
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {showForm && (
        <div className="ui-backdrop flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="ui-dialog w-full max-w-2xl max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
              <h2 className="text-xl font-black text-[var(--text-primary)]">إضافة تطبيق</h2>
              <button className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--surface)]" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1"><label className="text-sm font-black text-[var(--text-secondary)]">المدرسة *</label>
                  <select className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold" value={form.school_id} onChange={(e) => setForm({ ...form, school_id: e.target.value })}><option value="">— اختر —</option>{activeSchools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                <div className="space-y-1"><label className="text-sm font-black text-[var(--text-secondary)]">اسم التطبيق *</label>
                  <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold" value={form.app_name} onChange={(e) => setForm({ ...form, app_name: e.target.value })} placeholder="مدرسة النور" /></div>
                <div className="space-y-1"><label className="text-sm font-black text-[var(--text-secondary)]">Bundle ID (iOS)</label>
                  <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold font-mono" dir="ltr" value={form.bundle_id_ios} onChange={(e) => setForm({ ...form, bundle_id_ios: e.target.value })} placeholder="com.schoolapp.alnoor" /></div>
                <div className="space-y-1"><label className="text-sm font-black text-[var(--text-secondary)]">Package Name (Android)</label>
                  <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold font-mono" dir="ltr" value={form.package_name_android} onChange={(e) => setForm({ ...form, package_name_android: e.target.value })} placeholder="com.schoolapp.alnoor" /></div>
                <div className="space-y-1"><label className="text-sm font-black text-[var(--text-secondary)]">حالة iOS</label>
                  <select className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold" value={form.ios_status} onChange={(e) => setForm({ ...form, ios_status: e.target.value as AppPublishStatus })}>{Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div className="space-y-1"><label className="text-sm font-black text-[var(--text-secondary)]">حالة Android</label>
                  <select className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold" value={form.android_status} onChange={(e) => setForm({ ...form, android_status: e.target.value as AppPublishStatus })}>{Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div className="space-y-1"><label className="text-sm font-black text-[var(--text-secondary)]">رابط App Store</label>
                  <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold" dir="ltr" value={form.app_store_url} onChange={(e) => setForm({ ...form, app_store_url: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-sm font-black text-[var(--text-secondary)]">رابط Play Store</label>
                  <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold" dir="ltr" value={form.play_store_url} onChange={(e) => setForm({ ...form, play_store_url: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-sm font-black text-[var(--text-secondary)]">النسخة الحالية</label>
                  <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold font-mono" dir="ltr" value={form.current_version} onChange={(e) => setForm({ ...form, current_version: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-sm font-black text-[var(--text-secondary)]">أقل نسخة مدعومة</label>
                  <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold font-mono" dir="ltr" value={form.min_version} onChange={(e) => setForm({ ...form, min_version: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-sm font-black text-[var(--text-secondary)]">نمط تسجيل الدخول</label>
                  <select className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold" value={form.login_style} onChange={(e) => setForm({ ...form, login_style: e.target.value as "default" | "minimal" | "branded" | "fullscreen" })}><option value="default">افتراضي</option><option value="minimal">بسيط</option><option value="branded">مخصص</option><option value="fullscreen">ملء الشاشة</option></select></div>
                <div className="flex items-center gap-3 pt-6">
                  <input type="checkbox" id="force_update" checked={form.force_update} onChange={(e) => setForm({ ...form, force_update: e.target.checked })} className="h-4 w-4 rounded border-[var(--border)]" />
                  <label htmlFor="force_update" className="text-sm font-black text-[var(--text-secondary)]">إجبار التحديث</label></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button className="ui-button ui-button--secondary flex-1" onClick={() => setShowForm(false)}>إلغاء</button>
                <button className="ui-button ui-button--primary flex-1" disabled={saving} onClick={() => void handleSave()}>{saving ? <Loader2 size={16} className="animate-spin" /> : "حفظ"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
