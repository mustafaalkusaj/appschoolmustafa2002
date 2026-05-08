import type { Fill, Borders, Worksheet } from "exceljs";

export const NUM_FMT_IQD = '#,##0 "د.ع"';

export function solidFill(argb: string): Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

export function thinBorder(color = "FFE2E8F0"): Partial<Borders> {
  return {
    bottom: { style: "thin", color: { argb: color } },
    right:  { style: "thin", color: { argb: color } },
    left:   { style: "thin", color: { argb: color } },
  };
}

export function colLetter(zeroIdx: number): string {
  if (zeroIdx < 26) return String.fromCharCode(65 + zeroIdx);
  return String.fromCharCode(64 + Math.floor(zeroIdx / 26)) + String.fromCharCode(65 + (zeroIdx % 26));
}

export async function loadExcelJS() {
  const mod = await import("exceljs");
  return (mod.default ?? mod) as typeof import("exceljs");
}

export interface TitleBlockOptions {
  schoolName: string;
  reportTitle: string;
  meta?: string;
  lastCol: string;
  numCols: number;
}

/** Adds the 3-row header block (school → title → meta/date). Returns next row number (4). */
export function addTitleBlock(ws: Worksheet, opts: TitleBlockOptions): void {
  const { schoolName, reportTitle, meta, lastCol, numCols } = opts;

  // Row 1 — school name
  ws.mergeCells(`A1:${lastCol}1`);
  const r1 = ws.getCell("A1");
  r1.value     = schoolName;
  r1.font      = { name: "Arial", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  r1.fill      = solidFill("FF1B3A6B");
  r1.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
  ws.getRow(1).height = 38;

  // Row 2 — report title
  ws.mergeCells(`A2:${lastCol}2`);
  const r2 = ws.getCell("A2");
  r2.value     = reportTitle;
  r2.font      = { name: "Arial", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  r2.fill      = solidFill("FF2D5FA0");
  r2.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
  ws.getRow(2).height = 28;

  // Row 3 — meta / date
  ws.mergeCells(`A3:${lastCol}3`);
  const r3 = ws.getCell("A3");
  r3.value     = meta ?? `تاريخ التصدير: ${new Date().toLocaleDateString("ar-IQ")}`;
  r3.font      = { name: "Arial", size: 10, color: { argb: "FFFFFFFF" } };
  r3.fill      = solidFill("FF3B6FC1");
  r3.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
  ws.getRow(3).height = 20;

  void numCols; // used by caller for autoFilter
}

export interface ColumnDef {
  label: string;
  width: number;
  key?: string;
  numFmt?: string;
}

/** Adds column-header row at rowNum (1-based). Sets autoFilter. Returns the row. */
export function addColumnHeaders(ws: Worksheet, cols: ColumnDef[], rowNum: number, lastCol: string): void {
  ws.columns = cols.map((c) => ({ key: c.key ?? c.label, width: c.width }));

  const hRow = ws.getRow(rowNum);
  hRow.height = 28;
  cols.forEach((c, i) => {
    const cell   = hRow.getCell(i + 1);
    cell.value   = c.label;
    cell.font    = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill    = solidFill("FF2563EB");
    cell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
    cell.border  = { bottom: { style: "medium", color: { argb: "FF1D4ED8" } }, ...thinBorder("FF1D4ED8") };
  });
  ws.autoFilter = { from: `A${rowNum}`, to: `${lastCol}${rowNum}` };
}

export interface CellData {
  value: unknown;
  numFmt?: string;
  color?: string;   // ARGB override for text
  bgArgb?: string;  // ARGB override for fill
  bold?: boolean;
}

/** Writes a single data row starting at rowNum. */
export function addDataRow(
  ws: Worksheet,
  rowNum: number,
  cells: CellData[],
  isEven: boolean,
): void {
  const row  = ws.getRow(rowNum);
  row.height = 22;
  const defaultBg = isEven ? "FFFFFFFF" : "FFF1F5F9";

  cells.forEach((c, i) => {
    const cell   = row.getCell(i + 1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cell.value   = c.value as any;
    if (c.numFmt) cell.numFmt = c.numFmt;
    cell.fill    = solidFill(c.bgArgb ?? defaultBg);
    cell.font    = { name: "Arial", size: 10, bold: c.bold ?? false, color: { argb: c.color ?? "FF1F2937" } };
    cell.alignment = { horizontal: i === 0 ? "right" : "center", vertical: "middle", readingOrder: "rtl" };
    cell.border  = thinBorder();
  });
}

/** Adds a totals row at rowNum. `labelCols` = number of merged label columns. */
export function addTotalsRow(
  ws: Worksheet,
  rowNum: number,
  label: string,
  labelCols: number,
  totals: number[],
  numFmt: string,
  lastCol: string,
): void {
  if (labelCols > 1) {
    const endCol = colLetter(labelCols - 1);
    ws.mergeCells(`A${rowNum}:${endCol}${rowNum}`);
  }
  const lCell   = ws.getCell(`A${rowNum}`);
  lCell.value   = label;
  lCell.font    = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  lCell.fill    = solidFill("FF1B3A6B");
  lCell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };

  totals.forEach((total, i) => {
    const cell   = ws.getCell(rowNum, labelCols + 1 + i);
    cell.value   = total;
    cell.numFmt  = numFmt;
    cell.font    = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill    = solidFill("FF1B3A6B");
    cell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
    cell.border  = { top: { style: "medium", color: { argb: "FF93C5FD" } } };
  });
  ws.getRow(rowNum).height = 28;
  void lastCol;
}
