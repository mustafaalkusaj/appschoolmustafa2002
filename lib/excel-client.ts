"use client";

import type { SheetDef } from "./excel-builder";
import type { ExcelThemeId, ExcelFontFamily, ExcelRowDensity, ExcelBorderStyle, ExcelRowStyle } from "./excel-themes";

export type { SheetDef, ColumnDef, WorkbookDef } from "./excel-builder";

/**
 * Sends sheet data to /api/web/export/excel and triggers a file download.
 * Uses the session token from supabase for auth.
 */
export async function downloadExcelExport(opts: {
  sheets: SheetDef[];
  filename: string;
  themeId?: ExcelThemeId;
  fontFamily?: ExcelFontFamily;
  rowDensity?: ExcelRowDensity;
  borderStyle?: ExcelBorderStyle;
  rowStyle?: ExcelRowStyle;
}): Promise<void> {
  const { buildAuthorizedHeaders } = await import("@/lib/authorized-api");
  const headers = await buildAuthorizedHeaders({ "Content-Type": "application/json" });

  const res = await fetch("/api/web/export/excel", {
    method: "POST",
    headers,
    credentials: "include",
    cache: "no-store",
    body: JSON.stringify({
      sheets: opts.sheets,
      filename: opts.filename,
      themeId: opts.themeId,
      fontFamily: opts.fontFamily,
      rowDensity: opts.rowDensity,
      borderStyle: opts.borderStyle,
      rowStyle: opts.rowStyle,
    }),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(json?.error?.message ?? "تعذر إنشاء ملف التصدير.");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = opts.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
