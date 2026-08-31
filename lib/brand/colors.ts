import { BRAND_THEME_PRESETS } from "@/lib/brand/themes";

const themePresetId = process.env.NEXT_PUBLIC_BRAND_THEME;
const activePreset = themePresetId
  ? BRAND_THEME_PRESETS.find((p) => p.id === themePresetId) ?? null
  : null;

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function adjustBrightness(hex: string, amount: number): string {
  const r = Math.max(0, Math.min(255, parseInt(hex.slice(1, 3), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.slice(3, 5), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.slice(5, 7), 16) + amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

const p = activePreset;

export const BRAND_COLOR_DEFAULTS = {
  primary: p?.primaryColor ?? "#4f8cff",
  secondary: p?.secondaryColor ?? "#79d7ff",
  accent: p?.accentColor ?? "#4F8CFF",
  accentSoft: p?.secondaryColor ?? "#79D7FF",
} as const;

export const SCHOOL_BRAND_COLORS = {
  accent: BRAND_COLOR_DEFAULTS.accent,
  accentSoft: BRAND_COLOR_DEFAULTS.accentSoft,
} as const;

const lightPrimary = p?.primaryColor ?? "#4f8cff";
const lightSecondary = p?.secondaryColor ?? "#79d7ff";
const darkPrimary = p ? adjustBrightness(p.primaryColor, 80) : "#76a9ff";
const darkSecondary = p ? adjustBrightness(p.secondaryColor, 40) : "#8ae7ff";
const darkPrimaryStrong = p ? adjustBrightness(p.primaryColor, 100) : "#8ab5ff";

export const APP_THEME_COLOR_TOKENS = {
  light: {
    background: p?.backgroundColor ?? "#f5f7fb",
    foreground: p?.textColor ?? "#111827",
    surface: p ? hexToRgba(p.surfaceColor, 0.78) : "rgba(255, 255, 255, 0.78)",
    surfaceStrong: p?.surfaceColor ?? "#ffffff",
    surfaceMuted: p
      ? hexToRgba(p.surfaceMutedColor, 0.58)
      : "rgba(255, 255, 255, 0.58)",
    surfaceSoft: p
      ? hexToRgba(p.surfaceMutedColor, 0.92)
      : "rgba(249, 251, 255, 0.92)",
    primary: lightPrimary,
    primaryStrong: p ? adjustBrightness(p.primaryColor, -15) : "#3e7df7",
    secondary: lightSecondary,
    textPrimary: p?.textColor ?? "#111827",
    textSecondary: "#5b6475",
    textTertiary: "#8b95a7",
    brandTextStrong: p?.textColor ?? "#111827",
    border: "rgba(15, 23, 42, 0.08)",
    borderStrong: "rgba(15, 23, 42, 0.14)",
    success: "#2fb67a",
    warning: "#f2a93b",
    danger: "#f05a5a",
    info: lightPrimary,
    buttonAccent: lightPrimary,
    buttonAccentStrong: p ? adjustBrightness(p.primaryColor, -15) : "#3e7df7",
    focusRing: hexToRgba(lightPrimary, 0.22),
    gridLine: hexToRgba(lightPrimary, 0.08),
  },
  dark: {
    background: "#0b1020",
    foreground: "#f4f7fb",
    surface: "rgba(16, 22, 36, 0.72)",
    surfaceStrong: "rgba(24, 31, 48, 0.92)",
    surfaceMuted: "rgba(24, 31, 48, 0.68)",
    surfaceSoft: "rgba(18, 25, 40, 0.94)",
    primary: darkPrimary,
    primaryStrong: darkPrimaryStrong,
    secondary: darkSecondary,
    textPrimary: "#f4f7fb",
    textSecondary: "#aab3c2",
    textTertiary: "#7f8aa0",
    brandTextStrong: "#f4f7fb",
    border: "rgba(255, 255, 255, 0.08)",
    borderStrong: "rgba(255, 255, 255, 0.15)",
    success: "#35c58a",
    warning: "#ffb84d",
    danger: "#ff7272",
    info: darkPrimary,
    buttonAccent: darkPrimary,
    buttonAccentStrong: p ? adjustBrightness(p.primaryColor, 50) : "#5b95fb",
    focusRing: hexToRgba(darkPrimary, 0.24),
    gridLine: hexToRgba(darkSecondary, 0.07),
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
