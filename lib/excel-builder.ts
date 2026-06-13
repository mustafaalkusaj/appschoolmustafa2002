/**
 * Shared styled Excel builder using ExcelJS.
 * Used by both server-side API routes and the generic /api/web/export/excel route.
 */

import ExcelJS from "exceljs";
import { getExcelTheme } from "./excel-themes";

// Semantic / status colors that are NOT theme-dependent
const SEMANTIC = {
  paidColor:   "FF16A34A",
  discColor:   "FFD97706",
  remZeroBg:   "FFDCFCE7",
  remZeroFg:   "FF16A34A",
  remPosBg:    "FFFEE2E2",
  remPosFg:    "FFDC2626",
  greenFg:     "FF16A34A",
  orangeFg:    "FFD97706",
  redFg:       "FFDC2626",
};

function makeBorder(weight: ExcelJS.BorderStyle): Partial<ExcelJS.Borders> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = { argb: "FFD1D5DB" } as any;
  return { top: { style: weight, color: c }, bottom: { style: weight, color: c }, left: { style: weight, color: c }, right: { style: weight, color: c } };
}

export type ColumnDef = {
  header: string;
  key: string;
  width: number;
  /** Excel number format string, e.g. "#,##0" */
  numFmt?: string;
  /** Fixed text colour for all cells in this column */
  fixedColor?: "green" | "orange" | "red";
  /**
   * "remaining" — green bg when value ≤ 0, red bg when > 0
   * "paid"      — green text
   * "discount"  — orange text
   */
  semanticColor?: "remaining" | "paid" | "discount";
};

export type SheetDef = {
  name: string;
  /** Main title shown in first merged row */
  title: string;
  /** Optional second row (e.g. school name). Omit to skip. */
  subtitle?: string;
  columns: ColumnDef[];
  rows: Record<string, unknown>[];
  /** If provided, rendered as a totals row at the bottom */
  totals?: Record<string, unknown>;
  /** Label text for the totals row first cell, default "المجموع" */
  totalsLabel?: string;
  /** Override workbook-level theme for this specific sheet */
  themeId?: string;
};

export type WorkbookDef = {
  sheets: SheetDef[];
  /** Excel theme ID from EXCEL_THEMES. Defaults to "navy". */
  themeId?: string;
  /** Font family: "Arial" | "Calibri" | "Tahoma". Default "Arial". */
  fontFamily?: string;
  /** Row density: "compact" | "normal" | "spacious". Default "normal". */
  rowDensity?: string;
  /** Border style: "thin" | "medium" | "none". Default "thin". */
  borderStyle?: string;
  /** Row style: "striped" | "solid". Default "striped". */
  rowStyle?: string;
};

export async function buildStyledWorkbook(def: WorkbookDef): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "School Iraq";
  wb.created = new Date();

  const fontName = def.fontFamily ?? "Arial";
  const densityHeights = { compact: 18, normal: 22, spacious: 28 };
  const dataRowHeight = densityHeights[(def.rowDensity as keyof typeof densityHeights) ?? "normal"] ?? 22;
  const useBorder = def.borderStyle !== "none";
  const borderWeight: ExcelJS.BorderStyle = def.borderStyle === "medium" ? "medium" : "thin";
  const isStriped = def.rowStyle !== "solid";

  for (const sheet of def.sheets) {
    // Sheet-level themeId overrides workbook-level themeId
    const resolvedThemeId = sheet.themeId ?? def.themeId;
    await addStyledSheet(wb, sheet, resolvedThemeId, { fontName, dataRowHeight, useBorder, borderWeight, isStriped });
  }

  return wb.xlsx.writeBuffer();
}

type StyleOptions = {
  fontName: string;
  dataRowHeight: number;
  useBorder: boolean;
  borderWeight: ExcelJS.BorderStyle;
  isStriped: boolean;
};

async function addStyledSheet(
  wb: ExcelJS.Workbook,
  sheet: SheetDef,
  themeId?: string,
  styleOpts?: StyleOptions,
): Promise<void> {
  const theme = getExcelTheme(themeId);
  const T = theme.argb;

  const fontName = styleOpts?.fontName ?? "Arial";
  const dataRowHeight = styleOpts?.dataRowHeight ?? 22;
  const useBorder = styleOpts?.useBorder ?? true;
  const borderWeight: ExcelJS.BorderStyle = styleOpts?.borderWeight ?? "thin";
  const isStriped = styleOpts?.isStriped ?? true;

  const border = useBorder ? makeBorder(borderWeight) : {};

  const COLS = sheet.columns.length;
  const exportDate = new Date().toLocaleDateString("ar-IQ-u-nu-latn");

  const ws = wb.addWorksheet(sheet.name, {
    views: [{ rightToLeft: true, state: "frozen", ySplit: sheet.subtitle ? 4 : 3 }],
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
    },
    headerFooter: {
      oddFooter: `&C&8تم التصدير من نظام إدارة المدرسة — ${exportDate}`,
    },
  });

  ws.columns = sheet.columns.map((col) => ({ key: col.key, width: col.width }));

  // Row 1 — title
  ws.addRow(Array(COLS).fill(""));
  ws.mergeCells(1, 1, 1, COLS);
  const titleCell = ws.getRow(1).getCell(1);
  titleCell.value = sheet.title;
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: T.titleBg } };
  titleCell.font = { color: { argb: T.headerFg }, bold: true, size: 16, name: fontName };
  titleCell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
  ws.getRow(1).height = 36;

  let headerRowIndex = 2;

  // Row 2 — subtitle (optional)
  if (sheet.subtitle) {
    ws.addRow(Array(COLS).fill(""));
    ws.mergeCells(2, 1, 2, COLS);
    const subCell = ws.getRow(2).getCell(1);
    subCell.value = sheet.subtitle;
    subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: T.titleBg } };
    subCell.font = { color: { argb: T.headerFg }, size: 11, name: fontName };
    subCell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
    ws.getRow(2).height = 22;
    headerRowIndex = 3;
  }

  // Date row
  ws.addRow(Array(COLS).fill(""));
  ws.mergeCells(headerRowIndex, 1, headerRowIndex, COLS);
  const dateCell = ws.getRow(headerRowIndex).getCell(1);
  dateCell.value = `تاريخ التصدير: ${exportDate}`;
  dateCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: T.headerBg } };
  dateCell.font = { color: { argb: T.headerFg }, size: 11, name: fontName };
  dateCell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
  ws.getRow(headerRowIndex).height = 22;
  headerRowIndex += 1;

  // Column headers row
  const headerValues = sheet.columns.map((c) => c.header);
  const headerRow = ws.addRow(headerValues);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: T.colHeaderBg } };
    cell.font = { color: { argb: T.colHeaderFg }, bold: true, size: 11, name: fontName };
    cell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl", wrapText: true };
    if (useBorder) cell.border = border;
  });

  // AutoFilter
  ws.autoFilter = { from: { row: headerRowIndex, column: 1 }, to: { row: headerRowIndex, column: COLS } };

  // Data rows
  const totalsMap: Record<string, number> = {};

  sheet.rows.forEach((rowData, idx) => {
    const isEven = idx % 2 === 1;
    const rowBg = isStriped
      ? (isEven ? T.rowEven : T.rowOdd)
      : T.rowOdd;
    const values = sheet.columns.map((col) => rowData[col.key] ?? "");
    const row = ws.addRow(values);
    row.height = dataRowHeight;

    row.eachCell({ includeEmpty: true }, (cell, colNum) => {
      const col = sheet.columns[colNum - 1];
      const value = rowData[col.key];

      if (useBorder) cell.border = border;
      cell.alignment = { vertical: "middle", readingOrder: "rtl", horizontal: colNum === 1 ? "right" : "center" };

      if (col.numFmt) cell.numFmt = col.numFmt;

      // Accumulate totals for numeric columns
      if (typeof value === "number") {
        totalsMap[col.key] = (totalsMap[col.key] ?? 0) + value;
      }

      if (col.semanticColor === "remaining") {
        const numVal = typeof value === "number" ? value : 0;
        if (numVal <= 0) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SEMANTIC.remZeroBg } };
          cell.font = { name: fontName, size: 10, color: { argb: SEMANTIC.remZeroFg }, bold: true };
        } else {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SEMANTIC.remPosBg } };
          cell.font = { name: fontName, size: 10, color: { argb: SEMANTIC.remPosFg }, bold: true };
        }
      } else if (col.semanticColor === "paid") {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
        cell.font = { name: fontName, size: 10, color: { argb: SEMANTIC.paidColor }, bold: true };
      } else if (col.semanticColor === "discount") {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
        cell.font = { name: fontName, size: 10, color: { argb: SEMANTIC.discColor } };
      } else if (col.fixedColor === "green") {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
        cell.font = { name: fontName, size: 10, color: { argb: SEMANTIC.greenFg } };
      } else if (col.fixedColor === "orange") {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
        cell.font = { name: fontName, size: 10, color: { argb: SEMANTIC.orangeFg } };
      } else if (col.fixedColor === "red") {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
        cell.font = { name: fontName, size: 10, color: { argb: SEMANTIC.redFg } };
      } else {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
        cell.font = { name: fontName, size: 10 };
      }
    });
  });

  // Totals row
  if (sheet.totals !== undefined || sheet.rows.length > 0) {
    const totalsData = sheet.totals ?? totalsMap;
    const label = sheet.totalsLabel ?? `المجموع (${sheet.rows.length})`;
    const totalValues = sheet.columns.map((col, i) => (i === 0 ? label : (totalsData[col.key] ?? "")));
    const totalRow = ws.addRow(totalValues);
    totalRow.height = 26;
    totalRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
      const col = sheet.columns[colNum - 1];
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: T.totalBg } };
      cell.font = { color: { argb: T.headerFg }, bold: true, size: 11, name: fontName };
      cell.alignment = { horizontal: colNum === 1 ? "right" : "center", vertical: "middle", readingOrder: "rtl" };
      if (useBorder) cell.border = border;
      if (col.numFmt) cell.numFmt = col.numFmt;
    });
  }
}
