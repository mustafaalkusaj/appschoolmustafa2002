"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { deduplicatedFetch } from "@/lib/request-cache";
import { resolveSchoolIdForProfile } from "@/lib/school/context";
import type { UserProfile } from "@/lib/auth";
import {
  derivePaletteFromLogo,
  getStoredSchoolBranding,
  setStoredSchoolBranding,
} from "@/lib/brand/palette";
import { getBrandThemePreset } from "@/lib/brand/themes";
import { requestRuntimeBrandingRefresh } from "@/hooks/brand";
import { BrandingFormData } from "../_components/types";

interface UseBrandingProps {
  profile: UserProfile | null;
  selectedSchoolId: string | null;
  scopeLoading: boolean;
}

export function useBranding({ profile, selectedSchoolId, scopeLoading }: UseBrandingProps) {
  const [brandingSchoolId, setBrandingSchoolId] = useState<string | null>(null);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingDeriving, setBrandingDeriving] = useState(false);
  const [brandingNotice, setBrandingNotice] = useState("");
  const [brandingForm, setBrandingForm] = useState<BrandingFormData>({
    name: "",
    logo_url: "",
    primary_color: "#4f8cff",
    secondary_color: "#79d7ff",
    theme_preset: "",
  });

  const selectedBrandTheme = getBrandThemePreset(brandingForm.theme_preset);

  const fetchSchoolBranding = useCallback(async () => {
    if (profile?.role !== "super_admin") return;
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId });
    setBrandingSchoolId(schoolId);
    if (!schoolId) {
      setBrandingForm((prev) => ({
        ...prev,
        name: "",
        logo_url: "",
        primary_color: "#4f8cff",
        secondary_color: "#79d7ff",
        theme_preset: "",
      }));
      return;
    }

    const cacheKey = `dashboard-branding:${schoolId}`;
    const { response, payload } = await deduplicatedFetch(
      cacheKey,
      () => fetchJsonWithAuthorizedSession<{
        school?: {
          name?: string | null;
          logo_url?: string | null;
          primary_color?: string | null;
          secondary_color?: string | null;
          theme_preset?: string | null;
        };
        schemaCompat?: { schoolColors?: boolean; schoolThemePreset?: boolean };
        error?: { message?: string };
      }>(`/api/web/dashboard/branding?schoolId=${encodeURIComponent(schoolId)}`)
    );

    if (!response.ok || !payload?.school) {
      setBrandingNotice(payload?.error?.message || "تعذر تحميل الهوية البصرية.");
      return;
    }

    const compat = {
      schoolColors: Boolean(payload.schemaCompat?.schoolColors),
      schoolThemePreset: Boolean(payload.schemaCompat?.schoolThemePreset),
    };
    const storedBranding = getStoredSchoolBranding(schoolId);
    const school = payload.school;

    let primaryColor =
      compat.schoolColors && typeof school.primary_color === "string"
        ? school.primary_color
        : storedBranding?.primaryColor || "";
    let secondaryColor =
      compat.schoolColors && typeof school.secondary_color === "string"
        ? school.secondary_color
        : storedBranding?.secondaryColor || "";

    if (!primaryColor || !secondaryColor) {
      const derivedPalette = await derivePaletteFromLogo(
        typeof school.logo_url === "string" ? school.logo_url : null,
        typeof school.name === "string" ? school.name : "",
      );
      primaryColor = primaryColor || derivedPalette.primaryColor;
      secondaryColor = secondaryColor || derivedPalette.secondaryColor;
    }
    setBrandingForm({
      name: school.name || "",
      logo_url: school.logo_url || "",
      primary_color: primaryColor || "#4f8cff",
      secondary_color: secondaryColor || "#79d7ff",
      theme_preset:
        compat.schoolThemePreset && typeof school.theme_preset === "string"
          ? school.theme_preset
          : storedBranding?.themePreset || "",
    });
  }, [profile, selectedSchoolId]);

  const saveBrandingFromDashboard = useCallback(async () => {
    if (profile?.role !== "super_admin") return;
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId });
    setBrandingSchoolId(schoolId);
    if (!schoolId) {
      setBrandingNotice("اختر مدرسة أولاً لتخصيص الهوية البصرية.");
      return;
    }

    setBrandingSaving(true);
    setBrandingNotice("");
    if (!brandingForm.name.trim()) {
      setBrandingNotice("اسم المدرسة مطلوب قبل الحفظ.");
      setBrandingSaving(false);
      return;
    }

    const { response, payload } = await fetchJsonWithAuthorizedSession<{
      schemaCompat?: { schoolColors?: boolean; schoolThemePreset?: boolean };
      error?: { message?: string };
    }>("/api/web/dashboard/branding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        school_id: schoolId,
        name: brandingForm.name.trim(),
        logo_url: brandingForm.logo_url.trim() || null,
        primary_color: brandingForm.primary_color || null,
        secondary_color: brandingForm.secondary_color || null,
        theme_preset: brandingForm.theme_preset || null,
      }),
    });

    if (!response.ok) {
      setBrandingNotice(`تعذر حفظ الهوية: ${payload?.error?.message || "خطأ غير متوقع"}`);
      setBrandingSaving(false);
      return;
    }

    const compat = {
      schoolColors: Boolean(payload?.schemaCompat?.schoolColors),
      schoolThemePreset: Boolean(payload?.schemaCompat?.schoolThemePreset),
    };
    setStoredSchoolBranding(schoolId, {
      primaryColor: brandingForm.primary_color || null,
      secondaryColor: brandingForm.secondary_color || null,
      themePreset: brandingForm.theme_preset || null,
      source: "manual",
    });
    requestRuntimeBrandingRefresh();
    setBrandingNotice(
      compat.schoolColors
        ? "تم تحديث الشعار والألوان واسم المدرسة بنجاح."
        : "تم تحديث الشعار واسم المدرسة، وحُفظت الألوان محلياً لأن أعمدة الألوان غير موجودة بعد في Supabase الحالي.",
    );
    setBrandingSaving(false);
  }, [profile, selectedSchoolId, brandingForm]);

  const applyBrandThemePreset = useCallback((presetId: string) => {
    const preset = getBrandThemePreset(presetId);
    if (!preset) return;
    setBrandingForm((prev) => ({
      ...prev,
      theme_preset: preset.id,
      primary_color: preset.primaryColor,
      secondary_color: preset.secondaryColor,
    }));
    setBrandingNotice(`تم تطبيق ثيم ${preset.label}. يمكنك حفظه مباشرة أو تخصيص الألوان بعده.`);
  }, []);

  const deriveDashboardBrandingFromLogo = useCallback(async () => {
    setBrandingDeriving(true);
    setBrandingNotice("");
    try {
      const derivedPalette = await derivePaletteFromLogo(
        brandingForm.logo_url.trim() || null,
        brandingForm.name.trim(),
      );
      setBrandingForm((prev) => ({
        ...prev,
        primary_color: derivedPalette.primaryColor,
        secondary_color: derivedPalette.secondaryColor,
        theme_preset: "",
      }));
      setBrandingNotice(
        brandingForm.logo_url.trim()
          ? "تم استخراج الألوان من الشعار ويمكنك تعديلها قبل الحفظ."
          : "لا يوجد رابط شعار، لذا تم توليد ألوان احترافية اعتماداً على اسم المدرسة.",
      );
    } catch (error) {
      setBrandingNotice(
        `تعذر استخراج الألوان تلقائياً: ${error instanceof Error ? error.message : "خطأ غير متوقع"}`,
      );
    } finally {
      setBrandingDeriving(false);
    }
  }, [brandingForm]);

  useEffect(() => {
    if (!profile || scopeLoading) return;
    void fetchSchoolBranding();
  }, [profile, scopeLoading, fetchSchoolBranding]);

  return useMemo(() => ({
    brandingSchoolId,
    brandingForm,
    setBrandingForm,
    brandingSaving,
    brandingDeriving,
    brandingNotice,
    selectedBrandTheme,
    saveBrandingFromDashboard,
    applyBrandThemePreset,
    deriveDashboardBrandingFromLogo,
  }), [brandingSchoolId, brandingForm, setBrandingForm, brandingSaving, brandingDeriving, brandingNotice, selectedBrandTheme, saveBrandingFromDashboard, applyBrandThemePreset, deriveDashboardBrandingFromLogo]);
}
