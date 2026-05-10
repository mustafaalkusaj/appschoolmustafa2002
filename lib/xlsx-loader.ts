type ExcelJSImport = typeof import("exceljs");
type ExcelWorkbook = import("exceljs").Workbook;
type ExcelWorksheet = import("exceljs").Worksheet;
type ExcelCellValue = import("exceljs").CellValue;

type SheetJsonRow = Record<string, unknown>;
type SheetInput =
  | {
      kind: "json";
      rows: SheetJsonRow[];
    }
  | {
      kind: "aoa";
      rows: unknown[][];
    };

type WorkbookHandle = {
  workbook: ExcelWorkbook;
  SheetNames: string[];
  Sheets: Record<string, ExcelWorksheet>;
};

type SheetToJsonOptions = {
  defval?: unknown;
  header?: 1 | number;
};

type ExcelLikeModule = {
  utils: {
    book_new: () => WorkbookHandle;
    json_to_sheet: (rows: SheetJsonRow[]) => SheetInput;
    aoa_to_sheet: (rows: unknown[][]) => SheetInput;
    book_append_sheet: (workbook: WorkbookHandle, sheet: SheetInput, name: string) => void;
    sheet_to_json: <T extends SheetJsonRow = SheetJsonRow>(
      worksheet: ExcelWorksheet,
      options?: SheetToJsonOptions,
    ) => T[];
  };
  read: (input: ArrayBuffer | string, options?: { type?: "array" | "binary" }) => Promise<WorkbookHandle>;
  writeFile: (workbook: WorkbookHandle, fileName: string) => Promise<void>;
};

let excelPromise: Promise<ExcelLikeModule> | null = null;

function createWorkbookHandle(workbook: ExcelWorkbook): WorkbookHandle {
  const sheetNames = workbook.worksheets.map((worksheet) => worksheet.name);
  const sheets = Object.fromEntries(workbook.worksheets.map((worksheet) => [worksheet.name, worksheet]));

  return {
    workbook,
    SheetNames: sheetNames,
    Sheets: sheets,
  };
}

function normalizeSheetRows(rows: unknown[][]) {
  return rows.map((row) =>
    row.map((value) => {
      if (value === undefined) return null;
      return value;
    }),
  );
}

function normalizeCellValue(value: ExcelCellValue): unknown {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map((item) => normalizeCellValue(item as ExcelCellValue)).join(", ");

  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((item) => item.text).join("");
    }

    if ("text" in value && typeof value.text === "string") {
      return value.text;
    }

    if ("result" in value) {
      return normalizeCellValue(value.result as ExcelCellValue);
    }

    if ("hyperlink" in value && typeof value.hyperlink === "string") {
      return typeof value.text === "string" && value.text.trim() ? value.text : value.hyperlink;
    }

    if ("formula" in value && typeof value.formula === "string") {
      return typeof value.result !== "undefined" ? normalizeCellValue(value.result as ExcelCellValue) : value.formula;
    }

    if ("error" in value && typeof value.error === "string") {
      return value.error;
    }
  }

  return String(value);
}

function buildWorksheetFromJson(workbook: ExcelWorkbook, rows: SheetJsonRow[], name: string) {
  const worksheet = workbook.addWorksheet(name);
  const headers: string[] = [];

  rows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (!headers.includes(key)) {
        headers.push(key);
      }
    });
  });

  if (headers.length === 0) {
    return worksheet;
  }

  worksheet.addRow(headers);
  rows.forEach((row) => {
    worksheet.addRow(headers.map((header) => (row[header] === undefined ? null : row[header])));
  });

  return worksheet;
}

function buildWorksheetFromAoa(workbook: ExcelWorkbook, rows: unknown[][], name: string) {
  const worksheet = workbook.addWorksheet(name);
  normalizeSheetRows(rows).forEach((row) => {
    worksheet.addRow(row);
  });
  return worksheet;
}

function sheetToJson<T extends SheetJsonRow = SheetJsonRow>(worksheet: ExcelWorksheet, options?: SheetToJsonOptions): T[] {
  // AOA mode: header=1 returns array of arrays instead of objects
  if (options?.header === 1) {
    const rows: unknown[][] = [];
    for (let rowIndex = 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
      const row = worksheet.getRow(rowIndex);
      const cells: unknown[] = [];
      let hasContent = false;
      for (let colIndex = 1; colIndex <= worksheet.columnCount; colIndex += 1) {
        const cellValue = normalizeCellValue(row.getCell(colIndex).value);
        const normalizedValue = cellValue === null || cellValue === undefined || cellValue === ""
          ? (options?.defval ?? "")
          : cellValue;
        if (normalizedValue !== "" && normalizedValue !== null) hasContent = true;
        cells.push(normalizedValue);
      }
      if (hasContent) rows.push(cells);
    }
    return rows as unknown as T[];
  }

  // Default mode: returns array of objects with header keys
  const headerRow = worksheet.getRow(1);
  const columnCount = worksheet.columnCount;
  const headers = Array.from({ length: columnCount }, (_, index) => {
    const rawValue = normalizeCellValue(headerRow.getCell(index + 1).value);
    return typeof rawValue === "string" ? rawValue.trim() : String(rawValue ?? "").trim();
  });

  const rows: T[] = [];

  for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    const record: SheetJsonRow = {};
    let hasContent = false;

    headers.forEach((header, headerIndex) => {
      if (!header) return;

      const cellValue = normalizeCellValue(row.getCell(headerIndex + 1).value);
      const normalizedValue =
        cellValue === null || typeof cellValue === "undefined" || cellValue === ""
          ? options?.defval
          : cellValue;

      if (normalizedValue !== undefined && normalizedValue !== null && normalizedValue !== "") {
        hasContent = true;
      }

      record[header] = normalizedValue;
    });

    if (hasContent) {
      rows.push(record as T);
    }
  }

  return rows;
}

function binaryStringToArrayBuffer(input: string) {
  const bytes = new Uint8Array(input.length);
  for (let index = 0; index < input.length; index += 1) {
    bytes[index] = input.charCodeAt(index) & 0xff;
  }
  return bytes.buffer;
}

async function loadWorkbookFromInput(
  ExcelJS: ExcelJSImport,
  input: ArrayBuffer | string,
  options?: { type?: "array" | "binary" },
) {
  const workbook = new ExcelJS.Workbook();
  const buffer =
    typeof input === "string" || options?.type === "binary"
      ? binaryStringToArrayBuffer(String(input))
      : input;

  await workbook.xlsx.load(buffer);
  return createWorkbookHandle(workbook);
}

async function triggerBrowserDownload(workbook: WorkbookHandle, fileName: string) {
  const buffer = await workbook.workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function loadXLSX() {
  if (!excelPromise) {
    excelPromise = import("exceljs").then((module) => {
      const ExcelJS = (module.default ?? module) as ExcelJSImport;

      return {
        utils: {
          book_new: () => createWorkbookHandle(new ExcelJS.Workbook()),
          json_to_sheet: (rows: SheetJsonRow[]) => ({
            kind: "json",
            rows,
          }),
          aoa_to_sheet: (rows: unknown[][]) => ({
            kind: "aoa",
            rows,
          }),
          book_append_sheet: (workbook: WorkbookHandle, sheet: SheetInput, name: string) => {
            if (sheet.kind === "json") {
              buildWorksheetFromJson(workbook.workbook, sheet.rows, name);
            } else {
              buildWorksheetFromAoa(workbook.workbook, sheet.rows, name);
            }

            const nextWorkbookHandle = createWorkbookHandle(workbook.workbook);
            workbook.SheetNames = nextWorkbookHandle.SheetNames;
            workbook.Sheets = nextWorkbookHandle.Sheets;
          },
          sheet_to_json: <T extends SheetJsonRow = SheetJsonRow>(
            worksheet: ExcelWorksheet,
            options?: SheetToJsonOptions,
          ) => sheetToJson<T>(worksheet, options),
        },
        read: (input: ArrayBuffer | string, options?: { type?: "array" | "binary" }) =>
          loadWorkbookFromInput(ExcelJS, input, options),
        writeFile: (workbook: WorkbookHandle, fileName: string) => triggerBrowserDownload(workbook, fileName),
      } satisfies ExcelLikeModule;
    });
  }

  return excelPromise;
}
