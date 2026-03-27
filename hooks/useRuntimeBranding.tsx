"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { useRole } from "@/hooks/useRole";
import { sanitizeImageUrl } from "@/lib/asset-url";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import {
  DEFAULT_PRIMARY,
  DEFAULT_SECONDARY,
  derivePaletteFromLogo,
  getStoredSchoolBranding,
  resolveBrandAppearance,
  sanitizeColor,
  setStoredSchoolBranding,
  shiftColor,
  mixColors,
  toRgba,
} from "@/lib/brand-palette";
import { SCHOOL_BRAND } from "@/lib/branding";
import { detectAppSchemaCompat } from "@/lib/schema-compat";
import { supabase } from "@/lib/supabase";

type RuntimeBrandingState = {
  schoolName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  themePreset: string | null;
  sidebarColor: string | null;
  accentColor: string | null;
  textColor: string | null;
};

type SchoolBrandingRecord = {
  name?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  theme_preset?: string | null;
};

export const RUNTIME_BRANDING_REFRESH_EVENT = "runtime-branding-refresh";

const RuntimeBrandingContext = createContext<RuntimeBrandingState>({
  schoolName: null,
  logoUrl: null,
  primaryColor: null,
  secondaryColor: null,
  themePreset: null,
  sidebarColor: null,
  accentColor: null,
  textColor: null,
});

function applyBrandingToCssVars(branding: RuntimeBrandingState) {
  const root = document.documentElement;
  const appearance = resolveBrandAppearance({
    primaryColor: sanitizeColor(branding.primaryColor) || DEFAULT_PRIMARY,
    secondaryColor: sanitizeColor(branding.secondaryColor) || DEFAULT_SECONDARY,
    themePreset: branding.themePreset,
  });
  const sidebarColor = sanitizeColor(branding.sidebarColor) || appearance.sidebarColor;
  const accentColor = sanitizeColor(branding.accentColor) || appearance.accentColor;
  const textColor = sanitizeColor(branding.textColor) || appearance.textColor;
  const softenedCanvas = appearance.backgroundColor;
  const softenedSidebar = sidebarColor;

  root.style.setProperty("--primary", appearance.primaryColor);
  root.style.setProperty("--primary-strong", appearance.primaryStrong);
  root.style.setProperty("--secondary", appearance.secondaryColor);
  root.style.setProperty("--button-accent", accentColor);
  root.style.setProperty("--button-accent-strong", shiftColor(accentColor, -0.12));
  root.style.setProperty("--brand-text-strong", textColor);
  root.style.setProperty("--focus-ring", toRgba(appearance.primaryColor, 0.24));
  root.style.setProperty("--p2", appearance.primaryDeep);
  root.style.setProperty("--p3", appearance.primaryColor);
  root.style.setProperty("--p4", appearance.secondaryColor);
  root.style.setProperty("--bg", softenedCanvas);
  root.style.setProperty("--sidebar-a", softenedSidebar);
  root.style.setProperty("--sidebar-b", appearance.surfaceMutedColor);
}

export function RuntimeBrandingProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useRole();
  const schoolScope = useSchoolScope(profile);
  const [branding, setBranding] = useState<RuntimeBrandingState>({
    schoolName: null,
    logoUrl: null,
    primaryColor: null,
    secondaryColor: null,
    themePreset: null,
    sidebarColor: null,
    accentColor: null,
    textColor: null,
  });

  const scopedSchoolId = profile?.role === "super_admin" ? schoolScope.selectedSchoolId : profile?.school_id ?? null;

  useEffect(() => {
    let active = true;

    async function loadBranding() {
      if (!scopedSchoolId) {
        if (active) {
          setBranding({
            schoolName: null,
            logoUrl: null,
            primaryColor: null,
            secondaryColor: null,
            themePreset: null,
            sidebarColor: null,
            accentColor: null,
            textColor: null,
          });
        }
        return;
      }

      const compat = await detectAppSchemaCompat();
      const storedBranding = getStoredSchoolBranding(scopedSchoolId);
      const schoolQuery = compat.schoolColors
        ? supabase.from("schools").select(`name, logo_url, primary_color, secondary_color${compat.schoolThemePreset ? ", theme_preset" : ""}`)
        : supabase.from("schools").select(`name, logo_url${compat.schoolThemePreset ? ", theme_preset" : ""}`);
      const { data, error } = await schoolQuery.eq("id", scopedSchoolId).maybeSingle();

      if (!active) return;

      if (error || !data) {
        const derivedFallback = storedBranding
          ? {
              primaryColor: storedBranding.primaryColor,
              secondaryColor: storedBranding.secondaryColor,
              themePreset: storedBranding.themePreset ?? null,
              sidebarColor: storedBranding.sidebarColor ?? null,
              accentColor: storedBranding.accentColor ?? null,
              textColor: storedBranding.textColor ?? null,
            }
          : {
              primaryColor: null,
              secondaryColor: null,
              themePreset: null,
              sidebarColor: null,
              accentColor: null,
              textColor: null,
            };
        setBranding({
          schoolName: null,
          logoUrl: null,
          primaryColor: derivedFallback.primaryColor,
          secondaryColor: derivedFallback.secondaryColor,
          themePreset: derivedFallback.themePreset,
          sidebarColor: derivedFallback.sidebarColor,
          accentColor: derivedFallback.accentColor,
          textColor: derivedFallback.textColor,
        });
        return;
      }

      const schoolRecord = data as SchoolBrandingRecord;
      const safeLogoUrl = sanitizeImageUrl(
        typeof schoolRecord.logo_url === "string" ? schoolRecord.logo_url : null,
      );

      const dbPrimaryColor =
        compat.schoolColors && typeof schoolRecord.primary_color === "string"
          ? schoolRecord.primary_color
          : null;
      const dbSecondaryColor =
        compat.schoolColors && typeof schoolRecord.secondary_color === "string"
          ? schoolRecord.secondary_color
          : null;
      const dbThemePreset =
        compat.schoolThemePreset && typeof schoolRecord.theme_preset === "string"
          ? schoolRecord.theme_preset
          : null;
      let resolvedPrimaryColor = storedBranding?.primaryColor ?? dbPrimaryColor;
      let resolvedSecondaryColor = storedBranding?.secondaryColor ?? dbSecondaryColor;

      if (!resolvedPrimaryColor || !resolvedSecondaryColor) {
        const derivedPalette = await derivePaletteFromLogo(
          safeLogoUrl,
          typeof schoolRecord.name === "string" ? schoolRecord.name : "",
        );
        resolvedPrimaryColor = resolvedPrimaryColor ?? derivedPalette.primaryColor;
        resolvedSecondaryColor = resolvedSecondaryColor ?? derivedPalette.secondaryColor;
        if (!storedBranding) {
          setStoredSchoolBranding(scopedSchoolId, {
            primaryColor: resolvedPrimaryColor,
            secondaryColor: resolvedSecondaryColor,
            themePreset: dbThemePreset ?? null,
            sidebarColor: mixColors(resolvedPrimaryColor, "#ffffff", 0.62),
            accentColor: resolvedPrimaryColor,
            textColor: shiftColor(resolvedPrimaryColor, -0.42),
            source: "derived",
          });
        }
      }

      setBranding({
        schoolName: typeof schoolRecord.name === "string" ? schoolRecord.name : null,
        logoUrl: safeLogoUrl,
        primaryColor: resolvedPrimaryColor,
        secondaryColor: resolvedSecondaryColor,
        themePreset: storedBranding?.themePreset ?? dbThemePreset ?? null,
        sidebarColor: storedBranding?.sidebarColor ?? mixColors(resolvedPrimaryColor, "#ffffff", 0.62),
        accentColor: storedBranding?.accentColor ?? resolvedPrimaryColor,
        textColor: storedBranding?.textColor ?? shiftColor(resolvedPrimaryColor, -0.42),
      });
    }

    void loadBranding();

    const refreshListener = () => {
      void loadBranding();
    };
    window.addEventListener(RUNTIME_BRANDING_REFRESH_EVENT, refreshListener);

    return () => {
      active = false;
      window.removeEventListener(RUNTIME_BRANDING_REFRESH_EVENT, refreshListener);
    };
  }, [scopedSchoolId]);

  useEffect(() => {
    applyBrandingToCssVars(branding);
  }, [branding]);

  const value = useMemo(() => {
    const schoolName = branding.schoolName?.trim() || null;
    return {
      schoolName,
      logoUrl: branding.logoUrl,
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      themePreset: branding.themePreset,
      sidebarColor: branding.sidebarColor,
      accentColor: branding.accentColor,
      textColor: branding.textColor,
    };
  }, [branding]);

  return <RuntimeBrandingContext.Provider value={value}>{children}</RuntimeBrandingContext.Provider>;
}

export function requestRuntimeBrandingRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(RUNTIME_BRANDING_REFRESH_EVENT));
}

export function useRuntimeBranding() {
  const context = useContext(RuntimeBrandingContext);
  return {
    schoolName: context.schoolName || SCHOOL_BRAND.nameAr,
    logoUrl: context.logoUrl,
    primaryColor: context.primaryColor,
    secondaryColor: context.secondaryColor,
    themePreset: context.themePreset,
    sidebarColor: context.sidebarColor,
    accentColor: context.accentColor,
    textColor: context.textColor,
  };
}
