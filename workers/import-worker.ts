// This is a Web Worker for processing large import files
// It runs in a separate thread to keep the UI responsive

import { StudentImportRow, ValidationError, Class, RowLevelDebugInfo } from "../lib/students/import-types";

// Since we cannot easily import modules here without complex setup,
// we'll define essential logic or use importScripts if needed.
// For now, we'll assume the main thread will send the parsed JSON data to the worker
// to perform heavy validation and mapping.

self.onmessage = function(e: MessageEvent) {
  const { action, data } = e.data;

  if (action === 'PROCESS_DATA') {
    const { rows, availableClasses, columnMapping } = data as {
      rows: Record<string, unknown>[];
      availableClasses: Class[];
      columnMapping: Record<string, string[]>;
    };
    const totalRows = rows.length;
    const errors: ValidationError[] = [];
    const validRows: StudentImportRow[] = [];

    let processedRows = 0;
    const seenNames = new Map<string, number>();

    // Log available classes
    console.log(`[Worker] Available classes (${availableClasses.length}):`,
      availableClasses.map(c => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn, gradeLevel: c.gradeLevel })));

    const debugInfo: RowLevelDebugInfo[] = [];

    for (let i = 0; i < totalRows; i++) {
      const row = rows[i];
      const mappedRow = mapColumns(row, columnMapping);
      const rowErrors = validateRow(mappedRow, i + 1, availableClasses, seenNames);

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);

        // Capture debug info for failed rows (collect up to 100 for reporting)
        if (debugInfo.length < 100) {
          const failureReason = rowErrors
            .map(e => `${e.field}: ${e.error}`)
            .join('; ');
          debugInfo.push({
            rowNumber: i + 1,
            fullName: mappedRow.fullName || null,
            rawClassName: row[Object.keys(row).find(k => k.toLowerCase().includes('class')) || 'className'] as string || null,
            normalizedClassName: mappedRow.className || null,
            matchedClassId: mappedRow.classId || null,
            failureReason,
          });
        }

        if (i < 5) {
          console.log(`[Worker] Row ${i + 1} failed:`, {
            fullName: mappedRow.fullName,
            className: mappedRow.className,
            classId: mappedRow.classId,
            errors: rowErrors
          });
        }
      } else {
        validRows.push(mappedRow);
        if (i < 5) {
          console.log(`[Worker] Row ${i + 1} valid:`, {
            fullName: mappedRow.fullName,
            className: mappedRow.className,
            classId: mappedRow.classId
          });
        }
      }

      processedRows++;

      // Send progress every 100 rows
      if (processedRows % 100 === 0 || processedRows === totalRows) {
        self.postMessage({
          action: 'PROGRESS',
          data: {
            processedRows,
            totalRows,
            errorCount: errors.length,
            successCount: validRows.length
          }
        });
      }
    }

    self.postMessage({
      action: 'COMPLETED',
      data: {
        validRows,
        errors,
        totalRows,
        debugInfo: debugInfo.slice(0, 10)
      }
    });
  }
};

function mapColumns(row: Record<string, unknown>, columnMapping: Record<string, string[]>): StudentImportRow {
  const mapped: Partial<StudentImportRow> = {};
  const rowKeys = Object.keys(row);

  for (const [targetKey, aliases] of Object.entries(columnMapping)) {
    const sourceKey = rowKeys.find((k) =>
      aliases.some((alias) => k.trim().toLowerCase() === alias.toLowerCase())
    );
    if (sourceKey) {
      mapped[targetKey as keyof StudentImportRow] = row[sourceKey] as string | number | boolean | null | undefined;
    }
  }

  return mapped as StudentImportRow;
}

function normalizeStudentName(value: string | number | boolean | null | undefined) {
  return String(value || "")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("ar");
}

function validateRow(
  row: StudentImportRow,
  rowIndex: number,
  availableClasses: Class[],
  seenNames: Map<string, number>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Mandatory Fields
  if (!row.fullName || String(row.fullName).trim().length < 3) {
    errors.push({
      row: rowIndex,
      field: 'fullName',
      error: 'الاسم الكامل مطلوب ويجب أن يكون 3 أحرف على الأقل',
      value: row.fullName,
      severity: 'error',
    });
  }

  const normalizedStudentName = normalizeStudentName(row.fullName);
  if (normalizedStudentName) {
    const existingRow = seenNames.get(normalizedStudentName);
    if (existingRow) {
      errors.push({
        row: rowIndex,
        field: 'fullName',
        error: `اسم الطالب مكرر داخل الملف. أول ظهور كان في الصف ${existingRow}.`,
        value: row.fullName,
        severity: 'error',
      });
    } else {
      seenNames.set(normalizedStudentName, rowIndex);
    }
  }

  if (!row.className || String(row.className).trim() === '') {
    errors.push({
      row: rowIndex,
      field: 'className',
      error: 'الصف مطلوب',
      value: row.className,
      severity: 'error',
    });
  } else {
    const classExists = availableClasses.find(
      (c) => {
        const classNameInput = String(row.className).trim().toLowerCase();
        // Match against either Arabic or English name
        return c.nameAr.trim().toLowerCase() === classNameInput ||
               c.nameEn.trim().toLowerCase() === classNameInput ||
               c.name?.trim().toLowerCase() === classNameInput; // Fallback for backward compat
      }
    );
    if (!classExists) {
      errors.push({
        row: rowIndex,
        field: 'className',
        error: 'الصف غير موجود في النظام',
        value: row.className,
        severity: 'error',
      });
    } else {
      row.classId = classExists.id; // Store UUID for backend
    }
  }

  // Log classId assignment for debugging
  if (rowIndex < 4 && row.classId) {
    console.log(`[Worker] Row ${rowIndex}: Matched class ${row.className} to classId ${row.classId}`);
  }


  // Iraqi phone validation helper
  const isValidIraqiPhone = (phone: string | number | null | undefined) => {
    const cleaned = String(phone || "").trim().replace(/\s+/g, '');
    return /^07[3-9]\d{8}$/.test(cleaned);
  };

  // Optional Fields
  if (row.phoneNumber && String(row.phoneNumber).trim() !== '') {
    if (!isValidIraqiPhone(row.phoneNumber)) {
      errors.push({
        row: rowIndex,
        field: 'phoneNumber',
        error: 'رقم الهاتف غير صحيح',
        value: row.phoneNumber,
        severity: 'warning',
      });
    }
  }

  return errors;
}
