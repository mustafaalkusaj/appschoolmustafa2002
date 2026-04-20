"use client";

import { ModalFrame } from "./ui";
import { cx } from "./utils";
import type { SchoolRecord, SchoolPlan } from "./types";
import { DEFAULT_SCHOOL_BRANDING } from "./types";
import { SchoolLogo } from "@/components/brand";
import { BRAND_THEME_FAMILIES, type BrandThemeFamilyId, type BrandThemePresetId, getBrandThemePreset } from "@/lib/brand/themes";
import { derivePaletteFromLogo, mixColors, shiftColor, setStoredSchoolBranding, getStoredSchoolBranding } from "@/lib/brand/palette";
import type { AppSchemaCompat } from "@/lib/schema-compat";
import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { getErrorMessage } from "./utils";

interface SchoolFormData {
  name: string;
  address: string;
  phone: string;
  owner_email: string;
  city: string;
  logo_url: string;
  familyId: BrandThemeFamilyId | null;
  themePresetId: BrandThemePresetId | null;
  primary_color: string;
  secondary_color: string;
  sidebar_color: string;
  accent_color: string;
  text_color: string;
  plan: SchoolPlan;
}

function createInitialFormState(): SchoolFormData {
  return {
    name: "",
    address: "",
    phone: "",
    owner_email: "",
    city: "",
    logo_url: "",
    familyId: null,
    themePresetId: null,
    primary_color: DEFAULT_SCHOOL_BRANDING.primary_color,
    secondary_color: DEFAULT_SCHOOL_BRANDING.secondary_color,
    sidebar_color: DEFAULT_SCHOOL_BRANDING.sidebar_color,
    accent_color: DEFAULT_SCHOOL_BRANDING.accent_color,
    text_color: DEFAULT_SCHOOL_BRANDING.text_color,
    plan: "basic",
  };
}

function buildSuggestedBranding(primaryColor: string, secondaryColor: string) {
  const primary = primaryColor || DEFAULT_SCHOOL_BRANDING.primary_color;
  const secondary = secondaryColor || DEFAULT_SCHOOL_BRANDING.secondary_color;
  return {
    primary_color: primary,
    secondary_color: secondary,
    sidebar_color: mixColors(primary, "#eff7ff", 0.52),
    accent_color: shiftColor(primary, -0.08),
    text_color: shiftColor(primary, -0.64),
  };
}

interface SchoolFormProps {
  isOpen: boolean;
  editSchool: SchoolRecord | null;
  schemaCompat: AppSchemaCompat | null;
  onClose: () => void;
  onSave: (data: SchoolFormData, editSchool: SchoolRecord | null) => Promise<void>;
}

export function SchoolForm({ isOpen, editSchool, schemaCompat, onClose, onSave }: SchoolFormProps) {
  const t = useTranslations("superAdmin.schoolForm");
  const themesT = useTranslations("dashboard.branding");
  const commonT = useTranslations("common");

  const [formData, setFormData] = useState<SchoolFormData>(createInitialFormState());
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [paletteBusy, setPaletteBusy] = useState(false);

  // Initialize form when opening
  const initializeForm = useCallback((school: SchoolRecord | null) => {
    if (school) {
      const storedBranding = getStoredSchoolBranding(school.id);
      const suggestedBranding = buildSuggestedBranding(
        school.primary_color ?? DEFAULT_SCHOOL_BRANDING.primary_color,
        school.secondary_color ?? DEFAULT_SCHOOL_BRANDING.secondary_color
      );
      const preset = storedBranding?.themePreset ? getBrandThemePreset(storedBranding.themePreset) ?? null : null;
      
      setFormData({
        name: school.name,
        address: school.address ?? "",
        phone: school.phone ?? "",
        owner_email: school.owner_email ?? "",
        city: school.city ?? "",
        logo_url: school.logo_url ?? "",
        familyId: preset?.familyId ?? null,
        themePresetId: preset?.id ?? null,
        primary_color: school.primary_color ?? storedBranding?.primaryColor ?? DEFAULT_SCHOOL_BRANDING.primary_color,
        secondary_color: school.secondary_color ?? storedBranding?.secondaryColor ?? DEFAULT_SCHOOL_BRANDING.secondary_color,
        sidebar_color: storedBranding?.sidebarColor ?? suggestedBranding.sidebar_color,
        accent_color: storedBranding?.accentColor ?? suggestedBranding.accent_color,
        text_color: storedBranding?.textColor ?? suggestedBranding.text_color,
        plan: school.plan ?? "basic",
      });
    } else {
      setFormData(createInitialFormState());
    }
    setNotice("");
  }, []);

  // Handle derive palette from logo
  const handleDerivePalette = async () => {
    setPaletteBusy(true);
    setNotice("");
    try {
      const palette = await derivePaletteFromLogo(formData.logo_url.trim() || null, formData.name.trim());
      setFormData((current) => ({
        ...current,
        primary_color: palette.primaryColor,
        secondary_color: palette.secondaryColor,
        sidebar_color: mixColors(palette.primaryColor, "#eff7ff", 0.52),
        accent_color: shiftColor(palette.primaryColor, -0.08),
        text_color: shiftColor(palette.primaryColor, -0.64),
      }));
      setNotice(formData.logo_url.trim() ? "تم استخراج الألوان من الشعار ويمكنك تعديلها قبل الحفظ." : "لا يوجد رابط شعار، لذا تم توليد ألوان احترافية اعتماداً على اسم المدرسة.");
    } catch (err) {
      setNotice(getErrorMessage(err, "تعذر استخراج الألوان تلقائياً."));
    } finally {
      setPaletteBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData, editSchool);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  // Initialize form on first render when open
  if (isOpen && (editSchool ? formData.name !== editSchool.name : formData.name !== "" && formData.name !== createInitialFormState().name)) {
    // Form already initialized
  } else if (isOpen && editSchool && formData.name === "") {
    initializeForm(editSchool);
  } else if (isOpen && !editSchool && formData.name !== "") {
    initializeForm(null);
  }

  // Simplified create form — group name only
  if (isOpen && !editSchool) {
    return (
      <ModalFrame
        title="إضافة مجموعة / مدرسة"
        subtitle="أدخل اسم المجموعة أو المدرسة — الفروع هي الوحدات التشغيلية وتُضاف لاحقاً"
        onClose={onClose}
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">
              اسم المجموعة / المدرسة
            </label>
            <input
              className="ui-input"
              required
              placeholder="مثال: مجموعة النور التعليمية"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <p className="mt-2 text-xs font-bold text-[var(--text-muted)]">
              المدرسة تُدار عبر فروعها — أضف الفروع بعد إنشاء المجموعة
            </p>
          </div>

          {notice ? (
            <div
              className={cx(
                "rounded-[18px] border px-4 py-3 text-sm font-bold",
                notice.includes("تعذر") ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
              )}
            >
              {notice}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <button type="button" className="ui-button ui-button--secondary" onClick={onClose}>
              {commonT("cancel")}
            </button>
            <button type="submit" className="ui-button ui-button--primary" disabled={saving}>
              {saving ? t("saving") : t("add")}
            </button>
          </div>
        </form>
      </ModalFrame>
    );
  }

  return (
    <ModalFrame
      title={t("titleEdit")}
      subtitle={t("subtitle")}
      onClose={onClose}
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">{t("schoolName")}</label>
            <input
              className="ui-input"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">{t("city")}</label>
            <input className="ui-input" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">{t("phone")}</label>
            <input className="ui-input" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">{t("ownerEmail")}</label>
            <input type="email" className="ui-input" value={formData.owner_email} onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">{t("address")}</label>
            <input className="ui-input" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">{t("logoUrl")}</label>
            <input className="ui-input" placeholder="https://example.com/logo.png" value={formData.logo_url} onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">{t("themeFamily")}</label>
            <select
              className="ui-input mb-3"
              value={formData.familyId || ""}
              onChange={(e) => {
                const familyId = e.target.value as BrandThemeFamilyId;
                const family = BRAND_THEME_FAMILIES.find((f) => f.id === familyId);
                const firstPreset = family?.presets[0]?.id || null;
                setFormData((prev) => ({
                  ...prev,
                  familyId: familyId || null,
                  themePresetId: firstPreset,
                }));
              }}
            >
              <option value="">{t("selectFamily")}</option>
              {BRAND_THEME_FAMILIES.map((family) => (
                <option key={family.id} value={family.id}>
                  {themesT(`families.${family.id}.label`)}
                </option>
              ))}
            </select>

            <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">{t("selectedTheme")}</label>
            <select
              className="ui-input"
              value={formData.themePresetId || ""}
              onChange={(e) => {
                const presetId = e.target.value as BrandThemePresetId;
                const preset = getBrandThemePreset(presetId);
                if (preset) {
                  setFormData((prev) => ({
                    ...prev,
                    themePresetId: presetId,
                    primary_color: preset.primaryColor,
                    secondary_color: preset.secondaryColor,
                    sidebar_color: preset.sidebarColor,
                    accent_color: preset.accentColor,
                    text_color: preset.textColor,
                  }));
                }
              }}
            >
              <option value="">{t("selectTheme")}</option>
              {formData.familyId &&
                BRAND_THEME_FAMILIES.find((f) => f.id === formData.familyId)?.presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">{t("primaryColor")}</label>
            <input
              type="color"
              className="ui-input"
              value={formData.primary_color || DEFAULT_SCHOOL_BRANDING.primary_color}
              onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">{t("secondaryColor")}</label>
            <input
              type="color"
              className="ui-input"
              value={formData.secondary_color || DEFAULT_SCHOOL_BRANDING.secondary_color}
              onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">{t("sidebarColor")}</label>
            <input
              type="color"
              className="ui-input"
              value={formData.sidebar_color || DEFAULT_SCHOOL_BRANDING.sidebar_color}
              onChange={(e) => setFormData({ ...formData, sidebar_color: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">{t("accentColor")}</label>
            <input
              type="color"
              className="ui-input"
              value={formData.accent_color || DEFAULT_SCHOOL_BRANDING.accent_color}
              onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">{t("textColor")}</label>
            <input
              type="color"
              className="ui-input"
              value={formData.text_color || DEFAULT_SCHOOL_BRANDING.text_color}
              onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
            />
          </div>
          <div className="md:col-span-2 rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
            <div className="flex flex-wrap items-center gap-4">
              <SchoolLogo src={formData.logo_url} alt={formData.name || "School logo"} label={formData.name || "School"} size={64} className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-strong)]" />
              <div className="min-w-0 flex-1">
                <div className="text-base font-black text-[var(--text-primary)]">{formData.name || t("previewTitle")}</div>
                <p className="mt-1 text-sm leading-7 text-[var(--text-secondary)]">{t("previewHint")}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div
                    className="rounded-[18px] border border-[var(--border)] px-3 py-3"
                    style={{ background: formData.sidebar_color || DEFAULT_SCHOOL_BRANDING.sidebar_color }}
                  >
                    <div className="text-xs font-black" style={{ color: formData.text_color || DEFAULT_SCHOOL_BRANDING.text_color }}>
                      {t("sidebarLabel")}
                    </div>
                    <div className="mt-2 text-[11px] font-bold" style={{ color: formData.text_color || DEFAULT_SCHOOL_BRANDING.text_color }}>
                      {formData.sidebar_color || DEFAULT_SCHOOL_BRANDING.sidebar_color}
                    </div>
                  </div>
                  <div
                    className="rounded-[18px] px-3 py-3 text-white"
                    style={{
                      background: `linear-gradient(135deg, ${formData.primary_color || DEFAULT_SCHOOL_BRANDING.primary_color}, ${formData.secondary_color || DEFAULT_SCHOOL_BRANDING.secondary_color})`,
                    }}
                  >
                    <div className="text-xs font-black">{t("generalIdentity")}</div>
                    <div className="mt-2 text-[11px] font-bold opacity-90">{formData.primary_color || DEFAULT_SCHOOL_BRANDING.primary_color}</div>
                  </div>
                  <div className="rounded-[18px] px-3 py-3 text-white" style={{ background: formData.accent_color || DEFAULT_SCHOOL_BRANDING.accent_color }}>
                    <div className="text-xs font-black">{t("buttonsAccent")}</div>
                    <div className="mt-2 text-[11px] font-bold opacity-90">{formData.accent_color || DEFAULT_SCHOOL_BRANDING.accent_color}</div>
                  </div>
                </div>
                {!schemaCompat?.schoolColors ? (
                  <p className="mt-1 text-xs font-bold text-amber-700">{t("missingColumns")}</p>
                ) : null}
              </div>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">{t("plan")}</label>
            <select className="ui-input" value={formData.plan} onChange={(e) => setFormData({ ...formData, plan: e.target.value as SchoolPlan })}>
              <option value="basic">{t("plans.basic")}</option>
              <option value="premium">{t("plans.premium")}</option>
              <option value="enterprise">{t("plans.enterprise")}</option>
            </select>
          </div>
        </div>

        {notice ? (
          <div
            className={cx(
              "rounded-[18px] border px-4 py-3 text-sm font-bold",
              notice.includes("تعذر") ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
            )}
          >
            {notice}
          </div>
        ) : null}

        <div className="flex flex-wrap justify-between gap-2">
          <button type="button" className="ui-button ui-button--secondary" onClick={handleDerivePalette} disabled={paletteBusy}>
            {paletteBusy ? t("extracting") : t("extractColors")}
          </button>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="ui-button ui-button--secondary" onClick={onClose}>
              {commonT("cancel")}
            </button>
            <button type="submit" className="ui-button ui-button--primary" disabled={saving}>
              {saving ? t("saving") : editSchool ? t("save") : t("add")}
            </button>
          </div>
        </div>
      </form>
    </ModalFrame>
  );
}

export type { SchoolFormData };
export { createInitialFormState, setStoredSchoolBranding };
