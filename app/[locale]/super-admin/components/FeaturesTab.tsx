"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleOff, Loader2, Save } from "@/lib/icons";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { useToast } from "@/components/toast";
import {
  type SchoolFeatureFlagRecord,
  FEATURE_FLAG_LABELS,
} from "../_components/types";
import { SectionCard } from "./UI";

interface SchoolOption {
  id: string;
  name: string;
}

interface FeaturesTabProps {
  schools: SchoolOption[];
}

const ALL_FEATURE_KEYS = Object.keys(FEATURE_FLAG_LABELS);

type FlagMatrix = Record<string, Record<string, boolean>>;

export function FeaturesTab({ schools }: FeaturesTabProps) {
  const toast = useToast();
  const [flags, setFlags] = useState<SchoolFeatureFlagRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Array<{ school_id: string; feature_key: string; is_enabled: boolean }>>([]);

  const loadFlags = useCallback(async () => {
    setLoading(true);
    try {
      const { payload } = await fetchJsonWithAuthorizedSession<{ flags?: SchoolFeatureFlagRecord[]; tableMissing?: boolean }>("/api/web/super-admin/feature-flags");
      setFlags(payload?.flags ?? []);
      setTableMissing(payload?.tableMissing === true);
    } catch { toast.error("تعذر تحميل الميزات."); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { void loadFlags(); }, [loadFlags]);

  const matrix = useMemo<FlagMatrix>(() => {
    const m: FlagMatrix = {};
    for (const school of schools) {
      m[school.id] = {};
      for (const key of ALL_FEATURE_KEYS) {
        const flag = flags.find((f) => f.school_id === school.id && f.feature_key === key);
        m[school.id][key] = flag?.is_enabled ?? false;
      }
    }
    return m;
  }, [flags, schools]);

  const toggleFlag = useCallback((schoolId: string, featureKey: string) => {
    const current = matrix[schoolId]?.[featureKey] ?? false;
    const newVal = !current;

    setPendingChanges((prev) => {
      const filtered = prev.filter((c) => !(c.school_id === schoolId && c.feature_key === featureKey));
      return [...filtered, { school_id: schoolId, feature_key: featureKey, is_enabled: newVal }];
    });

    setFlags((prev) => {
      const idx = prev.findIndex((f) => f.school_id === schoolId && f.feature_key === featureKey);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], is_enabled: newVal };
        return updated;
      }
      return [...prev, {
        id: `temp-${schoolId}-${featureKey}`,
        school_id: schoolId,
        feature_key: featureKey,
        is_enabled: newVal,
        config_json: {},
        created_at: null,
        updated_at: null,
      }];
    });
  }, [matrix]);

  const handleSaveAll = useCallback(async () => {
    if (pendingChanges.length === 0) return;
    setSaving(true);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ succeeded?: number; failed?: number; error?: { message?: string } }>("/api/web/super-admin/feature-flags", {
        method: "PATCH",
        headers: withJsonHeaders(),
        body: JSON.stringify({ updates: pendingChanges }),
      });
      if (!response.ok) throw new Error(payload?.error?.message || "تعذر الحفظ.");
      toast.success(`تم حفظ ${payload?.succeeded ?? 0} تغيير ✓`);
      setPendingChanges([]);
      await loadFlags();
    } catch (e) { toast.error(e instanceof Error ? e.message : "تعذر الحفظ."); }
    finally { setSaving(false); }
  }, [pendingChanges, loadFlags, toast]);

  const handleBulkToggle = useCallback((featureKey: string, enabled: boolean) => {
    const changes: Array<{ school_id: string; feature_key: string; is_enabled: boolean }> = [];
    for (const school of schools) {
      changes.push({ school_id: school.id, feature_key: featureKey, is_enabled: enabled });
    }
    setPendingChanges((prev) => {
      const filtered = prev.filter((c) => c.feature_key !== featureKey);
      return [...filtered, ...changes];
    });
    setFlags((prev) => {
      const updated = prev.filter((f) => f.feature_key !== featureKey);
      for (const school of schools) {
        updated.push({
          id: `temp-${school.id}-${featureKey}`,
          school_id: school.id,
          feature_key: featureKey,
          is_enabled: enabled,
          config_json: {},
          created_at: null,
          updated_at: null,
        });
      }
      return updated;
    });
  }, [schools]);

  if (tableMissing) {
    return (
      <SectionCard title="الميزات" description="إدارة Feature Flags لكل مدرسة">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-sm font-bold text-amber-800">جدول school_feature_flags غير موجود. شغّل migration أولاً.</p>
          <code className="mt-2 block text-xs text-amber-600">migrations/20260602_000000_super_admin_app_management.sql</code>
        </div>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="مصفوفة الميزات"
        description="تفعيل/تعطيل ميزات لكل مدرسة"
        actions={
          pendingChanges.length > 0 ? (
            <button
              className="flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-[var(--primary)]/20 transition hover:scale-[1.02]"
              disabled={saving}
              onClick={() => void handleSaveAll()}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              حفظ {pendingChanges.length} تغيير
            </button>
          ) : undefined
        }
      >
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-[var(--primary)] opacity-30" /></div>
        ) : schools.length === 0 ? (
          <p className="py-8 text-center text-sm font-bold text-[var(--text-muted)]">لا توجد مدارس</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="py-3 pe-4 text-start font-black text-xs text-[var(--text-muted)] sticky start-0 bg-[var(--card-bg)] z-10 min-w-[140px]">الميزة</th>
                  {schools.map((s) => (
                    <th key={s.id} className="py-3 px-2 text-center font-black text-[10px] text-[var(--text-muted)] min-w-[80px]">
                      <span className="truncate block max-w-[80px]">{s.name}</span>
                    </th>
                  ))}
                  <th className="py-3 px-2 text-center font-black text-[10px] text-[var(--text-muted)]">الكل</th>
                </tr>
              </thead>
              <tbody>
                {ALL_FEATURE_KEYS.map((key) => {
                  const allEnabled = schools.every((s) => matrix[s.id]?.[key]);
                  return (
                    <tr key={key} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-muted)] transition">
                      <td className="py-2.5 pe-4 font-bold text-[var(--text-primary)] sticky start-0 bg-inherit z-10">
                        <span className="text-xs">{FEATURE_FLAG_LABELS[key] || key}</span>
                      </td>
                      {schools.map((s) => {
                        const enabled = matrix[s.id]?.[key] ?? false;
                        return (
                          <td key={s.id} className="py-2.5 px-2 text-center">
                            <button className="transition hover:scale-110" onClick={() => toggleFlag(s.id, key)}>
                              {enabled ? <CheckCircle2 size={22} className="text-emerald-500" /> : <CircleOff size={22} className="text-[var(--text-muted)]" />}
                            </button>
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-2 text-center">
                        <button className="transition hover:scale-110" onClick={() => handleBulkToggle(key, !allEnabled)}>
                          {allEnabled ? <CheckCircle2 size={18} className="text-emerald-500" /> : <CircleOff size={18} className="text-[var(--text-muted)]" />}
                        </button>
                      </td>
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
