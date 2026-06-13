"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleOff, Loader2, Save } from "@/lib/icons";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { useToast } from "@/components/toast";
import { SectionCard } from "../_components/ui";
import { useSuperAdminData } from "../_hooks/useSuperAdminData";

interface FeatureFlag { id: string; school_id: string; feature_key: string; is_enabled: boolean; }

const FEATURE_LABELS: Record<string, string> = {
  enable_attendance: "نظام الحضور", enable_payments: "المدفوعات", enable_salaries: "الرواتب",
  enable_reports: "التقارير", enable_expenses: "المصاريف", enable_parent_portal: "بوابة أولياء الأمور",
  enable_teacher_portal: "بوابة المعلمين", enable_notifications: "إشعارات Push", enable_sms: "رسائل SMS",
  enable_whatsapp: "تكامل واتساب", enable_online_payment: "دفع إلكتروني", enable_qr_attendance: "حضور QR",
  enable_academic_records: "السجلات الأكاديمية", enable_fee_notifications: "إشعارات الرسوم",
  max_branches: "فروع متعددة", max_users: "مستخدمون متعددون",
};
const ALL_KEYS = Object.keys(FEATURE_LABELS);
type Matrix = Record<string, Record<string, boolean>>;

export default function FeaturesPage() {
  const { schools } = useSuperAdminData();
  const toast = useToast();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<Array<{ school_id: string; feature_key: string; is_enabled: boolean }>>([]);
  const activeSchools = schools.filter((s) => !s.deleted_at);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { payload } = await fetchJsonWithAuthorizedSession<{ flags?: FeatureFlag[]; tableMissing?: boolean }>("/api/web/super-admin/feature-flags");
      setFlags(payload?.flags ?? []); setTableMissing(payload?.tableMissing === true);
    } catch { toast.error("تعذر تحميل الميزات."); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const matrix = useMemo<Matrix>(() => {
    const m: Matrix = {};
    for (const s of activeSchools) { m[s.id] = {}; for (const k of ALL_KEYS) { const f = flags.find((x) => x.school_id === s.id && x.feature_key === k); m[s.id][k] = f?.is_enabled ?? false; } }
    return m;
  }, [flags, activeSchools]);

  const toggle = useCallback((sid: string, key: string) => {
    const nv = !(matrix[sid]?.[key] ?? false);
    setPending((p) => [...p.filter((c) => !(c.school_id === sid && c.feature_key === key)), { school_id: sid, feature_key: key, is_enabled: nv }]);
    setFlags((prev) => { const i = prev.findIndex((f) => f.school_id === sid && f.feature_key === key); if (i >= 0) { const u = [...prev]; u[i] = { ...u[i], is_enabled: nv }; return u; } return [...prev, { id: `t-${sid}-${key}`, school_id: sid, feature_key: key, is_enabled: nv }]; });
  }, [matrix]);

  const bulkToggle = useCallback((key: string, enabled: boolean) => {
    const ch = activeSchools.map((s) => ({ school_id: s.id, feature_key: key, is_enabled: enabled }));
    setPending((p) => [...p.filter((c) => c.feature_key !== key), ...ch]);
    setFlags((prev) => { const u = prev.filter((f) => f.feature_key !== key); for (const s of activeSchools) u.push({ id: `t-${s.id}-${key}`, school_id: s.id, feature_key: key, is_enabled: enabled }); return u; });
  }, [activeSchools]);

  const saveAll = useCallback(async () => {
    if (!pending.length) return; setSaving(true);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ succeeded?: number; error?: { message?: string } }>("/api/web/super-admin/feature-flags", { method: "PATCH", headers: withJsonHeaders(), body: JSON.stringify({ updates: pending }) });
      if (!response.ok) throw new Error(payload?.error?.message || "تعذر الحفظ.");
      toast.success(`تم حفظ ${payload?.succeeded ?? 0} تغيير ✓`); setPending([]); await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "تعذر الحفظ."); } finally { setSaving(false); }
  }, [pending, load, toast]);

  if (tableMissing) return (
    <SectionCard title="الميزات"><div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6 text-center"><p className="text-sm font-bold text-amber-300">جدول school_feature_flags غير موجود. شغّل migration أولاً.</p><code className="mt-2 block text-xs text-amber-400">migrations/20260602_000000_super_admin_app_management.sql</code></div></SectionCard>
  );

  return (
    <div className="space-y-6">
      <SectionCard title="مصفوفة الميزات" description="تفعيل/تعطيل ميزات لكل مدرسة"
        actions={pending.length > 0 ? <button className="flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-[var(--primary)]/20 transition hover:scale-[1.02]" disabled={saving} onClick={() => void saveAll()}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} حفظ {pending.length} تغيير</button> : undefined}
      >
        {loading ? <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-[var(--primary)] opacity-30" /></div>
        : activeSchools.length === 0 ? <p className="py-8 text-center text-sm font-bold text-[var(--text-muted)]">لا توجد مدارس</p>
        : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[var(--border)]">
                <th className="py-3 pe-4 text-start font-black text-xs text-[var(--text-muted)] sticky start-0 bg-[var(--card-bg)] z-10 min-w-[140px]">الميزة</th>
                {activeSchools.map((s) => <th key={s.id} className="py-3 px-2 text-center font-black text-[10px] text-[var(--text-muted)] min-w-[80px]"><span className="truncate block max-w-[80px]">{s.name}</span></th>)}
                <th className="py-3 px-2 text-center font-black text-[10px] text-[var(--text-muted)]">الكل</th>
              </tr></thead>
              <tbody>
                {ALL_KEYS.map((key) => {
                  const allOn = activeSchools.every((s) => matrix[s.id]?.[key]);
                  return (
                    <tr key={key} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-muted)] transition">
                      <td className="py-2.5 pe-4 font-bold text-[var(--text-primary)] sticky start-0 bg-inherit z-10"><span className="text-xs">{FEATURE_LABELS[key] || key}</span></td>
                      {activeSchools.map((s) => <td key={s.id} className="py-2.5 px-2 text-center"><button className="transition hover:scale-110" onClick={() => toggle(s.id, key)}>{matrix[s.id]?.[key] ? <CheckCircle2 size={22} className="text-emerald-500" /> : <CircleOff size={22} className="text-[var(--text-muted)]" />}</button></td>)}
                      <td className="py-2.5 px-2 text-center"><button className="transition hover:scale-110" onClick={() => bulkToggle(key, !allOn)}>{allOn ? <CheckCircle2 size={18} className="text-emerald-500" /> : <CircleOff size={18} className="text-[var(--text-muted)]" />}</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
