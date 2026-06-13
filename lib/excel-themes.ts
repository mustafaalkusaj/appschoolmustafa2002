// ─── Theme Families ───────────────────────────────────────────────────────────

export type ExcelThemeFamilyId = "dark" | "colorful" | "natural" | "light";

export type ExcelThemeFamily = {
  id: ExcelThemeFamilyId;
  nameAr: string;
  themeIds: ExcelThemeId[];
};

export type ExcelThemeId =
  // Dark family
  | "navy" | "ocean" | "charcoal"
  // Colorful family
  | "teal" | "violet" | "rose"
  // Natural family
  | "forest" | "amber" | "slate"
  // Light family
  | "sky" | "mint" | "coral";

export type ExcelTheme = {
  id: ExcelThemeId;
  nameAr: string;
  family: ExcelThemeFamilyId;
  titleBg: string;
  headerBg: string;
  colHeaderBg: string;
  rowEven: string;
  rowOdd: string;
  totalBg: string;
  headerFg: string;
  colHeaderFg: string;
  argb: {
    titleBg: string; headerBg: string; colHeaderBg: string;
    rowEven: string; rowOdd: string; totalBg: string;
    headerFg: string; colHeaderFg: string;
  };
};

// ─── Style Settings ───────────────────────────────────────────────────────────

export type ExcelFontFamily = "Arial" | "Calibri" | "Tahoma";
export type ExcelRowDensity = "compact" | "normal" | "spacious";
export type ExcelBorderStyle = "thin" | "medium" | "none";
export type ExcelRowStyle = "striped" | "solid";

export type ExcelStyleSettings = {
  fontFamily: ExcelFontFamily;
  rowDensity: ExcelRowDensity;
  borderStyle: ExcelBorderStyle;
  rowStyle: ExcelRowStyle;
};

export const DEFAULT_EXCEL_STYLE: ExcelStyleSettings = {
  fontFamily: "Arial",
  rowDensity: "normal",
  borderStyle: "thin",
  rowStyle: "striped",
};

// ─── Themes ───────────────────────────────────────────────────────────────────

export const EXCEL_THEMES: ExcelTheme[] = [
  {
    id: "navy",
    nameAr: "كلاسيكي",
    family: "dark",
    titleBg: "#1B3A6B", headerBg: "#2D5FA0", colHeaderBg: "#2563EB",
    rowEven: "#F1F5F9", rowOdd: "#FFFFFF", totalBg: "#1B3A6B",
    headerFg: "#FFFFFF", colHeaderFg: "#FFFFFF",
    argb: { titleBg: "FF1B3A6B", headerBg: "FF2D5FA0", colHeaderBg: "FF2563EB",
      rowEven: "FFF1F5F9", rowOdd: "FFFFFFFF", totalBg: "FF1B3A6B",
      headerFg: "FFFFFFFF", colHeaderFg: "FFFFFFFF" },
  },
  {
    id: "ocean",
    nameAr: "محيطي",
    family: "dark",
    titleBg: "#0C2340", headerBg: "#1E3A5F", colHeaderBg: "#1D4ED8",
    rowEven: "#EFF6FF", rowOdd: "#FFFFFF", totalBg: "#0C2340",
    headerFg: "#FFFFFF", colHeaderFg: "#FFFFFF",
    argb: { titleBg: "FF0C2340", headerBg: "FF1E3A5F", colHeaderBg: "FF1D4ED8",
      rowEven: "FFEFF6FF", rowOdd: "FFFFFFFF", totalBg: "FF0C2340",
      headerFg: "FFFFFFFF", colHeaderFg: "FFFFFFFF" },
  },
  {
    id: "charcoal",
    nameAr: "فحمي",
    family: "dark",
    titleBg: "#111827", headerBg: "#1F2937", colHeaderBg: "#374151",
    rowEven: "#F9FAFB", rowOdd: "#FFFFFF", totalBg: "#111827",
    headerFg: "#FFFFFF", colHeaderFg: "#E5E7EB",
    argb: { titleBg: "FF111827", headerBg: "FF1F2937", colHeaderBg: "FF374151",
      rowEven: "FFF9FAFB", rowOdd: "FFFFFFFF", totalBg: "FF111827",
      headerFg: "FFFFFFFF", colHeaderFg: "FFE5E7EB" },
  },
  {
    id: "teal",
    nameAr: "فيروزي",
    family: "colorful",
    titleBg: "#0F4C5C", headerBg: "#0D7490", colHeaderBg: "#06B6D4",
    rowEven: "#F0FDFF", rowOdd: "#FFFFFF", totalBg: "#0F4C5C",
    headerFg: "#FFFFFF", colHeaderFg: "#FFFFFF",
    argb: { titleBg: "FF0F4C5C", headerBg: "FF0D7490", colHeaderBg: "FF06B6D4",
      rowEven: "FFF0FDFF", rowOdd: "FFFFFFFF", totalBg: "FF0F4C5C",
      headerFg: "FFFFFFFF", colHeaderFg: "FFFFFFFF" },
  },
  {
    id: "violet",
    nameAr: "بنفسجي",
    family: "colorful",
    titleBg: "#3B0764", headerBg: "#6B21A8", colHeaderBg: "#9333EA",
    rowEven: "#FAF5FF", rowOdd: "#FFFFFF", totalBg: "#3B0764",
    headerFg: "#FFFFFF", colHeaderFg: "#FFFFFF",
    argb: { titleBg: "FF3B0764", headerBg: "FF6B21A8", colHeaderBg: "FF9333EA",
      rowEven: "FFFAF5FF", rowOdd: "FFFFFFFF", totalBg: "FF3B0764",
      headerFg: "FFFFFFFF", colHeaderFg: "FFFFFFFF" },
  },
  {
    id: "rose",
    nameAr: "وردي",
    family: "colorful",
    titleBg: "#4C0519", headerBg: "#9F1239", colHeaderBg: "#E11D48",
    rowEven: "#FFF1F2", rowOdd: "#FFFFFF", totalBg: "#4C0519",
    headerFg: "#FFFFFF", colHeaderFg: "#FFFFFF",
    argb: { titleBg: "FF4C0519", headerBg: "FF9F1239", colHeaderBg: "FFE11D48",
      rowEven: "FFFFF1F2", rowOdd: "FFFFFFFF", totalBg: "FF4C0519",
      headerFg: "FFFFFFFF", colHeaderFg: "FFFFFFFF" },
  },
  {
    id: "forest",
    nameAr: "أخضر",
    family: "natural",
    titleBg: "#14532D", headerBg: "#166534", colHeaderBg: "#16A34A",
    rowEven: "#F0FDF4", rowOdd: "#FFFFFF", totalBg: "#14532D",
    headerFg: "#FFFFFF", colHeaderFg: "#FFFFFF",
    argb: { titleBg: "FF14532D", headerBg: "FF166534", colHeaderBg: "FF16A34A",
      rowEven: "FFF0FDF4", rowOdd: "FFFFFFFF", totalBg: "FF14532D",
      headerFg: "FFFFFFFF", colHeaderFg: "FFFFFFFF" },
  },
  {
    id: "amber",
    nameAr: "ذهبي",
    family: "natural",
    titleBg: "#78350F", headerBg: "#92400E", colHeaderBg: "#D97706",
    rowEven: "#FFFBEB", rowOdd: "#FFFFFF", totalBg: "#78350F",
    headerFg: "#FFFFFF", colHeaderFg: "#FFFFFF",
    argb: { titleBg: "FF78350F", headerBg: "FF92400E", colHeaderBg: "FFD97706",
      rowEven: "FFFFFBEB", rowOdd: "FFFFFFFF", totalBg: "FF78350F",
      headerFg: "FFFFFFFF", colHeaderFg: "FFFFFFFF" },
  },
  {
    id: "slate",
    nameAr: "رمادي",
    family: "natural",
    titleBg: "#1E293B", headerBg: "#334155", colHeaderBg: "#475569",
    rowEven: "#F8FAFC", rowOdd: "#FFFFFF", totalBg: "#1E293B",
    headerFg: "#FFFFFF", colHeaderFg: "#FFFFFF",
    argb: { titleBg: "FF1E293B", headerBg: "FF334155", colHeaderBg: "FF475569",
      rowEven: "FFF8FAFC", rowOdd: "FFFFFFFF", totalBg: "FF1E293B",
      headerFg: "FFFFFFFF", colHeaderFg: "FFFFFFFF" },
  },
  {
    id: "sky",
    nameAr: "سماوي",
    family: "light",
    titleBg: "#0369A1", headerBg: "#0284C7", colHeaderBg: "#38BDF8",
    rowEven: "#F0F9FF", rowOdd: "#FFFFFF", totalBg: "#0369A1",
    headerFg: "#FFFFFF", colHeaderFg: "#FFFFFF",
    argb: { titleBg: "FF0369A1", headerBg: "FF0284C7", colHeaderBg: "FF38BDF8",
      rowEven: "FFF0F9FF", rowOdd: "FFFFFFFF", totalBg: "FF0369A1",
      headerFg: "FFFFFFFF", colHeaderFg: "FFFFFFFF" },
  },
  {
    id: "mint",
    nameAr: "نعناعي",
    family: "light",
    titleBg: "#065F46", headerBg: "#047857", colHeaderBg: "#34D399",
    rowEven: "#ECFDF5", rowOdd: "#FFFFFF", totalBg: "#065F46",
    headerFg: "#FFFFFF", colHeaderFg: "#FFFFFF",
    argb: { titleBg: "FF065F46", headerBg: "FF047857", colHeaderBg: "FF34D399",
      rowEven: "FFECFDF5", rowOdd: "FFFFFFFF", totalBg: "FF065F46",
      headerFg: "FFFFFFFF", colHeaderFg: "FFFFFFFF" },
  },
  {
    id: "coral",
    nameAr: "مرجاني",
    family: "light",
    titleBg: "#7C2D12", headerBg: "#C2410C", colHeaderBg: "#FB923C",
    rowEven: "#FFF7ED", rowOdd: "#FFFFFF", totalBg: "#7C2D12",
    headerFg: "#FFFFFF", colHeaderFg: "#FFFFFF",
    argb: { titleBg: "FF7C2D12", headerBg: "FFC2410C", colHeaderBg: "FFFB923C",
      rowEven: "FFFFF7ED", rowOdd: "FFFFFFFF", totalBg: "FF7C2D12",
      headerFg: "FFFFFFFF", colHeaderFg: "FFFFFFFF" },
  },
];

export const EXCEL_THEME_FAMILIES: ExcelThemeFamily[] = [
  { id: "dark",     nameAr: "داكن",   themeIds: ["navy", "ocean", "charcoal"] },
  { id: "colorful", nameAr: "لوني",   themeIds: ["teal", "violet", "rose"] },
  { id: "natural",  nameAr: "طبيعي",  themeIds: ["forest", "amber", "slate"] },
  { id: "light",    nameAr: "فاتح",   themeIds: ["sky", "mint", "coral"] },
];

export const DEFAULT_EXCEL_THEME_ID: ExcelThemeId = "navy";

export function getExcelTheme(id: string | null | undefined): ExcelTheme {
  return EXCEL_THEMES.find((t) => t.id === id) ?? EXCEL_THEMES[0];
}

export function getExcelThemesInFamily(familyId: ExcelThemeFamilyId): ExcelTheme[] {
  const family = EXCEL_THEME_FAMILIES.find(f => f.id === familyId);
  if (!family) return [];
  return family.themeIds.map(id => EXCEL_THEMES.find(t => t.id === id)!).filter(Boolean);
}
