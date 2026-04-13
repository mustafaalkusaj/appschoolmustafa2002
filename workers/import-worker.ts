// This is a Web Worker for processing large import files
// It runs in a separate thread to keep the UI responsive

import { StudentImportRow, ValidationError, Class } from "../lib/students/import-types";

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

    for (let i = 0; i < totalRows; i++) {
      const row = rows[i];
      const mappedRow = mapColumns(row, columnMapping);
      const rowErrors = validateRow(mappedRow, i + 1, availableClasses);

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else {
        validRows.push(mappedRow);
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
        totalRows
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

function validateRow(row: StudentImportRow, rowIndex: number, availableClasses: Class[]): ValidationError[] {
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
      (c) => c.name.trim().toLowerCase() === String(row.className).trim().toLowerCase()
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
      row.classId = classExists.id;
    }
  }

  if (!row.sectionName || String(row.sectionName).trim() === '') {
    errors.push({
      row: rowIndex,
      field: 'sectionName',
      error: 'الشعبة مطلوبة',
      value: row.sectionName,
      severity: 'error',
    });
  } else if (row.classId) {
    const classData = availableClasses.find((c) => c.id === row.classId);
    if (classData) {
      const sectionExists = classData.sections.find(
        (s) => s.name.trim().toLowerCase() === String(row.sectionName).trim().toLowerCase()
      );
      if (!sectionExists) {
        errors.push({
          row: rowIndex,
          field: 'sectionName',
          error: 'الشعبة غير موجودة للصف المحدد',
          value: row.sectionName,
          severity: 'error',
        });
      } else {
        row.sectionId = sectionExists.id;
      }
    }
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
