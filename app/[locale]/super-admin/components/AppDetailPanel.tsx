"use client";

import { useState } from "react";
import {
  Palette,
  Layers,
  BarChart3,
  UserCheck,
  Hash,
  Banknote,
  GraduationCap,
  MessageSquare,
  BookOpen,
  ClipboardList,
  CalendarDays,
  type LucideIcon,
} from "@/lib/icons";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import {
  APP_THEME_PRESETS,
  type ThemePreset,
} from "@/lib/app-themes/presets";
import {
  type AppRecord,
  type AppThemeRecord,
  type AppFeatureRecord,
  type AppUsageLimitRecord,
  MODULE_KEYS,
  MODULE_LABELS,
  type ModuleKey,
  type BorderRadius,
} from "@/lib/app-themes/types";
import { cx } from "./UI";

const MODULE_ICON_MAP: Record<ModuleKey, LucideIcon> = {
  attendance: UserCheck,
  accounting: Hash,
  salaries: Banknote,
  grades: GraduationCap,
  reports: BarChart3,
  messaging: MessageSquare,
  transport: Layers,
  library: BookOpen,
  exams: ClipboardList,
  timetable: CalendarDays,
};

const FONT_OPTIONS = [
  { value: "Cairo", label: "Cairo" },
  { value: "Tajawal", label: "Tajawal" },
  { value: "Almarai", label: "Almarai" },
  { value: "Noto Kufi Arabic", label: "Noto Kufi Arabic" },
];

const BORDER_RADIUS_OPTIONS: Array<{ value: BorderRadius; label: string }> = [
  { value: "sm", label: "صغير" },
  { value: "md", label: "متوسط" },
  { value: "lg", label: "كبير" },
  { value: "xl", label: "كبير جداً" },
];

type SubTab = "theme" | "modules" | "limits";

interface ThemeFormState {
  usePreset: boolean;
  presetId: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  sidebarColor: string;
  topbarColor: string;
  fontFamily: string;
  borderRadius: BorderRadius;
  darkModeEnabled: boolean;
}

function buildThemeForm(theme: AppThemeRecord | null | undefined): ThemeFormState {
  return {
    usePreset: theme?.type === "preset",
    presetId: theme?.presetId ?? "",
    primaryColor: theme?.primaryColor ?? "#1e6cce",
    secondaryColor: theme?.secondaryColor ?? "#64b5f6",
    accentColor: theme?.accentColor ?? "#0d47a1",
    textColor: theme?.textColor ?? "#1a2332",
    sidebarColor: theme?.sidebarColor ?? "#e8f1fb",
    topbarColor: theme?.topbarColor ?? "#1e6cce",
    fontFamily: theme?.fontFamily ?? "Cairo",
    borderRadius: theme?.borderRadius ?? "lg",
    darkModeEnabled: theme?.darkModeEnabled ?? false,
  };
}

function buildModulesMap(features: AppFeatureRecord[] | undefined): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const key of MODULE_KEYS) {
    const feat = features?.find((f) => f.moduleKey === key);
    map[key] = feat?.isEnabled ?? true;
  }
  return map;
}

function buildLimitsForm(limit: AppUsageLimitRecord | null | undefined) {
  return {
    maxStudents: limit?.maxStudents ?? 500,
    maxBranches: limit?.maxBranches ?? 5,
    maxStorageMB: limit?.maxStorageMB ?? 5120,
    maxUsers: limit?.maxUsers ?? 50,
    maxClasses: limit?.maxClasses ?? 30,
  };
}

function ProgressBar({ label, current, max }: { label: string; current: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
  const tint = pct >= 90 ? "var(--danger)" : pct >= 70 ? "var(--warning)" : "var(--success)";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs font-bold text-[var(--text-secondary)]">
        <span>{label}</span>
        <span>
          {current} / {max} ({pct}%)
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: tint }}
        />
      </div>
    </div>
  );
}

export function AppDetailPanel({ app, onUpdate }: { app: AppRecord; onUpdate: () => void }) {
  const [subTab, setSubTab] = useState<SubTab>("theme");

  // Theme state
  const [themeForm, setThemeForm] = useState<ThemeFormState>(() => buildThemeForm(app.theme));
  const [savingTheme, setSavingTheme] = useState(false);
  const [themeError, setThemeError] = useState<string | null>(null);
  const [themeSuccess, setThemeSuccess] = useState(false);

  // Modules state
  const [modulesMap, setModulesMap] = useState<Record<string, boolean>>(() =>
    buildModulesMap(app.features),
  );
  const [savingModules, setSavingModules] = useState(false);
  const [modulesError, setModulesError] = useState<string | null>(null);
  const [modulesSuccess, setModulesSuccess] = useState(false);

  // Limits state
  const [limitsForm, setLimitsForm] = useState(() => buildLimitsForm(app.usageLimit));
  const [savingLimits, setSavingLimits] = useState(false);
  const [limitsError, setLimitsError] = useState<string | null>(null);
  const [limitsSuccess, setLimitsSuccess] = useState(false);

  const applyPreset = (preset: ThemePreset) => {
    setThemeForm((prev) => ({
      ...prev,
      usePreset: true,
      presetId: preset.id,
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      accentColor: preset.accentColor,
      textColor: preset.textColor,
      sidebarColor: preset.sidebarColor,
      topbarColor: preset.topbarColor,
      fontFamily: preset.fontFamily,
      borderRadius: preset.borderRadius,
      darkModeEnabled: preset.darkModeEnabled,
    }));
  };

  const handleSaveTheme = async () => {
    setSavingTheme(true);
    setThemeError(null);
    setThemeSuccess(false);
    try {
      await fetchJsonWithAuthorizedSession(`/api/web/super-admin/apps/${app.id}/theme`, {
        method: "PUT",
        headers: withJsonHeaders(),
        body: JSON.stringify({
          type: themeForm.usePreset ? "preset" : "custom",
          presetId: themeForm.usePreset ? themeForm.presetId : null,
          primaryColor: themeForm.primaryColor,
          secondaryColor: themeForm.secondaryColor,
          accentColor: themeForm.accentColor,
          textColor: themeForm.textColor,
          sidebarColor: themeForm.sidebarColor,
          topbarColor: themeForm.topbarColor,
          fontFamily: themeForm.fontFamily,
          borderRadius: themeForm.borderRadius,
          darkModeEnabled: themeForm.darkModeEnabled,
        }),
      });
      setThemeSuccess(true);
      onUpdate();
    } catch (err) {
      setThemeError(err instanceof Error ? err.message : "حدث خطأ أثناء حفظ الثيم.");
    } finally {
      setSavingTheme(false);
    }
  };

  const handleSaveModules = async () => {
    setSavingModules(true);
    setModulesError(null);
    setModulesSuccess(false);
    try {
      const features = MODULE_KEYS.map((key) => ({
        moduleKey: key,
        isEnabled: modulesMap[key] ?? true,
      }));
      await fetchJsonWithAuthorizedSession(`/api/web/super-admin/apps/${app.id}/features`, {
        method: "PUT",
        headers: withJsonHeaders(),
        body: JSON.stringify({ features }),
      });
      setModulesSuccess(true);
      onUpdate();
    } catch (err) {
      setModulesError(err instanceof Error ? err.message : "حدث خطأ أثناء حفظ الوحدات.");
    } finally {
      setSavingModules(false);
    }
  };

  const handleSaveLimits = async () => {
    setSavingLimits(true);
    setLimitsError(null);
    setLimitsSuccess(false);
    try {
      await fetchJsonWithAuthorizedSession(`/api/web/super-admin/apps/${app.id}/limits`, {
        method: "PUT",
        headers: withJsonHeaders(),
        body: JSON.stringify(limitsForm),
      });
      setLimitsSuccess(true);
      onUpdate();
    } catch (err) {
      setLimitsError(err instanceof Error ? err.message : "حدث خطأ أثناء حفظ الحدود.");
    } finally {
      setSavingLimits(false);
    }
  };

  const SUB_TABS: Array<{ id: SubTab; label: string; icon: LucideIcon }> = [
    { id: "theme", label: "الثيم", icon: Palette },
    { id: "modules", label: "الوحدات", icon: Layers },
    { id: "limits", label: "الحدود", icon: BarChart3 },
  ];

  return (
    <div className="mt-4 rounded-[28px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
      {/* Sub-tab bar */}
      <div className="mb-5 flex items-center gap-1 rounded-[20px] bg-[var(--surface-strong)] p-1">
        {SUB_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubTab(id)}
            className={cx(
              "flex flex-1 items-center justify-center gap-2 rounded-[16px] px-4 py-2.5 text-sm font-black transition-all",
              subTab === id
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            )}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Theme tab ── */}
      {subTab === "theme" && (
        <div className="space-y-6">
          {/* Preset grid */}
          <div>
            <div className="mb-3 text-sm font-black text-[var(--text-primary)]">ثيمات جاهزة</div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {APP_THEME_PRESETS.map((preset) => {
                const isActive = themeForm.presetId === preset.id && themeForm.usePreset;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={cx(
                      "rounded-[18px] border p-3 text-start transition hover:-translate-y-0.5",
                      isActive
                        ? "border-[var(--primary)] shadow-sm"
                        : "border-[var(--border)] hover:border-[var(--primary)]/40",
                    )}
                  >
                    <div
                      className="mb-2 h-10 w-full rounded-[12px]"
                      style={{ background: preset.preview }}
                    />
                    <div className="text-xs font-black text-[var(--text-primary)]">
                      {preset.nameAr}
                    </div>
                    {preset.darkModeEnabled && (
                      <div className="mt-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                        وضع داكن
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom mode toggle */}
          <div className="flex items-center gap-3 rounded-[18px] border border-[var(--border)] px-4 py-3">
            <button
              type="button"
              onClick={() =>
                setThemeForm((prev) => ({ ...prev, usePreset: !prev.usePreset, presetId: "" }))
              }
              className={cx(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                !themeForm.usePreset ? "bg-[var(--primary)]" : "bg-[var(--border)]",
              )}
            >
              <span
                className={cx(
                  "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                  !themeForm.usePreset ? "translate-x-6" : "translate-x-1",
                )}
              />
            </button>
            <span className="text-sm font-black text-[var(--text-primary)]">
              ألوان مخصصة
            </span>
          </div>

          {/* Custom color pickers */}
          {!themeForm.usePreset && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  { key: "primaryColor", label: "اللون الأساسي" },
                  { key: "secondaryColor", label: "اللون الثانوي" },
                  { key: "accentColor", label: "لون التمييز" },
                  { key: "textColor", label: "لون النص" },
                  { key: "sidebarColor", label: "لون القائمة الجانبية" },
                  { key: "topbarColor", label: "لون الشريط العلوي" },
                ] as const
              ).map(({ key, label }) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-xs font-black text-[var(--text-primary)]">{label}</label>
                  <input
                    type="color"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                    value={themeForm[key]}
                    onChange={(e) =>
                      setThemeForm((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          )}

          {/* Font + border radius */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[var(--text-primary)]">الخط العربي</label>
              <select
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                value={themeForm.fontFamily}
                onChange={(e) => setThemeForm((prev) => ({ ...prev, fontFamily: e.target.value }))}
              >
                {FONT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-[var(--text-primary)]">
                نصف قطر الحواف
              </label>
              <select
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                value={themeForm.borderRadius}
                onChange={(e) =>
                  setThemeForm((prev) => ({
                    ...prev,
                    borderRadius: e.target.value as BorderRadius,
                  }))
                }
              >
                {BORDER_RADIUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dark mode toggle */}
          <div className="flex items-center gap-3 rounded-[18px] border border-[var(--border)] px-4 py-3">
            <button
              type="button"
              onClick={() =>
                setThemeForm((prev) => ({ ...prev, darkModeEnabled: !prev.darkModeEnabled }))
              }
              className={cx(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                themeForm.darkModeEnabled ? "bg-[var(--primary)]" : "bg-[var(--border)]",
              )}
            >
              <span
                className={cx(
                  "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                  themeForm.darkModeEnabled ? "translate-x-6" : "translate-x-1",
                )}
              />
            </button>
            <span className="text-sm font-black text-[var(--text-primary)]">الوضع الداكن</span>
          </div>

          {/* Live preview strip */}
          <div className="overflow-hidden rounded-[20px] border border-[var(--border)]">
            <div
              className="flex h-10 items-center px-4"
              style={{ background: themeForm.topbarColor }}
            />
            <div className="flex">
              <div
                className="w-20 min-h-[80px]"
                style={{ background: themeForm.sidebarColor }}
              />
              <div
                className="flex flex-1 items-center justify-center gap-3 p-4"
                style={{ background: themeForm.darkModeEnabled ? "#0f172a" : "#f8fafc" }}
              >
                <div
                  className="h-8 w-8 rounded-full"
                  style={{ background: themeForm.primaryColor }}
                />
                <div
                  className="h-8 flex-1 rounded-[10px]"
                  style={{ background: themeForm.secondaryColor }}
                />
                <div
                  className="h-8 w-16 rounded-[10px]"
                  style={{ background: themeForm.accentColor }}
                />
              </div>
            </div>
          </div>

          {/* Messages */}
          {themeError && (
            <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              {themeError}
            </div>
          )}
          {themeSuccess && (
            <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              تم حفظ الثيم بنجاح.
            </div>
          )}

          <button
            type="button"
            disabled={savingTheme}
            onClick={handleSaveTheme}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-6 font-black text-white shadow-lg shadow-[var(--primary)]/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60"
          >
            {savingTheme ? "جاري الحفظ..." : "حفظ الثيم"}
          </button>
        </div>
      )}

      {/* ── Modules tab ── */}
      {subTab === "modules" && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {MODULE_KEYS.map((key) => {
              const Icon = MODULE_ICON_MAP[key];
              const enabled = modulesMap[key] ?? true;
              return (
                <div
                  key={key}
                  className={cx(
                    "flex items-center justify-between gap-4 rounded-[18px] border p-4 transition",
                    enabled ? "border-[var(--primary)]/30 bg-[var(--primary)]/5" : "border-[var(--border)]",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cx(
                        "inline-flex h-10 w-10 items-center justify-center rounded-[14px]",
                        enabled
                          ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                          : "bg-[var(--surface-muted)] text-[var(--text-muted)]",
                      )}
                    >
                      <Icon size={18} />
                    </div>
                    <span className="text-sm font-black text-[var(--text-primary)]">
                      {MODULE_LABELS[key]}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setModulesMap((prev) => ({ ...prev, [key]: !prev[key] }))
                    }
                    className={cx(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      enabled ? "bg-[var(--primary)]" : "bg-[var(--border)]",
                    )}
                  >
                    <span
                      className={cx(
                        "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                        enabled ? "translate-x-6" : "translate-x-1",
                      )}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          {modulesError && (
            <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              {modulesError}
            </div>
          )}
          {modulesSuccess && (
            <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              تم حفظ الوحدات بنجاح.
            </div>
          )}

          <button
            type="button"
            disabled={savingModules}
            onClick={handleSaveModules}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-6 font-black text-white shadow-lg shadow-[var(--primary)]/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60"
          >
            {savingModules ? "جاري الحفظ..." : "حفظ الوحدات"}
          </button>
        </div>
      )}

      {/* ── Limits tab ── */}
      {subTab === "limits" && (
        <div className="space-y-5">
          {/* Progress bars (current usage) */}
          {app.usageLimit && (
            <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-strong)] p-4 space-y-4">
              <div className="text-sm font-black text-[var(--text-primary)]">الاستخدام الحالي</div>
              <ProgressBar
                label="الطلاب"
                current={app.usageLimit.currentStudents}
                max={limitsForm.maxStudents}
              />
              <ProgressBar
                label="الفروع"
                current={app.usageLimit.currentBranches}
                max={limitsForm.maxBranches}
              />
              <ProgressBar
                label="التخزين (MB)"
                current={app.usageLimit.currentStorageMB}
                max={limitsForm.maxStorageMB}
              />
              <ProgressBar
                label="المستخدمين"
                current={app.usageLimit.currentUsers}
                max={limitsForm.maxUsers}
              />
              <ProgressBar
                label="الفصول"
                current={app.usageLimit.currentClasses}
                max={limitsForm.maxClasses}
              />
            </div>
          )}

          {/* Limit inputs */}
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                { key: "maxStudents", label: "الحد الأقصى للطلاب" },
                { key: "maxBranches", label: "الحد الأقصى للفروع" },
                { key: "maxStorageMB", label: "التخزين الأقصى (MB)" },
                { key: "maxUsers", label: "الحد الأقصى للمستخدمين" },
                { key: "maxClasses", label: "الحد الأقصى للفصول" },
              ] as const
            ).map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <label className="text-xs font-black text-[var(--text-primary)]">{label}</label>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  value={limitsForm[key]}
                  onChange={(e) =>
                    setLimitsForm((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                  }
                />
              </div>
            ))}
          </div>

          {limitsError && (
            <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              {limitsError}
            </div>
          )}
          {limitsSuccess && (
            <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              تم حفظ الحدود بنجاح.
            </div>
          )}

          <button
            type="button"
            disabled={savingLimits}
            onClick={handleSaveLimits}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-6 font-black text-white shadow-lg shadow-[var(--primary)]/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60"
          >
            {savingLimits ? "جاري الحفظ..." : "حفظ الحدود"}
          </button>
        </div>
      )}
    </div>
  );
}
