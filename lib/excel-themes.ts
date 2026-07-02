export type ExcelFontFamily = "cairo" | "arial" | "times";
export type ExcelRowDensity = "compact" | "normal" | "relaxed";
export type ExcelBorderStyle = "thin" | "medium" | "thick" | "none";
export type ExcelRowStyle = "plain" | "striped" | "bordered";

export interface ExcelStyleSettings {
  fontFamily: ExcelFontFamily;
  rowDensity: ExcelRowDensity;
  borderStyle: ExcelBorderStyle;
  rowStyle: ExcelRowStyle;
  headerBg: string;
  headerColor: string;
}

export const DEFAULT_EXCEL_STYLE: ExcelStyleSettings = {
  fontFamily: "cairo",
  rowDensity: "normal",
  borderStyle: "thin",
  rowStyle: "striped",
  headerBg: "#1e40af",
  headerColor: "#ffffff",
};

export const EXCEL_THEMES: Array<{ id: string; name: string }> = [];

export function getExcelTheme(_id: string): ExcelStyleSettings {
  return DEFAULT_EXCEL_STYLE;
}
