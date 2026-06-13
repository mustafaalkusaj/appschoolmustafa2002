export type PrintThemeFamilyId = "classic" | "modern" | "warm" | "minimal";

export type PrintThemeFamily = {
  id: PrintThemeFamilyId;
  nameAr: string;
  themeIds: PrintThemeId[];
};

export type PrintThemeId =
  | "navy_c" | "emerald_c" | "burgundy_c"       // classic
  | "indigo_m" | "teal_m" | "violet_m"           // modern
  | "amber_w" | "coral_w" | "rose_w"             // warm
  | "slate_mn" | "forest_mn" | "sky_mn";         // minimal

export type PrintTheme = {
  id: PrintThemeId;
  nameAr: string;
  family: PrintThemeFamilyId;
  primaryColor: string;
  accentColor: string;
  ribbonColor: string;
  borderColor: string;
  receiptBg: string;
  bodyBg: string;
};

export type PrintStyle = "classic" | "minimal";
export type PrintPaperSize = "A5" | "A4";
export type PrintFontFamily = "Noto" | "system";
export type PrintWatermark = "show" | "hide";
export type PrintLogoPosition = "center" | "right" | "left" | "none";

export type PrintStyleSettings = {
  style: PrintStyle;
  paperSize: PrintPaperSize;
  fontFamily: PrintFontFamily;
  watermark: PrintWatermark;
  showOrnaments: boolean;
  showRibbon: boolean;
  logoPosition: PrintLogoPosition;
  headerSubtitle: string;
  footerLine1: string;
  footerLine2: string;
};

export const DEFAULT_PRINT_STYLE: PrintStyleSettings = {
  style: "classic",
  paperSize: "A5",
  fontFamily: "Noto",
  watermark: "show",
  showOrnaments: true,
  showRibbon: true,
  logoPosition: "center",
  headerSubtitle: "المدرسة النموذجية",
  footerLine1: "",
  footerLine2: "",
};

export const PRINT_THEMES: PrintTheme[] = [
  // Classic family
  { id: "navy_c",     nameAr: "نيلي",      family: "classic", primaryColor: "#1B3A6B", accentColor: "#2D5FA0", ribbonColor: "#1B3A6B", borderColor: "#1B3A6B30", receiptBg: "#F5F6FC", bodyBg: "#E8EAF4" },
  { id: "emerald_c",  nameAr: "زمردي",     family: "classic", primaryColor: "#064E3B", accentColor: "#065F46", ribbonColor: "#064E3B", borderColor: "#064E3B30", receiptBg: "#F0FDF8", bodyBg: "#ECFDF5" },
  { id: "burgundy_c", nameAr: "خمري",      family: "classic", primaryColor: "#4C0519", accentColor: "#881337", ribbonColor: "#4C0519", borderColor: "#4C051930", receiptBg: "#FFF0F3", bodyBg: "#FFE4E8" },
  // Modern family
  { id: "indigo_m",   nameAr: "نيلي حديث", family: "modern",  primaryColor: "#312E81", accentColor: "#4338CA", ribbonColor: "#312E81", borderColor: "#312E8130", receiptBg: "#F5F3FF", bodyBg: "#EDE9FE" },
  { id: "teal_m",     nameAr: "فيروزي",    family: "modern",  primaryColor: "#0F4C5C", accentColor: "#0D7490", ribbonColor: "#0F4C5C", borderColor: "#0F4C5C30", receiptBg: "#F0FDFF", bodyBg: "#CFFAFE" },
  { id: "violet_m",   nameAr: "بنفسجي",    family: "modern",  primaryColor: "#3B0764", accentColor: "#6B21A8", ribbonColor: "#3B0764", borderColor: "#3B076430", receiptBg: "#FAF5FF", bodyBg: "#F3E8FF" },
  // Warm family
  { id: "amber_w",    nameAr: "ذهبي",      family: "warm",    primaryColor: "#78350F", accentColor: "#92400E", ribbonColor: "#78350F", borderColor: "#78350F30", receiptBg: "#FFFBEB", bodyBg: "#FEF3C7" },
  { id: "coral_w",    nameAr: "مرجاني",    family: "warm",    primaryColor: "#7C2D12", accentColor: "#C2410C", ribbonColor: "#7C2D12", borderColor: "#7C2D1230", receiptBg: "#FFF7ED", bodyBg: "#FFEDD5" },
  { id: "rose_w",     nameAr: "وردي",      family: "warm",    primaryColor: "#9F1239", accentColor: "#BE123C", ribbonColor: "#9F1239", borderColor: "#9F123930", receiptBg: "#FFF1F2", bodyBg: "#FFE4E6" },
  // Minimal family
  { id: "slate_mn",   nameAr: "رمادي",     family: "minimal", primaryColor: "#1E293B", accentColor: "#334155", ribbonColor: "#1E293B", borderColor: "#1E293B30", receiptBg: "#F8FAFC", bodyBg: "#F1F5F9" },
  { id: "forest_mn",  nameAr: "غابات",     family: "minimal", primaryColor: "#14532D", accentColor: "#166534", ribbonColor: "#14532D", borderColor: "#14532D30", receiptBg: "#F0FDF4", bodyBg: "#DCFCE7" },
  { id: "sky_mn",     nameAr: "سماوي",     family: "minimal", primaryColor: "#0369A1", accentColor: "#0284C7", ribbonColor: "#0369A1", borderColor: "#0369A130", receiptBg: "#F0F9FF", bodyBg: "#E0F2FE" },
];

export const PRINT_THEME_FAMILIES: PrintThemeFamily[] = [
  { id: "classic", nameAr: "كلاسيكي", themeIds: ["navy_c",   "emerald_c",  "burgundy_c"] },
  { id: "modern",  nameAr: "حديث",    themeIds: ["indigo_m", "teal_m",     "violet_m"]   },
  { id: "warm",    nameAr: "دافئ",    themeIds: ["amber_w",  "coral_w",    "rose_w"]     },
  { id: "minimal", nameAr: "بسيط",    themeIds: ["slate_mn", "forest_mn",  "sky_mn"]     },
];

export const DEFAULT_PRINT_THEME_ID: PrintThemeId = "navy_c";

export function getPrintTheme(id: string | null | undefined): PrintTheme {
  return PRINT_THEMES.find(t => t.id === id) ?? PRINT_THEMES[0];
}

export function getPrintThemesInFamily(familyId: PrintThemeFamilyId): PrintTheme[] {
  const family = PRINT_THEME_FAMILIES.find(f => f.id === familyId);
  if (!family) return [];
  return family.themeIds.map(id => PRINT_THEMES.find(t => t.id === id)!).filter(Boolean);
}
