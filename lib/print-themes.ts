export type PrintThemeFamilyId = "classic" | "modern" | "minimal";
export type PrintPaperSize = "a4" | "letter";
export type PrintLogoPosition = "left" | "center" | "right";

export interface PrintWatermark {
  text: string;
  opacity: number;
}

export interface PrintStyle {
  id: string;
  name: string;
  family: PrintThemeFamilyId;
}

export interface PrintStyleSettings {
  paperSize: PrintPaperSize;
  logoPosition: PrintLogoPosition;
  watermark: PrintWatermark | null;
  headerBg: string;
  headerColor: string;
}

export const DEFAULT_PRINT_STYLE: PrintStyleSettings = {
  paperSize: "a4",
  logoPosition: "center",
  watermark: null,
  headerBg: "#1e40af",
  headerColor: "#ffffff",
};

export const PRINT_THEME_FAMILIES: Array<{ id: PrintThemeFamilyId; name: string }> = [];

export function getPrintTheme(_id: string): PrintStyleSettings {
  return DEFAULT_PRINT_STYLE;
}

export function getPrintThemesInFamily(_familyId: PrintThemeFamilyId): PrintStyle[] {
  return [];
}
