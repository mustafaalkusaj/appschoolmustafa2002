"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { useRole } from "@/hooks/useRole";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import {
  DEFAULT_PRIMARY,
  DEFAULT_SECONDARY,
  derivePaletteFromLogo,
  getStoredSchoolBranding,
  resolveBrandPalette,
  sanitizeColor,
  setStoredSchoolBranding,
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
};

export const RUNTIME_BRANDING_REFRESH_EVENT = "runtime-branding-refresh";

const RuntimeBrandingContext = createContext<RuntimeBrandingState>({
  schoolName: null,
  logoUrl: null,
  primaryColor: null,
  secondaryColor: null,
});

function applyBrandingToCssVars(branding: RuntimeBrandingState) {
  const root = document.documentElement;
  const palette = resolveBrandPalette({
    primaryColor: sanitizeColor(branding.primaryColor) || DEFAULT_PRIMARY,
    secondaryColor: sanitizeColor(branding.secondaryColor) || DEFAULT_SECONDARY,
  });

  root.style.setProperty("--primary", palette.primaryColor);
  root.style.setProperty("--primary-strong", palette.primaryStrong);
  root.style.setProperty("--secondary", palette.secondaryColor);
  root.style.setProperty("--focus-ring", toRgba(palette.primaryColor, 0.24));
  root.style.setProperty("--p2", palette.primaryDeep);
  root.style.setProperty("--p3", palette.primaryColor);
  root.style.setProperty("--p4", palette.secondaryColor);
  root.style.setProperty("--bg", palette.accentSoft);
}

export function RuntimeBrandingProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useRole();
  const schoolScope = useSchoolScope(profile);
  const [branding, setBranding] = useState<RuntimeBrandingState>({
    schoolName: null,
    logoUrl: null,
    primaryColor: null,
    secondaryColor: null,
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
          });
        }
        return;
      }

      const compat = await detectAppSchemaCompat();
      const storedBranding = getStoredSchoolBranding(scopedSchoolId);
      const schoolQuery = compat.schoolColors
        ? supabase.from("schools").select("name, logo_url, primary_color, secondary_color")
        : supabase.from("schools").select("name, logo_url");
      const { data, error } = await schoolQuery.eq("id", scopedSchoolId).maybeSingle();

      if (!active) return;

      if (error || !data) {
        const derivedFallback = storedBranding
          ? {
              primaryColor: storedBranding.primaryColor,
              secondaryColor: storedBranding.secondaryColor,
            }
          : { primaryColor: null, secondaryColor: null };
        setBranding({
          schoolName: null,
          logoUrl: null,
          primaryColor: derivedFallback.primaryColor,
          secondaryColor: derivedFallback.secondaryColor,
        });
        return;
      }

      const dbPrimaryColor =
        compat.schoolColors && "primary_color" in data && typeof data.primary_color === "string"
          ? data.primary_color
          : null;
      const dbSecondaryColor =
        compat.schoolColors && "secondary_color" in data && typeof data.secondary_color === "string"
          ? data.secondary_color
          : null;
      let resolvedPrimaryColor = storedBranding?.primaryColor ?? dbPrimaryColor;
      let resolvedSecondaryColor = storedBranding?.secondaryColor ?? dbSecondaryColor;

      if (!resolvedPrimaryColor || !resolvedSecondaryColor) {
        const derivedPalette = await derivePaletteFromLogo(
          typeof data.logo_url === "string" ? data.logo_url : null,
          typeof data.name === "string" ? data.name : "",
        );
        resolvedPrimaryColor = resolvedPrimaryColor ?? derivedPalette.primaryColor;
        resolvedSecondaryColor = resolvedSecondaryColor ?? derivedPalette.secondaryColor;
        if (!storedBranding) {
          setStoredSchoolBranding(scopedSchoolId, {
            primaryColor: resolvedPrimaryColor,
            secondaryColor: resolvedSecondaryColor,
            source: "derived",
          });
        }
      }

      setBranding({
        schoolName: typeof data.name === "string" ? data.name : null,
        logoUrl: typeof data.logo_url === "string" ? data.logo_url : null,
        primaryColor: resolvedPrimaryColor,
        secondaryColor: resolvedSecondaryColor,
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
  };
}
