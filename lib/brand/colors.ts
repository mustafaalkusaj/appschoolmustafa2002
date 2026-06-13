import { BRAND_THEME_PRESETS } from "@/lib/brand/themes";

export const BRAND_COLOR_DEFAULTS = {
  primary: "#4f8cff",
  secondary: "#79d7ff",
  accent: "#4F8CFF",
  accentSoft: "#79D7FF",
} as const;

export const SCHOOL_BRAND_COLORS = {
  accent: BRAND_COLOR_DEFAULTS.accent,
  accentSoft: BRAND_COLOR_DEFAULTS.accentSoft,
} as const;

export const APP_THEME_COLOR_TOKENS = {
  light: {
    background: "#f5f7fb",
    foreground: "#111827",
    surface: "rgba(255, 255, 255, 0.78)",
    surfaceStrong: "#ffffff",
    surfaceMuted: "rgba(255, 255, 255, 0.58)",
    surfaceSoft: "rgba(249, 251, 255, 0.92)",
    primary: "#4f8cff",
    primaryStrong: "#3e7df7",
    secondary: "#79d7ff",
    textPrimary: "#111827",
    textSecondary: "#5b6475",
    textTertiary: "#8b95a7",
    brandTextStrong: "#111827",
    border: "rgba(15, 23, 42, 0.08)",
    borderStrong: "rgba(15, 23, 42, 0.14)",
    success: "#2fb67a",
    warning: "#f2a93b",
    danger: "#f05a5a",
    info: "#4f8cff",
    buttonAccent: "#4f8cff",
    buttonAccentStrong: "#3e7df7",
    focusRing: "rgba(79, 140, 255, 0.22)",
    gridLine: "rgba(79, 140, 255, 0.08)",
  },
  dark: {
    background: "#0b1020",
    foreground: "#f4f7fb",
    surface: "rgba(16, 22, 36, 0.72)",
    surfaceStrong: "rgba(24, 31, 48, 0.92)",
    surfaceMuted: "rgba(24, 31, 48, 0.68)",
    surfaceSoft: "rgba(18, 25, 40, 0.94)",
    primary: "#76a9ff",
    primaryStrong: "#8ab5ff",
    secondary: "#8ae7ff",
    textPrimary: "#f4f7fb",
    textSecondary: "#aab3c2",
    textTertiary: "#7f8aa0",
    brandTextStrong: "#f4f7fb",
    border: "rgba(255, 255, 255, 0.08)",
    borderStrong: "rgba(255, 255, 255, 0.15)",
    success: "#35c58a",
    warning: "#ffb84d",
    danger: "#ff7272",
    info: "#76a9ff",
    buttonAccent: "#76a9ff",
    buttonAccentStrong: "#5b95fb",
    focusRing: "rgba(118, 169, 255, 0.24)",
    gridLine: "rgba(138, 231, 255, 0.07)",
  },
} as const;

export const BRAND_THEME_COLOR_LIBRARY = BRAND_THEME_PRESETS.map((preset) => ({
  id: preset.id,
  familyId: preset.familyId,
  label: preset.label,
  colors: {
    primaryColor: preset.primaryColor,
    secondaryColor: preset.secondaryColor,
    accentColor: preset.accentColor,
    backgroundColor: preset.backgroundColor,
    surfaceColor: preset.surfaceColor,
    surfaceMutedColor: preset.surfaceMutedColor,
    sidebarColor: preset.sidebarColor,
    textColor: preset.textColor,
  },
}));

export const BRAND_THEME_SWATCHES = Array.from(
  new Set(
    BRAND_THEME_COLOR_LIBRARY.flatMap((preset) => [
      preset.colors.primaryColor,
      preset.colors.secondaryColor,
      preset.colors.accentColor,
      preset.colors.backgroundColor,
      preset.colors.surfaceColor,
      preset.colors.surfaceMutedColor,
      preset.colors.sidebarColor,
      preset.colors.textColor,
    ]),
  ),
);

export const PROJECT_COLOR_LIBRARY = {
  defaults: BRAND_COLOR_DEFAULTS,
  schoolBrand: SCHOOL_BRAND_COLORS,
  appTheme: APP_THEME_COLOR_TOKENS,
  themePresets: BRAND_THEME_COLOR_LIBRARY,
  uniqueThemeSwatches: BRAND_THEME_SWATCHES,
} as const;
