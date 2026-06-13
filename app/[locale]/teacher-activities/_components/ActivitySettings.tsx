"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { useToast } from "@/components/toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings } from "@/lib/icons";

type MonitoringSettings = {
  review_mode: string;
  require_approval_for_links: boolean;
  require_approval_for_videos: boolean;
  require_approval_for_files: boolean;
  max_image_size_mb: number;
  max_video_size_mb: number;
  max_file_size_mb: number;
  max_attachments_per_activity: number;
  max_daily_notifications: number;
  max_daily_homework: number;
  alert_inactive_days: number;
  alert_low_view_percentage: number;
  weekly_summary_enabled: boolean;
  weekly_summary_day: string;
  total_storage_limit_gb: number;
  teacher_storage_limit_mb: number;
};

const DEFAULT: MonitoringSettings = {
  review_mode: "post_review",
  require_approval_for_links: true,
  require_approval_for_videos: false,
  require_approval_for_files: false,
  max_image_size_mb: 10,
  max_video_size_mb: 100,
  max_file_size_mb: 20,
  max_attachments_per_activity: 10,
  max_daily_notifications: 10,
  max_daily_homework: 5,
  alert_inactive_days: 7,
  alert_low_view_percentage: 50,
  weekly_summary_enabled: true,
  weekly_summary_day: "thursday",
  total_storage_limit_gb: 50,
  teacher_storage_limit_mb: 500,
};

export function ActivitySettings({ schoolId }: { schoolId: string }) {
  const t = useTranslations("teacherActivities");
  const toast = useToast();
  const [settings, setSettings] = useState<MonitoringSettings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; settings: MonitoringSettings }>(
        "/api/v1/teacher-activities/monitoring-settings",
      );
      if (!response.ok) throw new Error();
      setSettings({ ...DEFAULT, ...(payload?.settings ?? {}) });
    } catch {
      toast.error(t("settings.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const { response } = await fetchJsonWithAuthorizedSession("/api/v1/teacher-activities/monitoring-settings", {
        method: "PUT", headers: withJsonHeaders(), body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error();
      toast.success(t("settings.savedSuccess"));
    } catch {
      toast.error(t("settings.errorSave"));
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof MonitoringSettings>(key: K, value: MonitoringSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-[var(--card-bg)] border border-[var(--border)] rounded-[var(--card-radius)] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">

      {/* Review mode */}
      <Section title={t("settings.reviewMode")} icon={<Settings size={16} className="text-[var(--primary)]" />}>
        <div className="flex flex-col gap-3">
          {[
            { value: "post_review",  label: t("settings.reviewModePostReview"),  desc: t("settings.reviewModePostReviewDesc") },
            { value: "pre_approval", label: t("settings.reviewModePreApproval"),  desc: t("settings.reviewModePreApprovalDesc") },
            { value: "disabled",     label: t("settings.reviewModeDisabled"),     desc: t("settings.reviewModeDisabledDesc") },
          ].map((opt) => (
            <label
              key={opt.value}
              className="flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition-colors"
              style={{
                border: `1px solid ${settings.review_mode === opt.value ? "var(--primary)" : "var(--border)"}`,
                background: settings.review_mode === opt.value ? "color-mix(in srgb, var(--primary) 6%, transparent)" : "var(--surface-soft)",
              }}
            >
              <input type="radio" name="review_mode" value={opt.value} checked={settings.review_mode === opt.value} onChange={() => set("review_mode", opt.value)} className="mt-0.5" />
              <div>
                <div className="text-sm font-bold text-[var(--text-primary)]">{opt.label}</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <p className="text-sm font-bold text-[var(--text-secondary)] mb-3">{t("settings.requireApprovalFor")}</p>
          <div className="flex flex-col gap-2">
            {[
              { key: "require_approval_for_links"  as const, label: t("settings.requireApprovalLinks") },
              { key: "require_approval_for_videos" as const, label: t("settings.requireApprovalVideos") },
              { key: "require_approval_for_files"  as const, label: t("settings.requireApprovalFiles") },
            ].map((item) => (
              <label key={item.key} className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={settings[item.key]} onChange={(e) => set(item.key, e.target.checked)} className="w-4 h-4" />
                <span className="text-sm text-[var(--text-secondary)]">{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      </Section>

      {/* Size limits */}
      <Section title={t("settings.fileSizeLimits")}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <NumberInput label={t("settings.maxImageSize")}    value={settings.max_image_size_mb}            onChange={(v) => set("max_image_size_mb", v)}            min={1}  max={50}   />
          <NumberInput label={t("settings.maxVideoSize")}    value={settings.max_video_size_mb}            onChange={(v) => set("max_video_size_mb", v)}            min={10} max={500}  />
          <NumberInput label={t("settings.maxFileSize")}     value={settings.max_file_size_mb}             onChange={(v) => set("max_file_size_mb", v)}             min={1}  max={100}  />
          <NumberInput label={t("settings.maxAttachments")}  value={settings.max_attachments_per_activity} onChange={(v) => set("max_attachments_per_activity", v)} min={1}  max={20}   />
        </div>
      </Section>

      {/* Daily limits */}
      <Section title={t("settings.dailyLimits")}>
        <div className="grid grid-cols-2 gap-4">
          <NumberInput label={t("settings.maxDailyNotifications")} value={settings.max_daily_notifications} onChange={(v) => set("max_daily_notifications", v)} min={1} max={50} />
          <NumberInput label={t("settings.maxDailyHomework")}       value={settings.max_daily_homework}       onChange={(v) => set("max_daily_homework", v)}       min={1} max={20} />
        </div>
      </Section>

      {/* Alerts */}
      <Section title={t("settings.alertsAndReports")}>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <NumberInput label={t("settings.alertInactiveDays")}  value={settings.alert_inactive_days}       onChange={(v) => set("alert_inactive_days", v)}       min={1}  max={30} />
          <NumberInput label={t("settings.alertLowViewPct")}    value={settings.alert_low_view_percentage} onChange={(v) => set("alert_low_view_percentage", v)} min={10} max={90} />
        </div>
        <div className="flex flex-col gap-3 pt-4 border-t border-[var(--border)]">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={settings.weekly_summary_enabled} onChange={(e) => set("weekly_summary_enabled", e.target.checked)} className="w-4 h-4" />
            <span className="text-sm text-[var(--text-secondary)]">{t("settings.enableWeeklySummary")}</span>
          </label>
          {settings.weekly_summary_enabled && (
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-2">{t("settings.weeklySummaryDay")}</p>
              <select value={settings.weekly_summary_day} onChange={(e) => set("weekly_summary_day", e.target.value)} className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-primary)] text-sm outline-none">
                <option value="saturday">{t("settings.saturday")}</option>
                <option value="sunday">{t("settings.sunday")}</option>
                <option value="thursday">{t("settings.thursday")}</option>
              </select>
            </div>
          )}
        </div>
      </Section>

      {/* Storage */}
      <Section title={t("settings.storageLimits")}>
        <div className="grid grid-cols-2 gap-4">
          <NumberInput label={t("settings.totalStorageLimit")}   value={settings.total_storage_limit_gb}   onChange={(v) => set("total_storage_limit_gb", v)}   min={5}  max={1000} />
          <NumberInput label={t("settings.teacherStorageLimit")} value={settings.teacher_storage_limit_mb} onChange={(v) => set("teacher_storage_limit_mb", v)} min={50} max={2000} />
        </div>
      </Section>

      <div>
        <Button variant="primary" onClick={save} disabled={saving}>
          {saving ? t("settings.saving") : t("settings.saveBtn")}
        </Button>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-[var(--text-primary)] mb-4">
          {icon}
          {title}
        </h3>
        {children}
      </CardContent>
    </Card>
  );
}

function NumberInput({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <div>
      <label className="block text-xs text-[var(--text-muted)] font-semibold mb-1.5">{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-primary)] text-sm font-semibold outline-none"
      />
    </div>
  );
}
