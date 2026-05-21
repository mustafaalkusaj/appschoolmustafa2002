"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";

import { useRole } from "@/hooks/useRole";
import { sanitizeImageUrl } from "@/lib/brand/asset-url";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useBranchScope } from "@/hooks/useBranchScope";
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
} from "@/lib/brand/palette";
import { SCHOOL_BRAND } from "@/lib/brand";
import { detectAppSchemaCompat } from "@/lib/schema-compat";
import { supabase } from "@/lib/supabase";

type RuntimeBrandingState = {
  schoolName: string | null;
  logoUrl: string | null;
  branchId: string | null;
  branchName: string | null;
  branchLogoUrl: string | null;
  receiptBgUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  themePreset: string | null;
  sidebarColor: string | null;
  accentColor: string | null;
  textColor: string | null;
  fontFamily: string | null;
  topbarColor: string | null;
  receiptFooterText: string | null;
  cardBgUrl: string | null;
  shortName: string | null;
  currency: string | null;
};

type SchoolBrandingRecord = {
  name?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  theme_preset?: string | null;
  currency?: string | null;
};

type BranchBrandingRecord = {
  name?: string | null;
  logo_url?: string | null;
  receipt_bg_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  sidebar_color?: string | null;
  accent_color?: string | null;
  text_color?: string | null;
  font_family?: string | null;
  topbar_color?: string | null;
  receipt_footer_text?: string | null;
  card_bg_url?: string | null;
  short_name?: string | null;
  currency?: string | null;
};

export const RUNTIME_BRANDING_REFRESH_EVENT = "runtime-branding-refresh";

const RuntimeBrandingContext = createContext<RuntimeBrandingState>({
  schoolName: null,
  logoUrl: null,
  branchId: null,
  branchName: null,
  branchLogoUrl: null,
  receiptBgUrl: null,
  primaryColor: null,
  secondaryColor: null,
  themePreset: null,
  sidebarColor: null,
  accentColor: null,
  textColor: null,
  fontFamily: null,
  topbarColor: null,
  receiptFooterText: null,
  cardBgUrl: null,
  shortName: null,
  currency: null,
});

function createEmptyBrandingState(): RuntimeBrandingState {
  return {
    schoolName: null,
    logoUrl: null,
    branchId: null,
    branchName: null,
    branchLogoUrl: null,
    receiptBgUrl: null,
    primaryColor: null,
    secondaryColor: null,
    themePreset: null,
    sidebarColor: null,
    accentColor: null,
    textColor: null,
    fontFamily: null,
    topbarColor: null,
    receiptFooterText: null,
    cardBgUrl: null,
    shortName: null,
    currency: null,
  };
}

function isGroupOverviewPath(pathname: string | null) {
  if (!pathname) return false;
  const localizedPath = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "");
  return localizedPath === "/group" || localizedPath.startsWith("/group/");
}

function applyBrandingToCssVars(branding: RuntimeBrandingState, isDark: boolean) {
  const root = document.documentElement;
  const appearance = resolveBrandAppearance({
    primaryColor: sanitizeColor(branding.primaryColor) || DEFAULT_PRIMARY,
    secondaryColor: sanitizeColor(branding.secondaryColor) || DEFAULT_SECONDARY,
    themePreset: branding.themePreset,
    isDark,
  });
  const sidebarColor = sanitizeColor(branding.sidebarColor) || appearance.sidebarColor;
  const accentColor = sanitizeColor(branding.accentColor) || appearance.accentColor;
  const textColor = sanitizeColor(branding.textColor) || appearance.textColor;
  const softenedCanvas = appearance.backgroundColor;
  const softenedSidebar = isDark ? mixColors(sidebarColor, "#080e1a", 0.9) : sidebarColor;
  const topbarChrome = isDark
    ? mixColors(softenedSidebar, appearance.surfaceColor, 0.14)
    : softenedSidebar;

  root.style.setProperty("--primary", appearance.primaryColor);
  root.style.setProperty("--primary-strong", appearance.primaryStrong);
  root.style.setProperty("--secondary", appearance.secondaryColor);
  root.style.setProperty("--button-accent", accentColor);
  root.style.setProperty("--button-accent-strong", shiftColor(accentColor, isDark ? 0.12 : -0.12));
  root.style.setProperty("--brand-text-strong", textColor);
  root.style.setProperty("--focus-ring", toRgba(appearance.primaryColor, 0.24));
  root.style.setProperty("--p2", appearance.primaryDeep);
  root.style.setProperty("--p3", appearance.primaryColor);
  root.style.setProperty("--p4", appearance.secondaryColor);
  root.style.setProperty("--bg", softenedCanvas);
  root.style.setProperty("--sidebar-a", softenedSidebar);
  root.style.setProperty("--sidebar-b", appearance.surfaceMutedColor);

  root.style.setProperty("--sidebar-bg", softenedSidebar);
  if (isDark) {
    root.style.setProperty("--topbar-bg", toRgba(topbarChrome, 0.92));
  } else {
    root.style.removeProperty("--topbar-bg");
  }

  // Apply font family
  const existingFontStyle = document.getElementById("branch-font-style");
  const fontFamily = branding.fontFamily;
  if (fontFamily && fontFamily !== "noto") {
    const fontName = fontFamily === "cairo" ? "Cairo" : fontFamily === "tajawal" ? "Tajawal" : fontFamily === "amiri" ? "Amiri" : null;
    if (fontName) {
      if (!existingFontStyle || existingFontStyle.getAttribute("data-font") !== fontFamily) {
        const style = existingFontStyle ?? document.createElement("style");
        style.id = "branch-font-style";
        style.setAttribute("data-font", fontFamily);
        style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=${fontName}:wght@400;600;700;800;900&display=swap');
        body, * { font-family: '${fontName}', 'Noto Sans Arabic', sans-serif !important; }
      `;
        if (!existingFontStyle) document.head.appendChild(style);
      }
    }
  } else if (existingFontStyle) {
    existingFontStyle.remove();
  }
}

function isAuthPage(pathname: string | null): boolean {
  if (!pathname) return false;
  // Remove locale prefix (e.g., "/ar" or "/en")
  const normalized = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/";
  return (
    normalized === "/login" ||
    normalized === "/forgot-password" ||
    normalized === "/register"
  );
}

export function RuntimeBrandingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile } = useRole();
  const { resolvedTheme } = useTheme();
  const schoolScope = useSchoolScope(profile);
  const branchScope = useBranchScope(profile);
  const [branding, setBranding] = useState<RuntimeBrandingState>(createEmptyBrandingState);
  // Holds a currency value set by the user immediately after save, so loadBranding
  // re-fetch doesn't overwrite it before Supabase write has propagated.
  const currencyOverrideRef = useRef<string | null | undefined>(undefined);

  const scopedSchoolId =
    profile?.role === "super_admin" ? schoolScope.selectedSchoolId : profile?.school_id ?? null;
  const isGroupOverview = isGroupOverviewPath(pathname);
  const isOnAuthPage = isAuthPage(pathname);
  const scopedBranchId =
    profile?.role === "super_admin" || isGroupOverview
      ? null
      : branchScope.isMultiBranchScope
        ? branchScope.selectedBranchId
        : profile?.branch_id ?? null;

  useEffect(() => {
    let active = true;

    async function loadBranding() {
      try {
        // Skip branding load on auth pages (login, forgot-password, register)
        // These pages don't need custom branding and load faster without it
        if (isOnAuthPage) {
          if (active) {
            setBranding(createEmptyBrandingState());
          }
          return;
        }

        if (!scopedSchoolId) {
          if (active) {
            setBranding(createEmptyBrandingState());
          }
          return;
        }

        let compat;
        try {
          compat = await detectAppSchemaCompat();
        } catch (err) {
          console.warn("[RuntimeBranding] detectAppSchemaCompat failed, using defaults:", err);
          if (active) {
            setBranding(createEmptyBrandingState());
          }
          return;
        }
      const storedBranding = getStoredSchoolBranding(scopedSchoolId);
      const branchColumns = ["name"];

      if (compat.branchColors) {
        branchColumns.push("primary_color", "secondary_color");
      }

      if (compat.branchUiColors) {
        branchColumns.push("sidebar_color", "accent_color", "text_color");
      }

      if (compat.branchLogo) {
        branchColumns.push("logo_url");
      }

      if (compat.branchReceiptBg) {
        branchColumns.push("receipt_bg_url");
      }

      branchColumns.push("font_family", "topbar_color", "receipt_footer_text", "card_bg_url", "short_name", "currency");

      const schoolQuery = compat.schoolColors
        ? supabase
            .from("schools")
            .select(
              `name, logo_url, primary_color, secondary_color, currency${
                compat.schoolThemePreset ? ", theme_preset" : ""
              }`,
            )
        : supabase
            .from("schools")
            .select(`name, logo_url, currency${compat.schoolThemePreset ? ", theme_preset" : ""}`);
      const branchQuery =
        scopedBranchId
          ? supabase.from("branches").select(branchColumns.join(", ")).eq("id", scopedBranchId).maybeSingle()
          : Promise.resolve({ data: null, error: null });
      const [{ data, error }, branchResult] = await Promise.all([
        schoolQuery.eq("id", scopedSchoolId).maybeSingle(),
        branchQuery,
      ]);

      if (!active) return;

      const branchRecord =
        branchResult.data && typeof branchResult.data === "object"
          ? (branchResult.data as BranchBrandingRecord)
          : null;
      const resolvedBranchName =
        typeof branchRecord?.name === "string" && branchRecord.name.trim().length > 0
          ? branchRecord.name.trim()
          : null;
      const resolvedBranchLogoUrl = sanitizeImageUrl(
        compat.branchLogo && typeof branchRecord?.logo_url === "string" ? branchRecord.logo_url : null,
      );
      const resolvedReceiptBgUrl = sanitizeImageUrl(
        compat.branchReceiptBg && typeof branchRecord?.receipt_bg_url === "string" ? branchRecord.receipt_bg_url : null,
      );
      const branchPrimaryColor =
        compat.branchColors && typeof branchRecord?.primary_color === "string"
          ? branchRecord.primary_color
          : null;
      const branchSecondaryColor =
        compat.branchColors && typeof branchRecord?.secondary_color === "string"
          ? branchRecord.secondary_color
          : null;
      const branchSidebarColor =
        compat.branchUiColors && typeof branchRecord?.sidebar_color === "string"
          ? branchRecord.sidebar_color
          : null;
      const branchAccentColor =
        compat.branchUiColors && typeof branchRecord?.accent_color === "string"
          ? branchRecord.accent_color
          : null;
      const branchTextColor =
        compat.branchUiColors && typeof branchRecord?.text_color === "string"
          ? branchRecord.text_color
          : null;
      const branchFontFamily =
        typeof branchRecord?.font_family === "string" ? branchRecord.font_family : null;
      const branchTopbarColor =
        typeof branchRecord?.topbar_color === "string" ? branchRecord.topbar_color : null;
      const branchReceiptFooterText =
        typeof branchRecord?.receipt_footer_text === "string" ? branchRecord.receipt_footer_text : null;
      const branchCardBgUrl =
        typeof branchRecord?.card_bg_url === "string" ? branchRecord.card_bg_url : null;
      const branchShortName =
        typeof branchRecord?.short_name === "string" ? branchRecord.short_name : null;
      const branchCurrency =
        typeof branchRecord?.currency === "string" && branchRecord.currency.trim()
          ? branchRecord.currency.trim()
          : null;
      const hasBranchOverride = Boolean(
        branchPrimaryColor ||
          branchSecondaryColor ||
          branchSidebarColor ||
          branchAccentColor ||
          branchTextColor,
      );

      if (error || !data) {
        let resolvedPrimaryColor = branchPrimaryColor ?? storedBranding?.primaryColor ?? null;
        let resolvedSecondaryColor = branchSecondaryColor ?? storedBranding?.secondaryColor ?? null;

        if (resolvedPrimaryColor && !resolvedSecondaryColor) {
          resolvedSecondaryColor = mixColors(resolvedPrimaryColor, "#ffffff", 0.38);
        }

        if (!resolvedPrimaryColor && resolvedSecondaryColor) {
          resolvedPrimaryColor = shiftColor(resolvedSecondaryColor, -0.2);
        }

        const fallbackSidebarColor =
          branchSidebarColor ??
          (hasBranchOverride ? null : storedBranding?.sidebarColor) ??
          (resolvedPrimaryColor ? mixColors(resolvedPrimaryColor, "#ffffff", 0.62) : null);
        const fallbackAccentColor =
          branchAccentColor ??
          (hasBranchOverride ? null : storedBranding?.accentColor) ??
          resolvedPrimaryColor;
        const fallbackTextColor =
          branchTextColor ??
          (hasBranchOverride ? null : storedBranding?.textColor) ??
          (resolvedPrimaryColor ? shiftColor(resolvedPrimaryColor, -0.42) : null);

        setBranding({
          schoolName: null,
          logoUrl: null,
          branchId: scopedBranchId,
          branchName: resolvedBranchName,
          branchLogoUrl: resolvedBranchLogoUrl,
          receiptBgUrl: resolvedReceiptBgUrl,
          primaryColor: resolvedPrimaryColor,
          secondaryColor: resolvedSecondaryColor,
          themePreset: hasBranchOverride ? null : storedBranding?.themePreset ?? null,
          sidebarColor: fallbackSidebarColor,
          accentColor: fallbackAccentColor,
          textColor: fallbackTextColor,
          fontFamily: branchFontFamily,
          topbarColor: branchTopbarColor,
          receiptFooterText: branchReceiptFooterText,
          cardBgUrl: branchCardBgUrl,
          shortName: branchShortName,
          currency: currencyOverrideRef.current !== undefined ? currencyOverrideRef.current : branchCurrency,
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

      // Manual save wins over branch DB colors (avoids stale Supabase replica revert)
      if (storedBranding?.source !== "manual") {
        resolvedPrimaryColor = branchPrimaryColor ?? resolvedPrimaryColor;
        resolvedSecondaryColor = branchSecondaryColor ?? resolvedSecondaryColor;
      }

      if (resolvedPrimaryColor && !resolvedSecondaryColor) {
        resolvedSecondaryColor = mixColors(resolvedPrimaryColor, "#ffffff", 0.38);
      }

      if (!resolvedPrimaryColor && resolvedSecondaryColor) {
        resolvedPrimaryColor = shiftColor(resolvedSecondaryColor, -0.2);
      }

      const resolvedThemePreset = hasBranchOverride
        ? null
        : storedBranding?.themePreset ?? dbThemePreset ?? null;
      const runtimePrimaryColor = resolvedPrimaryColor || DEFAULT_PRIMARY;
      const resolvedSidebarColor =
        branchSidebarColor ??
        (hasBranchOverride ? null : storedBranding?.sidebarColor) ??
        mixColors(runtimePrimaryColor, "#ffffff", 0.62);
      const resolvedAccentColor =
        branchAccentColor ??
        (hasBranchOverride ? null : storedBranding?.accentColor) ??
        runtimePrimaryColor;
      const resolvedTextColor =
        branchTextColor ??
        (hasBranchOverride ? null : storedBranding?.textColor) ??
        shiftColor(runtimePrimaryColor, -0.42);

      const schoolCurrency =
        typeof (schoolRecord as SchoolBrandingRecord).currency === "string"
          ? ((schoolRecord as SchoolBrandingRecord).currency as string)
          : null;
      // Prefer override set by the user immediately after save (guards against
      // Supabase replication lag overwriting the just-saved value). Once Supabase
      // returns a real value (branchCurrency or schoolCurrency), clear the override.
      const resolvedCurrency = (() => {
        if (currencyOverrideRef.current !== undefined) return currencyOverrideRef.current;
        return branchCurrency ?? schoolCurrency;
      })();
      // Clear override once we have a confirmed DB value
      if (branchCurrency || schoolCurrency) {
        currencyOverrideRef.current = undefined;
      }
      setBranding({
        schoolName: typeof schoolRecord.name === "string" ? schoolRecord.name : null,
        logoUrl: safeLogoUrl,
        branchId: scopedBranchId,
        branchName: resolvedBranchName,
        branchLogoUrl: resolvedBranchLogoUrl,
        receiptBgUrl: resolvedReceiptBgUrl,
        primaryColor: resolvedPrimaryColor,
        secondaryColor: resolvedSecondaryColor,
        themePreset: resolvedThemePreset,
        sidebarColor: resolvedSidebarColor,
        accentColor: resolvedAccentColor,
        textColor: resolvedTextColor,
        fontFamily: branchFontFamily,
        topbarColor: branchTopbarColor,
        receiptFooterText: branchReceiptFooterText,
        cardBgUrl: branchCardBgUrl,
        shortName: branchShortName,
        currency: resolvedCurrency,
      });
      } catch (err) {
        if (active) {
          console.error("[RuntimeBranding] loadBranding error:", err);
          setBranding(createEmptyBrandingState());
        }
      }
    }

    void loadBranding();

    const refreshListener = (e: Event) => {
      const detail = (e as CustomEvent).detail as { currency?: string | null } | undefined;
      if (detail && "currency" in detail) {
        currencyOverrideRef.current = detail.currency ?? null;
        setBranding((prev) => ({ ...prev, currency: detail.currency ?? null }));
      }
      void loadBranding();
    };
    window.addEventListener(RUNTIME_BRANDING_REFRESH_EVENT, refreshListener);

    return () => {
      active = false;
      window.removeEventListener(RUNTIME_BRANDING_REFRESH_EVENT, refreshListener);
    };
  }, [scopedBranchId, scopedSchoolId, branchScope.isMultiBranchScope, branchScope.selectedBranchId, isGroupOverview, isOnAuthPage]);

  useEffect(() => {
    applyBrandingToCssVars(branding, resolvedTheme === "dark");
  }, [branding, resolvedTheme]);

  const value = useMemo(() => {
    const schoolName = branding.schoolName?.trim() || null;
    const branchName = branding.branchName?.trim() || null;
    return {
      schoolName,
      logoUrl: branding.logoUrl,
      branchId: branding.branchId,
      branchName,
      branchLogoUrl: branding.branchLogoUrl,
      receiptBgUrl: branding.receiptBgUrl,
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      themePreset: branding.themePreset,
      sidebarColor: branding.sidebarColor,
      accentColor: branding.accentColor,
      textColor: branding.textColor,
      fontFamily: branding.fontFamily,
      topbarColor: branding.topbarColor,
      receiptFooterText: branding.receiptFooterText,
      cardBgUrl: branding.cardBgUrl,
      shortName: branding.shortName,
      currency: branding.currency,
    };
  }, [branding]);

  return <RuntimeBrandingContext.Provider value={value}>{children}</RuntimeBrandingContext.Provider>;
}

export function requestRuntimeBrandingRefresh(overrides?: { currency?: string | null }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(RUNTIME_BRANDING_REFRESH_EVENT, { detail: overrides ?? {} }));
}

export function applyBrandColorsDirectly(
  primaryColor: string | null,
  secondaryColor: string | null,
  themePreset: string | null,
  isDark: boolean,
) {
  if (typeof window === "undefined") return;
  applyBrandingToCssVars(
    {
      ...createEmptyBrandingState(),
      primaryColor,
      secondaryColor,
      themePreset,
    },
    isDark,
  );
}

export function useRuntimeBranding() {
  const context = useContext(RuntimeBrandingContext);
  if (!context) {
    return {
      schoolName: SCHOOL_BRAND.nameAr,
      logoUrl: null,
      branchId: null,
      branchName: null,
      branchLogoUrl: null,
      receiptBgUrl: null,
      primaryColor: null,
      secondaryColor: null,
      themePreset: null,
      sidebarColor: null,
      accentColor: null,
      textColor: null,
      fontFamily: null,
      topbarColor: null,
      receiptFooterText: null,
      cardBgUrl: null,
      shortName: null,
      currency: null,
    };
  }
  return {
    schoolName: context.schoolName || SCHOOL_BRAND.nameAr,
    logoUrl: context.logoUrl,
    branchId: context.branchId,
    branchName: context.branchName,
    branchLogoUrl: context.branchLogoUrl,
    receiptBgUrl: context.receiptBgUrl,
    primaryColor: context.primaryColor,
    secondaryColor: context.secondaryColor,
    themePreset: context.themePreset,
    sidebarColor: context.sidebarColor,
    accentColor: context.accentColor,
    textColor: context.textColor,
    fontFamily: context.fontFamily,
    topbarColor: context.topbarColor,
    receiptFooterText: context.receiptFooterText,
    cardBgUrl: context.cardBgUrl,
    shortName: context.shortName,
    currency: context.currency,
  };
}
