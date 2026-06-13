"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchJsonWithAuthorizedSession,
  withJsonHeaders,
} from "@/lib/authorized-api";
import { useToast } from "@/components/toast";
import {
  Smartphone,
  Users,
  Send,
  Settings,
  ToggleLeft,
  ToggleRight,
} from "@/lib/icons";
import { SectionCard, StatCard } from "../_components/ui";
import { useSuperAdminData } from "../_hooks/useSuperAdminData";

const FEATURE_LABELS: Record<string, string> = {
  exams: "الاختبارات",
  messaging: "المراسلة",
  behavior: "السلوك",
  assignments: "الواجبات",
  attendance: "الحضور",
  grades: "الدرجات",
  calendar: "التقويم",
  announcements: "الإعلانات",
};

type Overview = {
  active_mobile_users: number;
  registered_devices: number;
  by_role: Record<string, number>;
  by_platform: Record<string, number>;
  by_school: Array<{ school_id: string; school_name: string; devices: number }>;
  last_teacher_login: string | null;
};

type FeaturesMap = Record<string, boolean>;

type VersionConfig = {
  min_supported_version: string;
  latest_version: string;
  force_update: boolean;
};

const ROLE_LABELS: Record<string, string> = {
  student: "الطلاب",
  teacher: "المعلمون",
  staff: "الإداريون",
  unknown: "غير محدد",
};

export default function MobileAppPage() {
  const { schools } = useSuperAdminData();
  const toast = useToast();

  const schoolOptions = useMemo(
    () => schools.map((s) => ({ id: s.id, name: s.name })),
    [schools],
  );

  // ----- Overview -----
  const [overview, setOverview] = useState<Overview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok?: boolean;
        overview?: Overview;
        error?: { message?: string };
      }>("/api/web/mobile-app/overview");
      if (!response.ok || !payload?.overview) {
        throw new Error(payload?.error?.message || "تعذر تحميل الإحصائيات.");
      }
      setOverview(payload.overview);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر تحميل الإحصائيات.");
    } finally {
      setOverviewLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  // ----- Feature flags -----
  const [featureSchoolId, setFeatureSchoolId] = useState("");
  const [features, setFeatures] = useState<FeaturesMap | null>(null);
  const [featuresSaving, setFeaturesSaving] = useState(false);

  const loadFeatures = useCallback(
    async (schoolId: string) => {
      if (!schoolId) {
        setFeatures(null);
        return;
      }
      try {
        const { response, payload } = await fetchJsonWithAuthorizedSession<{
          features?: FeaturesMap;
          error?: { message?: string };
        }>(`/api/web/mobile-app/features?schoolId=${encodeURIComponent(schoolId)}`);
        if (!response.ok || !payload?.features) {
          throw new Error(payload?.error?.message || "تعذر تحميل الميزات.");
        }
        setFeatures(payload.features);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "تعذر تحميل الميزات.");
      }
    },
    [toast],
  );

  const handleFeatureSchoolChange = useCallback(
    (schoolId: string) => {
      setFeatureSchoolId(schoolId);
      void loadFeatures(schoolId);
    },
    [loadFeatures],
  );

  const toggleFeature = useCallback(
    async (key: string) => {
      if (!featureSchoolId || !features) return;
      const next = { ...features, [key]: !features[key] };
      setFeatures(next);
      setFeaturesSaving(true);
      try {
        const { response, payload } = await fetchJsonWithAuthorizedSession<{
          features?: FeaturesMap;
          error?: { message?: string };
        }>("/api/web/mobile-app/features", {
          method: "PUT",
          headers: withJsonHeaders(),
          body: JSON.stringify({ schoolId: featureSchoolId, features: { [key]: next[key] } }),
        });
        if (!response.ok || !payload?.features) {
          throw new Error(payload?.error?.message || "تعذر حفظ الميزة.");
        }
        setFeatures(payload.features);
        toast.success("تم حفظ إعداد الميزة ✓");
      } catch (e) {
        setFeatures(features); // rollback
        toast.error(e instanceof Error ? e.message : "تعذر حفظ الميزة.");
      } finally {
        setFeaturesSaving(false);
      }
    },
    [featureSchoolId, features, toast],
  );

  // ----- Targeted notification sender -----
  const [notifScope, setNotifScope] = useState<"school" | "branch" | "class" | "role" | "user">("role");
  const [notifValue, setNotifValue] = useState("");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifSending, setNotifSending] = useState(false);
  const [notifResult, setNotifResult] = useState<{ sent?: number; failed?: number; targeted?: number } | null>(null);

  const sendNotification = useCallback(async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) {
      toast.error("العنوان والرسالة مطلوبان.");
      return;
    }
    setNotifSending(true);
    setNotifResult(null);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok?: boolean;
        sent?: number;
        failed?: number;
        targeted?: number;
        error?: string;
      }>("/api/web/notifications/send", {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify({
          target: { scope: notifScope, value: notifValue.trim() || undefined },
          title: notifTitle.trim(),
          message: notifMessage.trim(),
        }),
      });
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || "تعذر إرسال الإشعار.");
      }
      setNotifResult({ sent: payload?.sent, failed: payload?.failed, targeted: payload?.targeted });
      toast.success(`تم الإرسال: ${payload?.sent ?? 0} ✓ / فشل ${payload?.failed ?? 0}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر إرسال الإشعار.");
    } finally {
      setNotifSending(false);
    }
  }, [notifScope, notifValue, notifTitle, notifMessage, toast]);

  // ----- App version / force-update -----
  const [versionSchoolId, setVersionSchoolId] = useState("");
  const [version, setVersion] = useState<VersionConfig>({
    min_supported_version: "",
    latest_version: "",
    force_update: false,
  });
  const [versionSaving, setVersionSaving] = useState(false);

  const loadVersion = useCallback(
    async (schoolId: string) => {
      try {
        const query = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : "";
        const { response, payload } = await fetchJsonWithAuthorizedSession<{
          config?: VersionConfig;
          error?: { message?: string };
        }>(`/api/web/mobile-app/config${query}`);
        if (!response.ok) {
          throw new Error(payload?.error?.message || "تعذر تحميل إعدادات الإصدار.");
        }
        setVersion(
          payload?.config ?? { min_supported_version: "", latest_version: "", force_update: false },
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "تعذر تحميل إعدادات الإصدار.");
      }
    },
    [toast],
  );

  useEffect(() => {
    void loadVersion(versionSchoolId);
  }, [versionSchoolId, loadVersion]);

  const saveVersion = useCallback(async () => {
    if (!version.latest_version.trim()) {
      toast.error("أحدث إصدار مطلوب.");
      return;
    }
    setVersionSaving(true);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        config?: VersionConfig;
        error?: { message?: string };
      }>("/api/web/mobile-app/config", {
        method: "PUT",
        headers: withJsonHeaders(),
        body: JSON.stringify({
          schoolId: versionSchoolId || null,
          min_supported_version: version.min_supported_version.trim(),
          latest_version: version.latest_version.trim(),
          force_update: version.force_update,
        }),
      });
      if (!response.ok) {
        throw new Error(payload?.error?.message || "تعذر حفظ إعدادات الإصدار.");
      }
      if (payload?.config) setVersion(payload.config);
      toast.success("تم حفظ إعدادات الإصدار ✓");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر حفظ إعدادات الإصدار.");
    } finally {
      setVersionSaving(false);
    }
  }, [version, versionSchoolId, toast]);

  const inputClass =
    "w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)]";

  return (
    <div className="space-y-6">
      {/* OVERVIEW */}
      <SectionCard
        title="نظرة عامة على التطبيق"
        description="إحصائيات المستخدمين والأجهزة المسجّلة في تطبيق الموبايل."
      >
        {overviewLoading ? (
          <p className="text-sm text-[var(--text-secondary)]">جارِ التحميل…</p>
        ) : overview ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard
                icon={Users}
                label="مستخدمون نشطون"
                value={overview.active_mobile_users}
                meta="حسابات لها جهاز مسجّل"
                tint="#4f8cff"
              />
              <StatCard
                icon={Smartphone}
                label="أجهزة مسجّلة"
                value={overview.registered_devices}
                meta="اشتراكات نشطة"
                tint="#22c55e"
              />
              <StatCard
                icon={Settings}
                label="آخر دخول معلم"
                value={
                  overview.last_teacher_login
                    ? new Date(overview.last_teacher_login).toLocaleDateString("ar-IQ-u-nu-latn")
                    : "—"
                }
                meta="app_last_login"
                tint="#f2a93b"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] p-4">
                <h3 className="mb-3 text-sm font-black text-[var(--text-primary)]">حسب الدور</h3>
                <ul className="space-y-2">
                  {Object.entries(overview.by_role).map(([role, count]) => (
                    <li key={role} className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">{ROLE_LABELS[role] ?? role}</span>
                      <span className="font-bold text-[var(--text-primary)]">{count}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-[var(--border)] p-4">
                <h3 className="mb-3 text-sm font-black text-[var(--text-primary)]">حسب المدرسة</h3>
                {overview.by_school.length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)]">لا توجد بيانات.</p>
                ) : (
                  <ul className="space-y-2">
                    {overview.by_school.slice(0, 8).map((row) => (
                      <li key={row.school_id} className="flex items-center justify-between text-sm">
                        <span className="text-[var(--text-secondary)]">{row.school_name}</span>
                        <span className="font-bold text-[var(--text-primary)]">{row.devices}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">لا توجد بيانات.</p>
        )}
      </SectionCard>

      {/* FEATURE FLAGS */}
      <SectionCard
        title="ميزات التطبيق لكل مدرسة"
        description="فعّل أو عطّل ميزات الموبايل لكل مدرسة على حدة."
      >
        <div className="space-y-4">
          <select
            className={inputClass}
            value={featureSchoolId}
            onChange={(e) => handleFeatureSchoolChange(e.target.value)}
          >
            <option value="">اختر مدرسة…</option>
            {schoolOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {features ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {Object.keys(FEATURE_LABELS).map((key) => {
                const enabled = features[key] ?? true;
                const Icon = enabled ? ToggleRight : ToggleLeft;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={featuresSaving}
                    onClick={() => void toggleFeature(key)}
                    className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm transition hover:border-[var(--primary)] disabled:opacity-60"
                  >
                    <span className="font-bold text-[var(--text-primary)]">{FEATURE_LABELS[key]}</span>
                    <Icon size={22} className={enabled ? "text-[var(--success)]" : "text-[var(--text-muted)]"} />
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">اختر مدرسة لعرض الميزات.</p>
          )}
        </div>
      </SectionCard>

      {/* TARGETED NOTIFICATION SENDER */}
      <SectionCard
        title="إرسال إشعار موجّه"
        description="أرسل إشعارًا إلى مدرسة أو فرع أو صف أو دور أو مستخدم محدّد."
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select
              className={inputClass}
              value={notifScope}
              onChange={(e) => setNotifScope(e.target.value as typeof notifScope)}
            >
              <option value="role">دور (students/teachers)</option>
              <option value="school">مدرسة</option>
              <option value="branch">فرع</option>
              <option value="class">صف</option>
              <option value="user">مستخدم</option>
            </select>
            <input
              className={inputClass}
              placeholder="القيمة (مثال: teachers أو معرّف الفرع/الصف/المستخدم)"
              value={notifValue}
              onChange={(e) => setNotifValue(e.target.value)}
            />
          </div>
          <input
            className={inputClass}
            placeholder="العنوان"
            value={notifTitle}
            onChange={(e) => setNotifTitle(e.target.value)}
          />
          <textarea
            className={inputClass}
            rows={3}
            placeholder="نص الرسالة"
            value={notifMessage}
            onChange={(e) => setNotifMessage(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={notifSending}
              onClick={() => void sendNotification()}
              className="ui-button ui-button--primary inline-flex items-center gap-2 disabled:opacity-60"
            >
              <Send size={16} />
              {notifSending ? "جارِ الإرسال…" : "إرسال"}
            </button>
            {notifResult ? (
              <span className="text-sm text-[var(--text-secondary)]">
                مستهدف {notifResult.targeted ?? 0} • تم {notifResult.sent ?? 0} • فشل {notifResult.failed ?? 0}
              </span>
            ) : null}
          </div>
        </div>
      </SectionCard>

      {/* APP VERSION / FORCE UPDATE */}
      <SectionCard
        title="إصدار التطبيق والتحديث الإجباري"
        description="اضبط الحد الأدنى للإصدار المدعوم وأحدث إصدار. اتركه بدون مدرسة لإعداد عام."
      >
        <div className="space-y-3">
          <select
            className={inputClass}
            value={versionSchoolId}
            onChange={(e) => setVersionSchoolId(e.target.value)}
          >
            <option value="">إعداد عام (كل المدارس)</option>
            {schoolOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              className={inputClass}
              placeholder="أدنى إصدار مدعوم (مثال 1.2.0)"
              value={version.min_supported_version}
              onChange={(e) => setVersion((v) => ({ ...v, min_supported_version: e.target.value }))}
            />
            <input
              className={inputClass}
              placeholder="أحدث إصدار (مثال 1.5.0)"
              value={version.latest_version}
              onChange={(e) => setVersion((v) => ({ ...v, latest_version: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
            <input
              type="checkbox"
              checked={version.force_update}
              onChange={(e) => setVersion((v) => ({ ...v, force_update: e.target.checked }))}
            />
            فرض التحديث (إجباري)
          </label>
          <button
            type="button"
            disabled={versionSaving}
            onClick={() => void saveVersion()}
            className="ui-button ui-button--primary inline-flex items-center gap-2 disabled:opacity-60"
          >
            <Settings size={16} />
            {versionSaving ? "جارِ الحفظ…" : "حفظ"}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
